/**
 * PDF 转换器模块
 * 负责将 PDF 文件转换为 Markdown 格式
 */

class PdfConverter {
  constructor() {
    this.pdfjsLib = null;
    this.isInitialized = false;
    this.workerSrc = 'libs/pdf.worker.min.js';
  }

  /**
   * 初始化 PDF 转换器
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // 检查 PDF.js 是否已加载
      if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js 库未加载');
      }

      this.pdfjsLib = pdfjsLib;
      
      // 设置 Worker
      if (this.pdfjsLib.GlobalWorkerOptions) {
        this.pdfjsLib.GlobalWorkerOptions.workerSrc = this.workerSrc;
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('PDF 转换器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 将 PDF 文件转换为 Markdown
   * @param {File} file - PDF 文件
   * @param {Function} onProgress - 进度回调函数
   * @returns {Promise<Object>} 转换结果
   */
  async convertPdfToMarkdown(file, onProgress = null) {
    await this.init();

    try {
      // 读取文件为 ArrayBuffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      
      if (onProgress) onProgress(10);

      // 加载 PDF 文档
      const pdf = await this.pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true
      }).promise;

      if (onProgress) onProgress(20);

      const totalPages = pdf.numPages;
      const pages = [];
      const images = [];
      let markdownContent = '';

      // 处理每一页
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        
        // 提取文本内容
        const textContent = await this.extractTextFromPage(page);
        
        // 提取图片
        const pageImages = await this.extractImagesFromPage(page);
        images.push(...pageImages);

        // 转换为 Markdown
        const pageMarkdown = this.convertPageToMarkdown(textContent, pageImages, pageNum);
        
        pages.push({
          pageNumber: pageNum,
          text: textContent,
          images: pageImages,
          markdown: pageMarkdown
        });

        markdownContent += pageMarkdown + '\n\n';

        // 更新进度
        if (onProgress) {
          const progress = 20 + (pageNum / totalPages) * 70;
          onProgress(progress);
        }
      }

      // 清理和优化 Markdown
      markdownContent = this.cleanupMarkdown(markdownContent);

      if (onProgress) onProgress(100);

      return {
        markdown: markdownContent,
        pages: pages,
        images: images,
        totalPages: totalPages,
        metadata: await this.extractMetadata(pdf)
      };

    } catch (error) {
      console.error('PDF 转换失败:', error);
      throw new Error(`PDF 转换失败: ${error.message}`);
    }
  }

  /**
   * 从页面提取文本内容
   * @param {Object} page - PDF 页面对象
   * @returns {Promise<Object>} 文本内容
   */
  async extractTextFromPage(page) {
    try {
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      // 按位置组织文本项
      const textItems = textContent.items.map(item => ({
        text: item.str,
        x: item.transform[4],
        y: viewport.height - item.transform[5], // 转换坐标系
        width: item.width,
        height: item.height,
        fontSize: item.height,
        fontName: item.fontName
      }));

      // 按行分组文本
      const lines = this.groupTextIntoLines(textItems);
      
      // 检测标题和段落
      const structuredContent = this.detectStructure(lines);

      return {
        raw: textContent.items.map(item => item.str).join(' '),
        items: textItems,
        lines: lines,
        structured: structuredContent
      };

    } catch (error) {
      console.error('提取页面文本失败:', error);
      return {
        raw: '',
        items: [],
        lines: [],
        structured: []
      };
    }
  }

  /**
   * 将文本项按行分组
   * @param {Array} textItems - 文本项数组
   * @returns {Array} 行数组
   */
  groupTextIntoLines(textItems) {
    if (textItems.length === 0) return [];

    // 按 Y 坐标排序
    const sortedItems = textItems.sort((a, b) => a.y - b.y);
    
    const lines = [];
    let currentLine = [sortedItems[0]];
    let currentY = sortedItems[0].y;

    for (let i = 1; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      
      // 如果 Y 坐标差异小于字体大小的一半，认为在同一行
      if (Math.abs(item.y - currentY) < item.fontSize / 2) {
        currentLine.push(item);
      } else {
        // 新行开始
        if (currentLine.length > 0) {
          // 按 X 坐标排序当前行的文本
          currentLine.sort((a, b) => a.x - b.x);
          lines.push({
            y: currentY,
            items: currentLine,
            text: currentLine.map(item => item.text).join(' ').trim(),
            fontSize: Math.max(...currentLine.map(item => item.fontSize))
          });
        }
        currentLine = [item];
        currentY = item.y;
      }
    }

    // 添加最后一行
    if (currentLine.length > 0) {
      currentLine.sort((a, b) => a.x - b.x);
      lines.push({
        y: currentY,
        items: currentLine,
        text: currentLine.map(item => item.text).join(' ').trim(),
        fontSize: Math.max(...currentLine.map(item => item.fontSize))
      });
    }

    return lines;
  }

  /**
   * 检测文本结构（标题、段落等）
   * @param {Array} lines - 行数组
   * @returns {Array} 结构化内容
   */
  detectStructure(lines) {
    if (lines.length === 0) return [];

    const structured = [];
    const avgFontSize = lines.reduce((sum, line) => sum + line.fontSize, 0) / lines.length;

    for (const line of lines) {
      const text = line.text.trim();
      if (!text) continue;

      let type = 'paragraph';
      let level = 0;

      // 检测标题（基于字体大小）
      if (line.fontSize > avgFontSize * 1.2) {
        type = 'heading';
        if (line.fontSize > avgFontSize * 1.5) {
          level = 1; // 大标题
        } else {
          level = 2; // 小标题
        }
      }

      // 检测列表项
      if (/^[\s]*[•\-\*\d+\.]\s/.test(text)) {
        type = 'list';
      }

      // 检测表格（简单检测）
      if (text.includes('\t') || /\s{3,}/.test(text)) {
        type = 'table';
      }

      structured.push({
        type,
        level,
        text,
        fontSize: line.fontSize,
        y: line.y
      });
    }

    return structured;
  }

  /**
   * 从页面提取图片
   * @param {Object} page - PDF 页面对象
   * @returns {Promise<Array>} 图片数组
   */
  async extractImagesFromPage(page) {
    try {
      const operatorList = await page.getOperatorList();
      const images = [];

      // 查找图片操作
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        const fn = operatorList.fnArray[i];
        const args = operatorList.argsArray[i];

        // 检查是否是图片绘制操作
        if (fn === this.pdfjsLib.OPS.paintImageXObject || fn === this.pdfjsLib.OPS.paintInlineImageXObject) {
          try {
            // 这里可以进一步提取图片数据
            // 由于 PDF.js 的限制，实际图片提取比较复杂
            images.push({
              type: 'image',
              placeholder: `![图片 ${images.length + 1}]()`
            });
          } catch (error) {
            console.warn('提取图片失败:', error);
          }
        }
      }

      return images;

    } catch (error) {
      console.error('提取页面图片失败:', error);
      return [];
    }
  }

  /**
   * 将页面内容转换为 Markdown
   * @param {Object} textContent - 文本内容
   * @param {Array} images - 图片数组
   * @param {number} pageNum - 页码
   * @returns {string} Markdown 内容
   */
  convertPageToMarkdown(textContent, images, pageNum) {
    let markdown = '';

    // 添加页面标题
    if (pageNum > 1) {
      markdown += `\n---\n\n# 第 ${pageNum} 页\n\n`;
    }

    // 转换结构化内容
    for (const item of textContent.structured) {
      switch (item.type) {
        case 'heading':
          const headingLevel = '#'.repeat(item.level + 1);
          markdown += `${headingLevel} ${item.text}\n\n`;
          break;
          
        case 'list':
          // 清理列表标记
          const listText = item.text.replace(/^[\s]*[•\-\*\d+\.]\s*/, '');
          markdown += `- ${listText}\n`;
          break;
          
        case 'table':
          // 简单表格处理
          const cells = item.text.split(/\s{2,}|\t/);
          if (cells.length > 1) {
            markdown += `| ${cells.join(' | ')} |\n`;
            if (markdown.indexOf('|') === markdown.lastIndexOf('|') - cells.length * 3) {
              // 添加表格头分隔符
              markdown += `| ${cells.map(() => '---').join(' | ')} |\n`;
            }
          } else {
            markdown += `${item.text}\n\n`;
          }
          break;
          
        default:
          // 普通段落
          if (item.text.trim()) {
            markdown += `${item.text}\n\n`;
          }
          break;
      }
    }

    // 添加图片
    if (images.length > 0) {
      markdown += '\n## 页面图片\n\n';
      images.forEach((img, index) => {
        markdown += `${img.placeholder}\n\n`;
      });
    }

    return markdown;
  }

  /**
   * 清理和优化 Markdown 内容
   * @param {string} markdown - 原始 Markdown
   * @returns {string} 清理后的 Markdown
   */
  cleanupMarkdown(markdown) {
    return markdown
      // 移除多余的空行
      .replace(/\n{3,}/g, '\n\n')
      // 清理行首行尾空格
      .replace(/[ \t]+$/gm, '')
      // 修复标题格式
      .replace(/^(#{1,6})\s*(.+)$/gm, '$1 $2')
      // 修复列表格式
      .replace(/^[\s]*[-*+]\s*(.+)$/gm, '- $1')
      // 移除首尾空白
      .trim();
  }

  /**
   * 提取 PDF 元数据
   * @param {Object} pdf - PDF 文档对象
   * @returns {Promise<Object>} 元数据
   */
  async extractMetadata(pdf) {
    try {
      const metadata = await pdf.getMetadata();
      return {
        title: metadata.info?.Title || '',
        author: metadata.info?.Author || '',
        subject: metadata.info?.Subject || '',
        creator: metadata.info?.Creator || '',
        producer: metadata.info?.Producer || '',
        creationDate: metadata.info?.CreationDate || '',
        modificationDate: metadata.info?.ModDate || '',
        pages: pdf.numPages
      };
    } catch (error) {
      console.warn('提取 PDF 元数据失败:', error);
      return {
        pages: pdf.numPages
      };
    }
  }

  /**
   * 读取文件为 ArrayBuffer
   * @param {File} file - 文件对象
   * @returns {Promise<ArrayBuffer>} ArrayBuffer
   */
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 检查 PDF.js 是否可用
   * @returns {boolean} 是否可用
   */
  isAvailable() {
    return typeof pdfjsLib !== 'undefined';
  }

  /**
   * 获取支持的文件类型
   * @returns {Array} 支持的 MIME 类型
   */
  getSupportedTypes() {
    return ['application/pdf'];
  }

  /**
   * 验证文件是否为有效的 PDF
   * @param {File} file - 文件对象
   * @returns {Promise<boolean>} 是否有效
   */
  async validatePdfFile(file) {
    try {
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      
      // 检查 PDF 文件头
      const uint8Array = new Uint8Array(arrayBuffer.slice(0, 5));
      const header = String.fromCharCode.apply(null, uint8Array);
      
      return header === '%PDF-';
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取 PDF 基本信息
   * @param {File} file - PDF 文件
   * @returns {Promise<Object>} PDF 信息
   */
  async getPdfInfo(file) {
    try {
      await this.init();
      
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const pdf = await this.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const metadata = await this.extractMetadata(pdf);
      
      return {
        isValid: true,
        pages: pdf.numPages,
        metadata: metadata,
        size: file.size
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

// 导出模块
window.PdfConverter = PdfConverter;