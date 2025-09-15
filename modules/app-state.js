/**
 * 应用状态管理器
 * 负责管理应用的全局状态和模式切换
 */

class AppState {
  constructor() {
    this.currentMode = 'multi-converter'; // 'multi-converter' | 'markdown-editor'
    this.wordConverter = null;
    this.markdownEditor = null;
    this.fileProcessor = null;
    this.conversionManager = null;
    this.isInitialized = false;
    this.messageQueue = [];
    this.currentFiles = [];
    this.conversionResults = [];
  }

  /**
   * 初始化应用状态管理器
   */
  init() {
    if (this.isInitialized) return;
    
    this.bindEvents();
    this.initializeModules();
    this.setupUI();
    this.loadSavedState();
    this.isInitialized = true;
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 模式切换按钮
    const multiModeBtn = document.getElementById('multiModeBtn');
    const editorModeBtn = document.getElementById('editorModeBtn');

    if (multiModeBtn) {
      multiModeBtn.addEventListener('click', () => this.switchMode('multi-converter'));
    }

    if (editorModeBtn) {
      editorModeBtn.addEventListener('click', () => this.switchMode('markdown-editor'));
    }

    // 监听消息显示事件
    document.addEventListener('showMessage', (e) => {
      this.showMessage(e.detail.message, e.detail.type);
    });

    // 监听 Word 转换完成事件（保持兼容性）
    document.addEventListener('wordConvertComplete', (e) => {
      this.handleWordConvertComplete(e.detail);
    });

    // 监听文件处理器事件
    document.addEventListener('fileProcessor:filesAdded', (e) => {
      this.handleFilesAdded(e.detail);
    });

    document.addEventListener('fileProcessor:fileCompleted', (e) => {
      this.handleFileCompleted(e.detail);
    });

    document.addEventListener('fileProcessor:processingCompleted', (e) => {
      this.handleProcessingCompleted(e.detail);
    });

    document.addEventListener('fileProcessor:progressUpdate', (e) => {
      this.handleProgressUpdate(e.detail);
    });

    document.addEventListener('fileProcessor:viewResult', (e) => {
      this.handleViewResult(e.detail);
    });

    // 监听转换管理器事件
    document.addEventListener('conversionManager:conversionComplete', (e) => {
      this.handleConversionComplete(e.detail);
    });

    document.addEventListener('conversionManager:conversionError', (e) => {
      this.handleConversionError(e.detail);
    });

    // 监听导出事件
    document.addEventListener('exportSuccess', (e) => {
      this.showMessage(e.detail.message, 'success');
    });

    document.addEventListener('exportError', (e) => {
      this.showMessage(e.detail.message, 'error');
    });
  }

  /**
   * 初始化模块
   */
  async initializeModules() {
    // 初始化 Word 转换器（保持兼容性）
    if (typeof WordConverter !== 'undefined') {
      this.wordConverter = new WordConverter();
      this.wordConverter.init();
    }

    // 初始化 Markdown 编辑器
    if (typeof MarkdownEditor !== 'undefined') {
      this.markdownEditor = new MarkdownEditor();
      this.markdownEditor.init();
    }

    // 初始化文件处理器
    if (typeof FileProcessor !== 'undefined') {
      this.fileProcessor = new FileProcessor();
      this.fileProcessor.init();
    }

    // 初始化转换管理器
    if (typeof ConversionManager !== 'undefined') {
      this.conversionManager = new ConversionManager();
      await this.conversionManager.init();
    }
  }

  /**
   * 设置 UI
   */
  setupUI() {
    this.updateModeButtons();
    this.updateModeDisplay();
  }

  /**
   * 切换模式
   */
  switchMode(mode) {
    if (this.currentMode === mode) return;

    const oldMode = this.currentMode;
    this.currentMode = mode;

    // 保存当前状态
    this.saveCurrentState();

    // 更新 UI
    this.updateModeButtons();
    this.updateModeDisplay();

    // 触发模式切换事件
    this.dispatchModeChange(oldMode, mode);

    const modeNames = {
      'multi-converter': '多格式转换',
      'markdown-editor': 'Markdown 编辑'
    };
    
    this.showMessage(`已切换到${modeNames[mode] || mode}模式`);
  }

  /**
   * 更新模式按钮状态
   */
  updateModeButtons() {
    const multiModeBtn = document.getElementById('multiModeBtn');
    const editorModeBtn = document.getElementById('editorModeBtn');

    if (multiModeBtn && editorModeBtn) {
      multiModeBtn.classList.toggle('active', this.currentMode === 'multi-converter');
      editorModeBtn.classList.toggle('active', this.currentMode === 'markdown-editor');
    }
  }

  /**
   * 更新模式显示
   */
  updateModeDisplay() {
    const multiConverterPanel = document.getElementById('multiConverterPanel');
    const markdownEditorPanel = document.getElementById('markdownEditorPanel');

    if (multiConverterPanel) {
      multiConverterPanel.style.display = this.currentMode === 'multi-converter' ? 'block' : 'none';
    }

    if (markdownEditorPanel) {
      markdownEditorPanel.style.display = this.currentMode === 'markdown-editor' ? 'block' : 'none';
    }
  }

  /**
   * 处理 Word 转换完成
   */
  handleWordConvertComplete(data) {
    const { markdown, baseName } = data;
    
    // 显示转换完成的操作选项
    this.showConvertCompleteActions(markdown, baseName);
  }

  /**
   * 显示转换完成的操作选项
   */
  showConvertCompleteActions(markdown, baseName) {
    const actionsHtml = `
      <div class="convert-complete-actions">
        <p>转换完成！您可以：</p>
        <div class="action-buttons">
          <button class="btn primary" onclick="appState.editInMarkdownEditor('${markdown.replace(/'/g, "\\'")}')">
            📝 在编辑器中编辑
          </button>
          <button class="btn ghost" onclick="appState.downloadMarkdown('${baseName}.md', '${markdown.replace(/'/g, "\\'")}')">
            💾 下载 Markdown
          </button>
          <button class="btn ghost" onclick="appState.copyToClipboard('${markdown.replace(/'/g, "\\'")}')">
            📋 复制到剪贴板
          </button>
        </div>
      </div>
    `;

    // 显示在转换结果区域
    const resultArea = document.getElementById('conversionResult');
    if (resultArea) {
      resultArea.innerHTML = `
        <div class="markdown-output">${markdown}</div>
        ${actionsHtml}
      `;
    }
  }

  /**
   * 在 Markdown 编辑器中编辑
   */
  editInMarkdownEditor(markdown) {
    // 解码可能的转义字符
    const decodedMarkdown = markdown.replace(/\\'/g, "'").replace(/\\"/g, '"');
    
    if (this.markdownEditor) {
      this.markdownEditor.setContent(decodedMarkdown);
      this.switchMode('markdown-editor');
    }
  }

  /**
   * 下载 Markdown 文件
   */
  downloadMarkdown(filename, content) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showMessage('Markdown 文件下载成功！');
  }

  /**
   * 复制到剪贴板
   */
  async copyToClipboard(content) {
    try {
      await navigator.clipboard.writeText(content);
      this.showMessage('已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      this.showMessage('复制失败，请手动复制', 'error');
    }
  }

  /**
   * 显示消息提示
   */
  showMessage(message, type = 'success') {
    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = `message-toast ${type}`;
    messageEl.textContent = message;

    // 添加到页面
    document.body.appendChild(messageEl);

    // 显示动画
    setTimeout(() => {
      messageEl.classList.add('show');
    }, 100);

    // 自动隐藏
    setTimeout(() => {
      messageEl.classList.remove('show');
      setTimeout(() => {
        if (messageEl.parentNode) {
          document.body.removeChild(messageEl);
        }
      }, 300);
    }, 3000);
  }

  /**
   * 触发模式切换事件
   */
  dispatchModeChange(oldMode, newMode) {
    const event = new CustomEvent('modeChange', {
      detail: { oldMode, newMode }
    });
    document.dispatchEvent(event);
  }

  /**
   * 保存当前状态
   */
  saveCurrentState() {
    try {
      const state = {
        currentMode: this.currentMode,
        timestamp: Date.now()
      };
      localStorage.setItem('app-state', JSON.stringify(state));
    } catch (error) {
      console.warn('保存应用状态失败:', error);
    }
  }

  /**
   * 加载保存的状态
   */
  loadSavedState() {
    try {
      const savedState = localStorage.getItem('app-state');
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.currentMode && state.currentMode !== this.currentMode) {
          this.switchMode(state.currentMode);
        }
      }
    } catch (error) {
      console.warn('加载应用状态失败:', error);
    }
  }

  /**
   * 获取当前模式
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * 获取模块实例
   */
  getWordConverter() {
    return this.wordConverter;
  }

  getMarkdownEditor() {
    return this.markdownEditor;
  }

  /**
   * 重置应用状态
   */
  reset() {
    // 重置模块
    if (this.wordConverter) {
      this.wordConverter.reset();
    }

    if (this.markdownEditor) {
      this.markdownEditor.setContent('');
    }

    // 清除本地存储
    try {
      localStorage.removeItem('app-state');
      localStorage.removeItem('markdown-editor-content');
    } catch (error) {
      console.warn('清除本地存储失败:', error);
    }

    this.showMessage('应用已重置');
  }

  /**
   * 处理文件添加事件
   */
  handleFilesAdded(detail) {
    this.currentFiles = detail.addedFiles;
    this.showMessage(`已添加 ${detail.addedFiles.length} 个文件到处理队列`);
  }

  /**
   * 处理单文件完成事件
   */
  handleFileCompleted(detail) {
    const { fileItem, result } = detail;
    this.conversionResults.push(result);
    this.showMessage(`文件 ${fileItem.name} 转换完成`);
  }

  /**
   * 处理处理完成事件
   */
  handleProcessingCompleted(detail) {
    const { completed, failed, total } = detail;
    
    if (failed > 0) {
      this.showMessage(`批量处理完成：${completed} 个成功，${failed} 个失败`, 'warning');
    } else {
      this.showMessage(`批量处理完成：共 ${completed} 个文件转换成功`);
    }

    // 显示合并结果选项
    if (completed > 1) {
      this.showBatchResultActions();
    }
  }

  /**
   * 处理进度更新事件
   */
  handleProgressUpdate(detail) {
    const { overallProgress, completedFiles, totalFiles } = detail;
    
    // 更新进度显示
    const progressElement = document.getElementById('overallProgress');
    if (progressElement) {
      progressElement.textContent = `总进度: ${Math.round(overallProgress)}% (${completedFiles}/${totalFiles})`;
    }
  }

  /**
   * 处理查看结果事件
   */
  handleViewResult(detail) {
    const { fileItem } = detail;
    
    if (fileItem.result) {
      // 在编辑器中显示结果
      if (this.markdownEditor) {
        this.markdownEditor.setContent(fileItem.result.content);
        this.switchMode('markdown-editor');
      }
    }
  }

  /**
   * 处理转换完成事件
   */
  handleConversionComplete(detail) {
    const { result, task } = detail;
    this.showMessage(`转换完成: ${task.file.name}`);
  }

  /**
   * 处理转换错误事件
   */
  handleConversionError(detail) {
    const { fileName, error } = detail;
    this.showMessage(`转换失败: ${fileName} - ${error}`, 'error');
  }

  /**
   * 显示批量结果操作选项
   */
  showBatchResultActions() {
    const actionsHtml = `
      <div class="batch-result-actions">
        <h3>批量转换完成</h3>
        <p>您可以选择以下操作：</p>
        <div class="action-buttons">
          <button class="btn primary" onclick="appState.editMergedResults()">
            📝 编辑合并结果
          </button>
          <button class="btn ghost" onclick="appState.editIndividualResults()">
            📄 分别编辑结果
          </button>
          <button class="btn ghost" onclick="appState.downloadAllResults()">
            💾 下载所有结果
          </button>
          <button class="btn ghost" onclick="appState.exportBatchResults()">
            📤 批量导出
          </button>
        </div>
      </div>
    `;

    // 显示在结果区域
    const resultArea = document.getElementById('batchResultArea');
    if (resultArea) {
      resultArea.innerHTML = actionsHtml;
      resultArea.style.display = 'block';
    }
  }

  /**
   * 编辑合并结果
   */
  editMergedResults() {
    if (this.fileProcessor && this.markdownEditor) {
      const mergedResult = this.fileProcessor.getMergedResult();
      if (mergedResult) {
        this.markdownEditor.setContent(mergedResult.content);
        this.switchMode('markdown-editor');
      }
    }
  }

  /**
   * 分别编辑结果
   */
  editIndividualResults() {
    // 显示结果选择界面
    this.showResultSelector();
  }

  /**
   * 显示结果选择器
   */
  showResultSelector() {
    if (!this.fileProcessor) return;

    const results = this.fileProcessor.getAllResults();
    if (results.length === 0) return;

    const selectorHtml = `
      <div class="result-selector">
        <h3>选择要编辑的结果</h3>
        <div class="result-list">
          ${results.map((result, index) => `
            <div class="result-item" onclick="appState.editSpecificResult(${index})">
              <div class="result-info">
                <strong>${result.source}</strong>
                <span class="result-type">${result.converter}</span>
              </div>
              <div class="result-preview">
                ${result.content.substring(0, 100)}...
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const resultArea = document.getElementById('batchResultArea');
    if (resultArea) {
      resultArea.innerHTML = selectorHtml;
    }
  }

  /**
   * 编辑特定结果
   */
  editSpecificResult(index) {
    if (this.fileProcessor && this.markdownEditor) {
      const results = this.fileProcessor.getAllResults();
      if (results[index]) {
        this.markdownEditor.setContent(results[index].content);
        this.switchMode('markdown-editor');
      }
    }
  }

  /**
   * 下载所有结果
   */
  downloadAllResults() {
    if (!this.fileProcessor) return;

    const results = this.fileProcessor.getAllResults();
    results.forEach((result, index) => {
      const filename = `${result.source.replace(/\.[^/.]+$/, "")}_converted.md`;
      this.downloadMarkdown(filename, result.content);
    });

    this.showMessage(`已下载 ${results.length} 个转换结果`);
  }

  /**
   * 批量导出结果
   */
  exportBatchResults() {
    // 显示导出选项
    this.showExportOptions();
  }

  /**
   * 显示导出选项
   */
  showExportOptions() {
    const optionsHtml = `
      <div class="export-options">
        <h3>选择导出格式</h3>
        <div class="export-buttons">
          <button class="btn" onclick="appState.exportAs('html')">导出为 HTML</button>
          <button class="btn" onclick="appState.exportAs('pdf')">导出为 PDF</button>
          <button class="btn" onclick="appState.exportAs('zip')">打包下载</button>
        </div>
      </div>
    `;

    const resultArea = document.getElementById('batchResultArea');
    if (resultArea) {
      resultArea.innerHTML = optionsHtml;
    }
  }

  /**
   * 导出为指定格式
   */
  exportAs(format) {
    if (!this.fileProcessor) return;

    const mergedResult = this.fileProcessor.getMergedResult();
    if (!mergedResult) return;

    switch (format) {
      case 'html':
        this.exportAsHtml(mergedResult);
        break;
      case 'pdf':
        this.exportAsPdf(mergedResult);
        break;
      case 'zip':
        this.exportAsZip();
        break;
    }
  }

  /**
   * 导出为 HTML
   */
  exportAsHtml(result) {
    // 使用现有的导出功能
    if (window.ExportHandler) {
      const exporter = new ExportHandler();
      exporter.exportAsHtml(result.content, 'batch_conversion_result.html');
    }
  }

  /**
   * 导出为 PDF
   */
  exportAsPdf(result) {
    // 使用现有的导出功能
    if (window.ExportHandler) {
      const exporter = new ExportHandler();
      exporter.exportAsPdf(result.content, 'batch_conversion_result.pdf');
    }
  }

  /**
   * 导出为 ZIP
   */
  exportAsZip() {
    // 这里可以集成 JSZip 库来创建 ZIP 文件
    this.showMessage('ZIP 导出功能开发中...', 'info');
  }

  /**
   * 清空当前结果
   */
  clearResults() {
    this.currentFiles = [];
    this.conversionResults = [];
    
    if (this.fileProcessor) {
      this.fileProcessor.clearQueue();
    }

    // 清空结果显示区域
    const resultArea = document.getElementById('batchResultArea');
    if (resultArea) {
      resultArea.innerHTML = '';
      resultArea.style.display = 'none';
    }

    this.showMessage('已清空所有结果');
  }

  /**
   * 获取转换统计信息
   */
  getConversionStats() {
    return {
      totalFiles: this.currentFiles.length,
      completedFiles: this.conversionResults.length,
      currentMode: this.currentMode,
      hasResults: this.conversionResults.length > 0
    };
  }

  /**
   * 销毁应用状态管理器
   */
  async destroy() {
    if (this.wordConverter) {
      this.wordConverter.reset();
    }

    if (this.markdownEditor) {
      this.markdownEditor.destroy();
    }

    if (this.fileProcessor) {
      this.fileProcessor.destroy();
    }

    if (this.conversionManager) {
      await this.conversionManager.destroy();
    }

    this.isInitialized = false;
  }
}

// 创建全局实例
window.appState = new AppState();

// 导出模块
window.AppState = AppState;