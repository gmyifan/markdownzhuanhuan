/**
 * Word 转换器模块
 * 负责处理 DOC/DOCX 文件转换为 Markdown
 */

class WordConverter {
  constructor() {
    this.currentFile = null;
    this.currentBaseName = 'converted';
    this.isConverting = false;
    this.supportedFormats = ['doc', 'docx'];
  }

  /**
   * 初始化转换器
   */
  init() {
    this.bindEvents();
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    const fileInput = document.getElementById('fileInput');
    const convertBtn = document.getElementById('convertBtn');
    
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
    
    if (convertBtn) {
      convertBtn.addEventListener('click', () => this.handleConvert());
    }
  }

  /**
   * 处理文件选择
   */
  handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) {
      this.updateFileStatus('未选择文件');
      this.toggleConvertButton(false);
      return;
    }

    // 验证文件类型
    if (!this.validateFile(file)) {
      return;
    }

    this.currentFile = file;
    this.currentBaseName = this.getBaseName(file.name);
    this.updateFileStatus(`${file.name}（${(file.size / (1024 * 1024)).toFixed(2)} MB）`);
    this.toggleConvertButton(true);
    this.updateStatus('');
  }

  /**
   * 验证文件
   */
  validateFile(file) {
    // 检查文件类型
    const fileName = file.name.toLowerCase();
    const isValidFormat = this.supportedFormats.some(format => 
      fileName.endsWith(`.${format}`)
    );
    
    if (!isValidFormat) {
      this.updateStatus('错误：请选择 DOC 或 DOCX 格式的文件');
      this.toggleConvertButton(false);
      return false;
    }

    // 检查文件大小 (50MB 限制)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      this.updateStatus('错误：文件大小不能超过 50MB');
      this.toggleConvertButton(false);
      return false;
    }

    return true;
  }

  /**
   * 处理转换
   */
  async handleConvert() {
    if (!this.currentFile || this.isConverting) return;

    this.isConverting = true;
    this.toggleConvertButton(false);
    this.updateStatus('正在读取与转换，请稍候…（大文件会更久）');

    try {
      const markdown = await this.convertWordToMarkdown(this.currentFile);
      
      // 触发转换完成事件
      this.dispatchConvertComplete(markdown, this.currentBaseName);
      
      this.updateStatus('转换完成 ✔');
      
    } catch (error) {
      console.error('转换失败:', error);
      this.updateStatus(`转换失败：${error.message || String(error)}`);
    } finally {
      this.isConverting = false;
      this.toggleConvertButton(true);
    }
  }

  /**
   * 执行 DOC/DOCX -> HTML -> Markdown 转换
   */
  async convertWordToMarkdown(file) {
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const fileName = file.name.toLowerCase();

    // 检查文件格式并选择处理方式
    if (fileName.endsWith('.doc')) {
      // DOC 格式处理 - Mammoth.js 也支持 DOC 格式
      console.log('处理 DOC 格式文件');
    } else if (fileName.endsWith('.docx')) {
      // DOCX 格式处理
      console.log('处理 DOCX 格式文件');
    }

    // 1) DOC/DOCX -> HTML (Mammoth.js 支持两种格式)
    const mammothOptions = {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
      ],
      includeDefaultStyleMap: true,
      convertImage: window.mammoth.images.inline(async () => null),
    };

    const { value: html } = await window.mammoth.convertToHtml(
      { arrayBuffer },
      mammothOptions
    );

    // 2) HTML -> Markdown
    const TurndownCtor = this.getTurndownConstructor();
    if (!TurndownCtor) {
      throw new Error('未检测到 TurndownService，请检查库加载状态');
    }

    const turndownService = new TurndownCtor({
      headingStyle: 'atx',
      hr: '* * *',
      codeBlockStyle: 'fenced',
      emDelimiter: '_',
      bulletListMarker: '-',
      strongDelimiter: '**',
    });

    // 保留表格、换行等常见格式
    turndownService.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td']);
    turndownService.addRule('nbsp', {
      filter: function (node) {
        return node.nodeType === 3 && /\u00A0/.test(node.nodeValue);
      },
      replacement: function (content) {
        return content.replace(/\u00A0/g, ' ');
      },
    });

    const markdown = turndownService.turndown(html);
    return markdown;
  }

  /**
   * 获取 Turndown 构造函数
   */
  getTurndownConstructor() {
    return (
      window.TurndownService ||
      (window.Turndown && window.Turndown.TurndownService) ||
      (window.turndown && window.turndown.TurndownService)
    );
  }

  /**
   * 读取文件为 ArrayBuffer
   */
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onabort = () => reject(new Error('读取被取消'));
      reader.onload = () => resolve(reader.result);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 获取文件基础名（不含扩展名）
   */
  getBaseName(filename) {
    const idx = filename.lastIndexOf('.');
    return idx > 0 ? filename.slice(0, idx) : filename;
  }

  /**
   * 更新文件状态显示
   */
  updateFileStatus(text) {
    const fileNameEl = document.getElementById('fileName');
    if (fileNameEl) {
      fileNameEl.textContent = text;
    }
  }

  /**
   * 更新状态显示
   */
  updateStatus(text) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = text || '';
    }
  }

  /**
   * 切换转换按钮状态
   */
  toggleConvertButton(enabled) {
    const convertBtn = document.getElementById('convertBtn');
    if (convertBtn) {
      convertBtn.disabled = !enabled;
    }
  }

  /**
   * 触发转换完成事件
   */
  dispatchConvertComplete(markdown, baseName) {
    const event = new CustomEvent('wordConvertComplete', {
      detail: { markdown, baseName }
    });
    document.dispatchEvent(event);
  }

  /**
   * 重置转换器状态
   */
  reset() {
    this.currentFile = null;
    this.currentBaseName = 'converted';
    this.isConverting = false;
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.value = '';
    }
    
    this.updateFileStatus('未选择文件');
    this.updateStatus('');
    this.toggleConvertButton(false);
  }

  /**
   * DOCX转换方法别名 (兼容性)
   */
  async convertDocxToMarkdown(file) {
    return await this.convertWordToMarkdown(file);
  }

  /**
   * 静态转换方法 (兼容性)
   */
  static async convertDocxToMarkdown(file) {
    const instance = new WordConverter();
    return await instance.convertWordToMarkdown(file);
  }
}

// 导出模块并添加加载检查
if (typeof window !== 'undefined') {
  window.WordConverter = WordConverter;
  console.log('✅ WordConverter 已加载到 window 对象');
} else {
  console.error('❌ window 对象不可用，无法导出 WordConverter');
}

// 添加依赖检查
WordConverter.checkDependencies = function() {
  const dependencies = {
    mammoth: typeof window.mammoth !== 'undefined',
    turndown: typeof window.TurndownService !== 'undefined' || 
              typeof window.Turndown !== 'undefined' || 
              typeof window.turndown !== 'undefined'
  };
  
  console.log('📋 WordConverter 依赖检查:', dependencies);
  return dependencies;
};

// 立即检查依赖
if (typeof window !== 'undefined') {
  setTimeout(() => {
    WordConverter.checkDependencies();
  }, 100);
}