/**
 * Markdown 编辑器模块
 * 负责 Markdown 编辑和实时预览功能
 */

class MarkdownEditor {
  constructor() {
    this.content = '';
    this.isInitialized = false;
    this.autoSaveTimer = null;
    this.previewUpdateTimer = null;
    this.scrollSyncEnabled = true;
  }

  /**
   * 初始化编辑器
   */
  init() {
    if (this.isInitialized) return;
    
    this.setupMarked();
    this.bindEvents();
    this.loadSavedContent();
    this.startAutoSave();
    this.isInitialized = true;
  }

  /**
   * 配置 Marked.js
   */
  setupMarked() {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        highlight: function(code, lang) {
          if (lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
              console.warn('语法高亮失败:', err);
            }
          }
          return typeof hljs !== 'undefined' ? hljs.highlightAuto(code).value : code;
        },
        breaks: true,
        gfm: true,
        tables: true,
        sanitize: false
      });
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    const editor = document.getElementById('markdownEditor');
    const importBtn = document.getElementById('importMarkdown');
    const exportHtmlBtn = document.getElementById('exportHtml');
    const exportMdBtn = document.getElementById('exportMarkdown');
    const exportPdfBtn = document.getElementById('exportPdf');
    const clearBtn = document.getElementById('clearEditor');
    const templateBtn = document.getElementById('insertTemplate');
    const mobileToggleBtn = document.getElementById('mobilePreviewToggle');

    if (editor) {
      editor.addEventListener('input', (e) => this.handleEditorInput(e));
      editor.addEventListener('scroll', (e) => this.handleEditorScroll(e));
      editor.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    if (importBtn) {
      importBtn.addEventListener('click', () => this.handleImportMarkdown());
    }

    if (exportHtmlBtn) {
      exportHtmlBtn.addEventListener('click', () => this.handleExportHtml());
    }

    if (exportMdBtn) {
      exportMdBtn.addEventListener('click', () => this.handleExportMarkdown());
    }

    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', () => this.handleExportPDF());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.handleClear());
    }

    if (templateBtn) {
      templateBtn.addEventListener('click', () => this.handleInsertTemplate());
    }

    if (mobileToggleBtn) {
      mobileToggleBtn.addEventListener('click', () => this.handleMobilePreviewToggle());
    }

    // 监听 Word 转换完成事件
    document.addEventListener('wordConvertComplete', (e) => {
      this.setContent(e.detail.markdown);
    });
  }

  /**
   * 处理编辑器输入
   */
  handleEditorInput(event) {
    this.content = event.target.value;
    this.updatePreview();
    this.updateStats();
  }

  /**
   * 处理键盘快捷键
   */
  handleKeyDown(event) {
    // Ctrl+S 导出 HTML
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      this.handleExportHtml();
      return;
    }

    // Tab 键插入空格
    if (event.key === 'Tab') {
      event.preventDefault();
      const editor = event.target;
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      
      editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 4;
      
      this.content = editor.value;
      this.updatePreview();
    }

    // Ctrl+B 粗体
    if (event.ctrlKey && event.key === 'b') {
      event.preventDefault();
      this.insertFormatting('**', '**', '粗体文本');
    }

    // Ctrl+I 斜体
    if (event.ctrlKey && event.key === 'i') {
      event.preventDefault();
      this.insertFormatting('*', '*', '斜体文本');
    }
  }

  /**
   * 插入格式化文本
   */
  insertFormatting(prefix, suffix, placeholder) {
    const editor = document.getElementById('markdownEditor');
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    const insertText = selectedText || placeholder;
    const newText = prefix + insertText + suffix;

    editor.value = editor.value.substring(0, start) + newText + editor.value.substring(end);
    
    // 设置光标位置
    const newCursorPos = start + prefix.length + insertText.length;
    editor.selectionStart = editor.selectionEnd = newCursorPos;
    
    this.content = editor.value;
    this.updatePreview();
    editor.focus();
  }

  /**
   * 更新预览
   */
  updatePreview() {
    // 防抖处理
    if (this.previewUpdateTimer) {
      clearTimeout(this.previewUpdateTimer);
    }

    this.previewUpdateTimer = setTimeout(() => {
      const preview = document.getElementById('markdownPreview');
      if (preview && typeof marked !== 'undefined') {
        try {
          const html = marked.parse(this.content);
          preview.innerHTML = html;
        } catch (error) {
          console.error('预览渲染失败:', error);
          preview.innerHTML = '<p style="color: red;">预览渲染失败，请检查 Markdown 语法</p>';
        }
      }
    }, 300);
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    const charCount = this.content.length;
    const wordCount = this.content.trim() ? this.content.trim().split(/\s+/).length : 0;
    const lineCount = this.content.split('\n').length;

    const statsEl = document.getElementById('editorStats');
    if (statsEl) {
      const now = new Date();
      statsEl.textContent = `字符数: ${charCount} | 单词数: ${wordCount} | 行数: ${lineCount} | 最后更新: ${now.toLocaleTimeString()}`;
    }
  }

  /**
   * 处理编辑器滚动同步
   */
  handleEditorScroll(event) {
    if (!this.scrollSyncEnabled) return;

    const editor = event.target;
    const preview = document.getElementById('markdownPreview');
    if (!preview) return;

    const scrollPercentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
    preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
  }

  /**
   * 设置编辑器内容
   */
  setContent(content) {
    this.content = content;
    const editor = document.getElementById('markdownEditor');
    if (editor) {
      editor.value = content;
      this.updatePreview();
      this.updateStats();
    }
  }

  /**
   * 获取编辑器内容
   */
  getContent() {
    return this.content;
  }

  /**
   * 处理导入 Markdown
   */
  handleImportMarkdown() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.txt';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.setContent(e.target.result);
          this.showMessage('文件导入成功！');
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  }

  /**
   * 处理导出 HTML
   */
  async handleExportHtml() {
    if (!this.content.trim()) {
      this.showMessage('没有内容可导出', 'error');
      return;
    }

    try {
      // 使用导出处理器
      if (window.ExportHandler) {
        const exportHandler = new window.ExportHandler();
        exportHandler.init();
        
        const event = new CustomEvent('exportRequest', {
          detail: {
            type: 'html',
            content: this.content,
            filename: 'markdown-export.html',
            config: {
              title: 'Markdown 转换结果',
              theme: 'default',
              includeCSS: true
            }
          }
        });
        document.dispatchEvent(event);
      } else {
        // 备用方法
        const preview = document.getElementById('markdownPreview');
        const htmlContent = this.generateHtmlDocument(preview ? preview.innerHTML : '');
        this.downloadFile(htmlContent, 'markdown-export.html', 'text/html');
        this.showMessage('HTML 文件导出成功！');
      }
    } catch (error) {
      console.error('HTML 导出失败:', error);
      this.showMessage('HTML 导出失败', 'error');
    }
  }

  /**
   * 处理导出 Markdown
   */
  async handleExportMarkdown() {
    if (!this.content.trim()) {
      this.showMessage('没有内容可导出', 'error');
      return;
    }

    try {
      // 使用导出处理器
      if (window.ExportHandler) {
        const exportHandler = new window.ExportHandler();
        exportHandler.init();
        
        const event = new CustomEvent('exportRequest', {
          detail: {
            type: 'markdown',
            content: this.content,
            filename: 'markdown-export.md',
            config: {
              addMetadata: false
            }
          }
        });
        document.dispatchEvent(event);
      } else {
        // 备用方法
        this.downloadFile(this.content, 'markdown-export.md', 'text/markdown');
        this.showMessage('Markdown 文件导出成功！');
      }
    } catch (error) {
      console.error('Markdown 导出失败:', error);
      this.showMessage('Markdown 导出失败', 'error');
    }
  }

  /**
   * 处理导出 PDF
   */
  async handleExportPDF() {
    if (!this.content.trim()) {
      this.showMessage('没有内容可导出', 'error');
      return;
    }

    try {
      if (window.ExportHandler) {
        const exportHandler = new window.ExportHandler();
        exportHandler.init();
        
        const event = new CustomEvent('exportRequest', {
          detail: {
            type: 'pdf',
            content: this.content,
            filename: 'markdown-export.pdf',
            config: {
              format: 'a4',
              orientation: 'portrait'
            }
          }
        });
        document.dispatchEvent(event);
      } else {
        this.showMessage('PDF 导出功能需要额外的库支持', 'warning');
      }
    } catch (error) {
      console.error('PDF 导出失败:', error);
      this.showMessage('PDF 导出失败', 'error');
    }
  }

  /**
   * 生成完整的 HTML 文档
   */
  generateHtmlDocument(bodyContent) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown 转换结果</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.8.0/styles/github.min.css">
    <style>
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
            margin: 20px 0 10px 0; 
            color: #2c3e50;
        }
        h1 { 
            font-size: 2rem; 
            border-bottom: 2px solid #eee; 
            padding-bottom: 10px; 
        }
        h2 { 
            font-size: 1.5rem; 
            border-bottom: 1px solid #eee; 
            padding-bottom: 5px; 
        }
        p { margin: 10px 0; }
        code { 
            background: #f1f3f4; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
            font-size: 0.9em;
        }
        pre { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            overflow-x: auto; 
            border-left: 4px solid #007bff; 
            margin: 15px 0;
        }
        pre code { 
            background: none; 
            padding: 0; 
        }
        blockquote { 
            border-left: 4px solid #ddd; 
            margin: 15px 0; 
            padding: 10px 20px; 
            background: #f9f9f9; 
            font-style: italic; 
        }
        ul, ol { 
            margin: 10px 0; 
            padding-left: 30px; 
        }
        li { margin: 5px 0; }
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 15px 0; 
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
            margin: 10px 0;
        }
        a { 
            color: #007bff; 
            text-decoration: none; 
        }
        a:hover { 
            text-decoration: underline; 
        }
    </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
  }

  /**
   * 处理清空内容
   */
  handleClear() {
    if (this.content.trim() && !confirm('确定要清空所有内容吗？')) {
      return;
    }
    
    this.setContent('');
    this.showMessage('内容已清空！');
  }

  /**
   * 处理插入模板
   */
  handleInsertTemplate() {
    const template = `# 文档标题

## 简介
这里是文档的简介部分。

## 主要内容

### 子标题 1
这里是内容...

### 子标题 2
- 列表项 1
- 列表项 2
- 列表项 3

### 代码示例
\`\`\`javascript
function example() {
    console.log('Hello World!');
}
\`\`\`

### 表格示例
| 项目 | 描述 | 状态 |
|------|------|------|
| 项目1 | 描述1 | 完成 |
| 项目2 | 描述2 | 进行中 |

## 结论
这里是结论部分。
`;
    
    this.setContent(template);
    this.showMessage('模板已插入！');
  }

  /**
   * 处理移动端预览切换
   */
  handleMobilePreviewToggle() {
    const container = document.querySelector('.editor-container');
    const toggleBtn = document.getElementById('mobilePreviewToggle');
    
    if (container && toggleBtn) {
      const isPreviewMode = container.classList.contains('preview-mode');
      
      if (isPreviewMode) {
        container.classList.remove('preview-mode');
        toggleBtn.textContent = '👁️ 切换预览';
      } else {
        container.classList.add('preview-mode');
        toggleBtn.textContent = '✏️ 切换编辑';
        // 确保预览是最新的
        this.updatePreview();
      }
    }
  }

  /**
   * 下载文件
   */
  downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 显示消息提示
   */
  showMessage(message, type = 'success') {
    // 触发消息显示事件
    const event = new CustomEvent('showMessage', {
      detail: { message, type }
    });
    document.dispatchEvent(event);
  }

  /**
   * 加载保存的内容
   */
  loadSavedContent() {
    try {
      const savedContent = localStorage.getItem('markdown-editor-content');
      if (savedContent && !this.content) {
        this.setContent(savedContent);
      }
    } catch (error) {
      console.warn('加载保存内容失败:', error);
    }
  }

  /**
   * 保存内容到本地存储
   */
  saveContent() {
    try {
      localStorage.setItem('markdown-editor-content', this.content);
    } catch (error) {
      console.warn('保存内容失败:', error);
    }
  }

  /**
   * 开始自动保存
   */
  startAutoSave() {
    this.autoSaveTimer = setInterval(() => {
      if (this.content) {
        this.saveContent();
      }
    }, 5000); // 每5秒保存一次
  }

  /**
   * 停止自动保存
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * 销毁编辑器
   */
  destroy() {
    this.stopAutoSave();
    if (this.previewUpdateTimer) {
      clearTimeout(this.previewUpdateTimer);
    }
    this.isInitialized = false;
  }
}

// 导出模块
window.MarkdownEditor = MarkdownEditor;