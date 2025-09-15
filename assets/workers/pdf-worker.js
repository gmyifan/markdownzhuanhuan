/**
 * PDF Worker
 * 在后台线程中处理 PDF 解析任务
 */

// 导入 PDF.js
importScripts('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');
importScripts('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js');

class PDFWorker {
  constructor() {
    this.pdfjsLib = null;
    this.isInitialized = false;
  }

  /**
   * 初始化 PDF Worker
   */
  async init() {
    if (this.isInitialized) return;

    try {
      this.pdfjsLib = pdfjsLib;
      
      // 设置 Worker
      if (this.pdfjsLib.GlobalWorkerOptions) {
        this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      }

      this.isInitialized = true;
      
      this.postMessage({
        type: 'init-complete',
        success: true
      });
    } catch (error) {
      this.postMessage({
        type: 'init-error',
        error: error.message
      });
    }
  }

  /**
   * 解析 PDF 文件
   */
  async parsePdf(arrayBuffer, options = {}) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // 加载 PDF 文档
      const pdf = await this.pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true
      }).promise;

      this.postMessage({
        type: 'pdf-loaded',
        totalPages: pdf.numPages
      });

      const pages = [];
      const totalPages = pdf.numPages;

      // 处理每一页
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        
        // 提取文本内容
        const textContent = await this.extractTextFromPage(page);
        
        // 提取页面信息
        const pageInfo = {
          pageNumber: pageNum,
          text: textContent.raw,
          items: textContent.items,
          lines: textContent.lines,
          structured: textContent.structured
        };

        pages.push(pageInfo);

        // 发送进度更新
        this.postMessage({
          type: 'page-processed',
          pageNumber: pageNum,
          totalPages: totalPages,
          progress: (pageNum / totalPages) * 100,
          pageInfo: pageInfo
        });
      }

      // 提取元数据
      const metadata = await this.extractMetadata(pdf);

      this.postMessage({
        type: 'parsing-complete',
        result: {
          pages: pages,
          totalPages: totalPages,
          metadata: metadata
        }
      });

    } catch (error) {
      this.postMessage({
        type: 'parsing-error',
        error: error.message
      });
    }
  }

  /**
   * 从页面提取文本内容
   */
  async extractTextFromPage(page) {
    try {
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      // 按位置组织文本项
      const textItems = textContent.items.map(item => ({
        text: item.str,
        x: item.transform[4],
        y: viewport.height - item.transform[5],
        width: item.width,
        height: item.height,
        fontSize: item.height,
        fontName: item.fontName
      }));

      // 按行分组文本
      const lines = this.groupTextIntoLines(textItems);
      
      // 检测结构
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
   */
  groupTextIntoLines(textItems) {
    if (textItems.length === 0) return [];

    const sortedItems = textItems.sort((a, b) => a.y - b.y);
    const lines = [];
    let currentLine = [sortedItems[0]];
    let currentY = sortedItems[0].y;

    for (let i = 1; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      
      if (Math.abs(item.y - currentY) < item.fontSize / 2) {
        currentLine.push(item);
      } else {
        if (currentLine.length > 0) {
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
   * 检测文本结构
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

      // 检测标题
      if (line.fontSize > avgFontSize * 1.2) {
        type = 'heading';
        if (line.fontSize > avgFontSize * 1.5) {
          level = 1;
        } else {
          level = 2;
        }
      }

      // 检测列表项
      if (/^[\s]*[•\-\*\d+\.]\s/.test(text)) {
        type = 'list';
      }

      // 检测表格
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
   * 提取 PDF 元数据
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
   * 发送消息到主线程
   */
  postMessage(data) {
    self.postMessage(data);
  }

  /**
   * 销毁 Worker
   */
  destroy() {
    this.isInitialized = false;
  }
}

// 创建 PDF Worker 实例
const pdfWorker = new PDFWorker();

// 监听主线程消息
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'init':
      await pdfWorker.init();
      break;

    case 'parse-pdf':
      await pdfWorker.parsePdf(data.arrayBuffer, data.options);
      break;

    case 'destroy':
      pdfWorker.destroy();
      break;

    default:
      pdfWorker.postMessage({
        type: 'error',
        error: `Unknown message type: ${type}`
      });
  }
});

// 错误处理
self.addEventListener('error', (error) => {
  pdfWorker.postMessage({
    type: 'worker-error',
    error: error.message
  });
});

// 未捕获的 Promise 错误
self.addEventListener('unhandledrejection', (event) => {
  pdfWorker.postMessage({
    type: 'worker-error',
    error: event.reason.message || 'Unhandled promise rejection'
  });
});