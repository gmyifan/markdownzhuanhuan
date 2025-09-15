/**
 * 导出处理模块
 * 负责处理各种格式的文件导出
 */

class ExportHandler {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * 初始化导出处理器
   */
  init() {
    if (this.isInitialized) return;
    
    this.bindEvents();
    this.isInitialized = true;
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 监听导出事件
    document.addEventListener('exportRequest', (e) => {
      this.handleExportRequest(e.detail);
    });
  }

  /**
   * 处理导出请求
   */
  async handleExportRequest(options) {
    const { type, content, filename, config = {} } = options;

    try {
      switch (type) {
        case 'html':
          await this.exportHTML(content, filename, config);
          break;
        case 'markdown':
          await this.exportMarkdown(content, filename, config);
          break;
        case 'pdf':
          await this.exportPDF(content, filename, config);
          break;
        default:
          throw new Error(`不支持的导出类型: ${type}`);
      }
    } catch (error) {
      console.error('导出失败:', error);
      this.dispatchExportError(error.message);
    }
  }

  /**
   * 导出 HTML
   */
  async exportHTML(content, filename = 'export.html', config = {}) {
    const {
      title = 'Markdown 转换结果',
      theme = 'default',
      includeCSS = true,
      includeTOC = false
    } = config;

    let htmlContent = content;
    
    // 如果内容是 Markdown，先转换为 HTML
    if (typeof marked !== 'undefined' && this.isMarkdownContent(content)) {
      htmlContent = marked.parse(content);
    }

    const fullHTML = this.generateHTMLDocument({
      title,
      content: htmlContent,
      theme,
      includeCSS,
      includeTOC
    });

    this.downloadFile(fullHTML, filename, 'text/html');
    this.dispatchExportSuccess('HTML 文件导出成功！');
  }

  /**
   * 导出 Markdown
   */
  async exportMarkdown(content, filename = 'export.md', config = {}) {
    const {
      addMetadata = false,
      metadata = {}
    } = config;

    let markdownContent = content;

    // 添加元数据
    if (addMetadata) {
      const frontMatter = this.generateFrontMatter(metadata);
      markdownContent = frontMatter + '\n\n' + content;
    }

    this.downloadFile(markdownContent, filename, 'text/markdown');
    this.dispatchExportSuccess('Markdown 文件导出成功！');
  }

  /**
   * 导出 PDF
   */
  async exportPDF(content, filename = 'export.pdf', config = {}) {
    // 检查是否有 PDF 导出库
    if (typeof html2canvas === 'undefined' || typeof jsPDF === 'undefined') {
      // 使用浏览器打印功能作为备选方案
      await this.exportPDFViaPrint(content, config);
      return;
    }

    try {
      const {
        format = 'a4',
        orientation = 'portrait',
        margin = 20
      } = config;

      // 创建临时容器
      const container = this.createPDFContainer(content);
      document.body.appendChild(container);

      // 生成 canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      // 创建 PDF
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      pdf.save(filename);

      // 清理临时容器
      document.body.removeChild(container);

      this.dispatchExportSuccess('PDF 文件导出成功！');
    } catch (error) {
      console.error('PDF 导出失败:', error);
      // 回退到打印方案
      await this.exportPDFViaPrint(content, config);
    }
  }

  /**
   * 通过浏览器打印导出 PDF
   */
  async exportPDFViaPrint(content, config = {}) {
    const printWindow = window.open('', '_blank');
    const htmlContent = this.generateHTMLDocument({
      title: 'PDF 导出',
      content: typeof marked !== 'undefined' && this.isMarkdownContent(content) 
        ? marked.parse(content) 
        : content,
      theme: 'print',
      includeCSS: true
    });

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // 等待内容加载完成
    printWindow.onload = () => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    };

    this.dispatchExportSuccess('请在打印对话框中选择"保存为 PDF"');
  }

  /**
   * 创建 PDF 导出容器
   */
  createPDFContainer(content) {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 210mm;
      padding: 20mm;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
    `;

    // 如果是 Markdown 内容，先转换
    if (typeof marked !== 'undefined' && this.isMarkdownContent(content)) {
      container.innerHTML = marked.parse(content);
    } else {
      container.innerHTML = content;
    }

    return container;
  }

  /**
   * 生成完整的 HTML 文档
   */
  generateHTMLDocument(options) {
    const {
      title,
      content,
      theme = 'default',
      includeCSS = true,
      includeTOC = false
    } = options;

    const css = includeCSS ? this.getThemeCSS(theme) : '';
    const toc = includeTOC ? this.generateTOC(content) : '';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${includeCSS ? `<style>${css}</style>` : ''}
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.8.0/styles/github.min.css">
</head>
<body>
    ${toc}
    <div class="content">
        ${content}
    </div>
</body>
</html>`;
  }

  /**
   * 获取主题 CSS
   */
  getThemeCSS(theme) {
    const themes = {
      default: `
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        h1, h2, h3, h4, h5, h6 { 
            margin: 24px 0 12px 0; 
            color: #2c3e50;
            font-weight: 600;
        }
        h1 { 
            font-size: 2rem; 
            border-bottom: 2px solid #eee; 
            padding-bottom: 8px; 
        }
        h2 { 
            font-size: 1.5rem; 
            border-bottom: 1px solid #eee; 
            padding-bottom: 4px; 
        }
        p { margin: 12px 0; }
        code { 
            background: #f1f3f4; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
            font-size: 0.9em;
        }
        pre { 
            background: #f8f9fa; 
            padding: 16px; 
            border-radius: 8px; 
            overflow-x: auto; 
            border-left: 4px solid #007bff; 
            margin: 16px 0;
        }
        pre code { 
            background: none; 
            padding: 0; 
        }
        blockquote { 
            border-left: 4px solid #ddd; 
            margin: 16px 0; 
            padding: 8px 16px; 
            background: #f9f9f9; 
            font-style: italic; 
        }
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 16px 0; 
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 8px 12px; 
            text-align: left; 
        }
        th { 
            background: #f8f9fa; 
            font-weight: 600; 
        }
        img { 
            max-width: 100%; 
            height: auto; 
            border-radius: 8px; 
            margin: 12px 0;
        }
        a { 
            color: #007bff; 
            text-decoration: none; 
        }
        a:hover { 
            text-decoration: underline; 
        }
      `,
      print: `
        @media print {
            body { margin: 0; padding: 20mm; }
            h1 { page-break-before: always; }
            h1:first-child { page-break-before: avoid; }
            h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
            pre, blockquote { page-break-inside: avoid; }
            img { max-width: 100%; page-break-inside: avoid; }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        h1, h2, h3, h4, h5, h6 { 
            margin: 24px 0 12px 0; 
            color: #2c3e50;
            font-weight: 600;
        }
        h1 { font-size: 2rem; border-bottom: 2px solid #eee; padding-bottom: 8px; }
        h2 { font-size: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        p { margin: 12px 0; }
        code { 
            background: #f1f3f4; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
        }
        pre { 
            background: #f8f9fa; 
            padding: 16px; 
            border-radius: 8px; 
            border-left: 4px solid #007bff; 
            margin: 16px 0;
        }
        blockquote { 
            border-left: 4px solid #ddd; 
            margin: 16px 0; 
            padding: 8px 16px; 
            background: #f9f9f9; 
        }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f8f9fa; font-weight: 600; }
      `
    };

    return themes[theme] || themes.default;
  }

  /**
   * 生成目录
   */
  generateTOC(content) {
    // 简单的目录生成逻辑
    const headings = content.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi) || [];
    if (headings.length === 0) return '';

    let toc = '<div class="toc"><h2>目录</h2><ul>';
    headings.forEach((heading, index) => {
      const level = parseInt(heading.match(/h([1-6])/)[1]);
      const text = heading.replace(/<[^>]*>/g, '');
      const id = `heading-${index}`;
      toc += `<li class="toc-level-${level}"><a href="#${id}">${text}</a></li>`;
    });
    toc += '</ul></div>';

    return toc;
  }

  /**
   * 生成前置元数据
   */
  generateFrontMatter(metadata) {
    const {
      title = '',
      author = '',
      date = new Date().toISOString().split('T')[0],
      tags = [],
      description = ''
    } = metadata;

    return `---
title: ${title}
author: ${author}
date: ${date}
tags: [${tags.join(', ')}]
description: ${description}
---`;
  }

  /**
   * 判断是否为 Markdown 内容
   */
  isMarkdownContent(content) {
    // 简单的 Markdown 检测
    const markdownPatterns = [
      /^#{1,6}\s+/m,  // 标题
      /^\*\s+/m,      // 无序列表
      /^\d+\.\s+/m,   // 有序列表
      /```/,          // 代码块
      /\*\*.*\*\*/,   // 粗体
      /\*.*\*/,       // 斜体
      /\[.*\]\(.*\)/, // 链接
    ];

    return markdownPatterns.some(pattern => pattern.test(content));
  }

  /**
   * 下载文件
   */
  downloadFile(content, filename, contentType) {
    if (window.FileUtils) {
      window.FileUtils.download(content, filename, contentType);
    } else {
      const blob = new Blob([content], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * 触发导出成功事件
   */
  dispatchExportSuccess(message) {
    const event = new CustomEvent('exportSuccess', {
      detail: { message }
    });
    document.dispatchEvent(event);
  }

  /**
   * 触发导出错误事件
   */
  dispatchExportError(message) {
    const event = new CustomEvent('exportError', {
      detail: { message }
    });
    document.dispatchEvent(event);
  }

  /**
   * 导出配置对话框
   */
  showExportDialog(type, content, defaultFilename) {
    return new Promise((resolve, reject) => {
      // 创建简单的配置对话框
      const dialog = document.createElement('div');
      dialog.className = 'export-dialog-overlay';
      dialog.innerHTML = `
        <div class="export-dialog">
          <h3>导出设置</h3>
          <div class="form-group">
            <label>文件名:</label>
            <input type="text" id="exportFilename" value="${defaultFilename}">
          </div>
          ${type === 'html' ? `
            <div class="form-group">
              <label>主题:</label>
              <select id="exportTheme">
                <option value="default">默认</option>
                <option value="print">打印友好</option>
              </select>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="includeTOC"> 包含目录
              </label>
            </div>
          ` : ''}
          ${type === 'pdf' ? `
            <div class="form-group">
              <label>页面格式:</label>
              <select id="pdfFormat">
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
              </select>
            </div>
            <div class="form-group">
              <label>页面方向:</label>
              <select id="pdfOrientation">
                <option value="portrait">纵向</option>
                <option value="landscape">横向</option>
              </select>
            </div>
          ` : ''}
          <div class="dialog-buttons">
            <button id="exportConfirm" class="btn primary">导出</button>
            <button id="exportCancel" class="btn ghost">取消</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      // 绑定事件
      document.getElementById('exportConfirm').onclick = () => {
        const config = this.getExportConfig(type);
        const filename = document.getElementById('exportFilename').value;
        document.body.removeChild(dialog);
        resolve({ filename, config });
      };

      document.getElementById('exportCancel').onclick = () => {
        document.body.removeChild(dialog);
        reject(new Error('用户取消导出'));
      };
    });
  }

  /**
   * 获取导出配置
   */
  getExportConfig(type) {
    const config = {};

    if (type === 'html') {
      config.theme = document.getElementById('exportTheme')?.value || 'default';
      config.includeTOC = document.getElementById('includeTOC')?.checked || false;
    }

    if (type === 'pdf') {
      config.format = document.getElementById('pdfFormat')?.value || 'a4';
      config.orientation = document.getElementById('pdfOrientation')?.value || 'portrait';
    }

    return config;
  }
}

// 导出模块
window.ExportHandler = ExportHandler;