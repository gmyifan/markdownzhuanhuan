/**
 * 文件处理器模块
 * 负责文件队列管理、批量上传处理、进度跟踪
 */

class FileProcessor {
  constructor() {
    this.fileQueue = [];
    this.processingQueue = [];
    this.completedFiles = [];
    this.failedFiles = [];
    this.isProcessing = false;
    this.maxConcurrent = 3; // 最大并发处理数
    this.formatDetector = null;
    
    // 事件回调
    this.onProgress = null;
    this.onFileComplete = null;
    this.onAllComplete = null;
    this.onError = null;
  }

  /**
   * 初始化文件处理器
   */
  init() {
    try {
      console.log('🔧 [DEBUG] 开始初始化 FileProcessor...');
      
      if (window.FormatDetector) {
        this.formatDetector = new window.FormatDetector();
        console.log('✅ [DEBUG] FormatDetector 初始化成功');
      } else {
        console.warn('⚠️ [DEBUG] FormatDetector 类未找到，将使用基础检测');
        this.formatDetector = this.createBasicFormatDetector();
      }
      
      this.bindEvents();
      console.log('✅ [DEBUG] FileProcessor 初始化完成');
    } catch (error) {
      console.error('❌ [DEBUG] FileProcessor 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建基础格式检测器（备用）
   */
  createBasicFormatDetector() {
    return {
      detectMultipleFormats: (files) => {
        return Array.from(files).map((file, index) => {
          const extension = file.name.toLowerCase().split('.').pop();
          let converter = 'unknown';
          let isSupported = false;
          let description = '未知格式';

          // 基础格式检测
          if (['doc', 'docx'].includes(extension)) {
            converter = 'word';
            isSupported = true;
            description = 'Word 文档';
          } else if (extension === 'pdf') {
            converter = 'pdf';
            isSupported = true;
            description = 'PDF 文档';
          } else if (['png', 'jpg', 'jpeg'].includes(extension)) {
            converter = 'ocr';
            isSupported = true;
            description = '图片文件';
          }

          return {
            index,
            file,
            isSupported,
            detectedType: isSupported ? 'document' : 'unknown',
            converter,
            mimeType: file.type,
            description,
            error: isSupported ? null : `不支持的文件格式: ${extension}`,
            warnings: []
          };
        });
      },
      formatFileSize: (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      }
    };
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 监听拖拽事件
    this.setupDragAndDrop();
  }

  /**
   * 设置拖拽上传
   */
  setupDragAndDrop() {
    const dropZone = document.getElementById('fileDropZone');
    if (!dropZone) return;

    // 防止默认拖拽行为
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // 拖拽进入和悬停
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
      });
    });

    // 拖拽离开
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    // 文件放置
    dropZone.addEventListener('drop', (e) => {
      dropZone.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files);
      this.addFiles(files);
    });
  }

  /**
   * 添加文件到处理队列
   * @param {Array|FileList} files - 文件列表
   */
  addFiles(files) {
    const fileArray = Array.from(files);
    
    // 检测文件格式
    const detectionResults = this.formatDetector.detectMultipleFormats(fileArray);
    
    // 处理检测结果
    detectionResults.forEach(result => {
      const fileItem = {
        id: this.generateFileId(),
        file: result.file,
        name: result.file.name,
        size: result.file.size,
        type: result.detectedType,
        converter: result.converter,
        mimeType: result.mimeType,
        description: result.description,
        isSupported: result.isSupported,
        error: result.error,
        warnings: result.warnings || [],
        status: result.isSupported ? 'pending' : 'unsupported',
        progress: 0,
        result: null,
        startTime: null,
        endTime: null,
        processingTime: 0
      };

      this.fileQueue.push(fileItem);
    });

    // 更新UI显示
    this.updateQueueDisplay();
    
    // 触发文件添加事件
    this.dispatchEvent('filesAdded', {
      addedFiles: detectionResults,
      totalFiles: this.fileQueue.length
    });

    // 如果没有在处理中，自动开始处理
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  /**
   * 开始处理文件队列
   */
  async startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.dispatchEvent('processingStarted', {
      totalFiles: this.getPendingFiles().length
    });

    try {
      await this.processQueue();
    } catch (error) {
      console.error('处理队列时发生错误:', error);
      this.handleError(error);
    } finally {
      this.isProcessing = false;
      this.dispatchEvent('processingCompleted', {
        completed: this.completedFiles.length,
        failed: this.failedFiles.length,
        total: this.fileQueue.length
      });
    }
  }

  /**
   * 处理文件队列
   */
  async processQueue() {
    console.log('⚙️ [DEBUG] processQueue() 开始执行');
    const pendingFiles = this.getPendingFiles();
    console.log('📋 [DEBUG] 待处理文件数量:', pendingFiles.length);
    console.log('📊 [DEBUG] 队列统计:', this.getQueueStats());
    
    // 分批处理文件
    for (let i = 0; i < pendingFiles.length; i += this.maxConcurrent) {
      const batch = pendingFiles.slice(i, i + this.maxConcurrent);
      const promises = batch.map(fileItem => this.processFile(fileItem));
      
      try {
        await Promise.allSettled(promises);
      } catch (error) {
        console.error('批处理失败:', error);
      }
      
      // 更新进度
      this.updateOverallProgress();
    }
  }

  /**
   * 处理单个文件
   * @param {Object} fileItem - 文件项
   */
  async processFile(fileItem) {
    console.log(`🔄 [DEBUG] 开始处理文件: ${fileItem.name} (${fileItem.type})`);
    
    if (!fileItem.isSupported) {
      console.log(`❌ [DEBUG] 文件不支持: ${fileItem.name}`);
      fileItem.status = 'unsupported';
      return;
    }

    try {
      console.log(`⚙️ [DEBUG] 设置文件状态为处理中: ${fileItem.name}`);
      fileItem.status = 'processing';
      fileItem.startTime = Date.now();
      this.processingQueue.push(fileItem);
      
      // 更新UI
      this.updateFileDisplay(fileItem);
      
      // 根据转换器类型处理文件
      let result;
      switch (fileItem.converter) {
        case 'word':
          result = await this.processWordFile(fileItem);
          break;
        case 'pdf':
          result = await this.processPdfFile(fileItem);
          break;
        case 'ocr':
          result = await this.processImageFile(fileItem);
          break;
        default:
          throw new Error(`不支持的转换器类型: ${fileItem.converter}`);
      }

      // 处理成功
      fileItem.status = 'completed';
      fileItem.result = result;
      fileItem.endTime = Date.now();
      fileItem.processingTime = fileItem.endTime - fileItem.startTime;
      fileItem.progress = 100;
      
      this.completedFiles.push(fileItem);
      this.removeFromProcessingQueue(fileItem);
      
      // 触发单文件完成事件
      this.dispatchEvent('fileCompleted', { fileItem, result });
      
    } catch (error) {
      // 处理失败
      console.error(`❌ [DEBUG] 文件处理失败: ${fileItem.name}`);
      console.error(`❌ [DEBUG] 错误类型: ${error.constructor.name}`);
      console.error(`❌ [DEBUG] 错误信息: ${error.message}`);
      console.error(`❌ [DEBUG] 错误堆栈:`, error.stack);
      
      fileItem.status = 'failed';
      fileItem.error = error.message;
      fileItem.endTime = Date.now();
      fileItem.processingTime = fileItem.endTime - fileItem.startTime;
      
      this.failedFiles.push(fileItem);
      this.removeFromProcessingQueue(fileItem);
      
      console.error(`处理文件 ${fileItem.name} 失败:`, error);
      this.dispatchEvent('fileError', { fileItem, error });
    } finally {
      this.updateFileDisplay(fileItem);
    }
  }

  /**
   * 确保 WordConverter 准备就绪
   */
  async ensureWordConverterReady() {
    // 等待 WordConverter 加载
    let attempts = 0;
    const maxAttempts = 50; // 最多等待5秒
    
    while (!window.WordConverter && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.WordConverter) {
      throw new Error('WordConverter 加载超时。请检查网络连接和脚本加载。');
    }
    
    // 检查依赖
    if (typeof window.WordConverter.checkDependencies === 'function') {
      const deps = window.WordConverter.checkDependencies();
      if (!deps.mammoth) {
        throw new Error('Mammoth.js 库未加载，无法处理 Word 文件');
      }
      if (!deps.turndown) {
        throw new Error('TurndownService 库未加载，无法转换为 Markdown');
      }
    }
    
    console.log('✅ WordConverter 及其依赖已准备就绪');
  }

  /**
   * 处理 Word 文件
   * @param {Object} fileItem - 文件项
   */
  async processWordFile(fileItem) {
    console.log(`📄 [DEBUG] 开始处理 Word 文件: ${fileItem.name}`);
    
    // 检查 WordConverter 是否可用
    await this.ensureWordConverterReady();

    console.log(`✅ [DEBUG] WordConverter 准备就绪，开始转换: ${fileItem.name}`);
    
    // 使用静态方法或实例方法
    let markdown;
    if (typeof window.WordConverter.convertDocxToMarkdown === 'function') {
      // 静态方法调用
      console.log(`🔧 [DEBUG] 使用静态方法转换: ${fileItem.name}`);
      this.updateFileProgress(fileItem, 20);
      markdown = await window.WordConverter.convertDocxToMarkdown(fileItem.file);
    } else {
      // 实例方法调用
      console.log(`🔧 [DEBUG] 使用实例方法转换: ${fileItem.name}`);
      const converter = new window.WordConverter();
      this.updateFileProgress(fileItem, 20);
      markdown = await converter.convertDocxToMarkdown(fileItem.file);
    }
    
    this.updateFileProgress(fileItem, 100);
    
    console.log(`✅ [DEBUG] Word 文件转换完成: ${fileItem.name}, 内容长度: ${markdown?.length || 0}`);
    
    return {
      type: 'markdown',
      content: markdown,
      source: fileItem.name
    };
  }

  /**
   * 处理 PDF 文件
   * @param {Object} fileItem - 文件项
   */
  async processPdfFile(fileItem) {
    // 检查 PDF 转换器是否可用
    if (!window.PdfConverter) {
      throw new Error('PdfConverter 未加载');
    }

    const converter = new PdfConverter();
    
    this.updateFileProgress(fileItem, 10);
    
    const result = await converter.convertPdfToMarkdown(fileItem.file, (progress) => {
      this.updateFileProgress(fileItem, 10 + progress * 0.9);
    });
    
    return {
      type: 'markdown',
      content: result.markdown,
      source: fileItem.name,
      pages: result.pages,
      images: result.images
    };
  }

  /**
   * 处理图片文件
   * @param {Object} fileItem - 文件项
   */
  async processImageFile(fileItem) {
    // 检查图片转换器是否可用
    if (!window.ImageConverter) {
      throw new Error('ImageConverter 未加载');
    }

    const converter = new ImageConverter();
    
    this.updateFileProgress(fileItem, 5);
    
    const result = await converter.convertImageToMarkdown(fileItem.file, (progress) => {
      this.updateFileProgress(fileItem, 5 + progress * 0.95);
    });
    
    return {
      type: 'markdown',
      content: result.markdown,
      source: fileItem.name,
      text: result.text,
      confidence: result.confidence
    };
  }

  /**
   * 更新文件进度
   * @param {Object} fileItem - 文件项
   * @param {number} progress - 进度百分比
   */
  updateFileProgress(fileItem, progress) {
    fileItem.progress = Math.min(100, Math.max(0, progress));
    this.updateFileDisplay(fileItem);
    this.updateOverallProgress();
  }

  /**
   * 更新整体进度
   */
  updateOverallProgress() {
    const totalFiles = this.fileQueue.filter(f => f.isSupported).length;
    if (totalFiles === 0) return;

    const totalProgress = this.fileQueue
      .filter(f => f.isSupported)
      .reduce((sum, f) => sum + f.progress, 0);
    
    const overallProgress = totalProgress / totalFiles;
    
    this.dispatchEvent('progressUpdate', {
      overallProgress,
      completedFiles: this.completedFiles.length,
      failedFiles: this.failedFiles.length,
      processingFiles: this.processingQueue.length,
      totalFiles
    });
  }

  /**
   * 获取待处理文件
   */
  getPendingFiles() {
    return this.fileQueue.filter(f => f.status === 'pending' && f.isSupported);
  }

  /**
   * 从处理队列中移除文件
   * @param {Object} fileItem - 文件项
   */
  removeFromProcessingQueue(fileItem) {
    const index = this.processingQueue.findIndex(f => f.id === fileItem.id);
    if (index > -1) {
      this.processingQueue.splice(index, 1);
    }
  }

  /**
   * 生成文件ID
   */
  generateFileId() {
    return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 更新队列显示
   */
  updateQueueDisplay() {
    const queueContainer = document.getElementById('fileQueueContainer');
    if (!queueContainer) return;

    const html = this.fileQueue.map(fileItem => this.renderFileItem(fileItem)).join('');
    queueContainer.innerHTML = html;
  }

  /**
   * 更新单个文件显示
   * @param {Object} fileItem - 文件项
   */
  updateFileDisplay(fileItem) {
    const fileElement = document.getElementById(`file-${fileItem.id}`);
    if (fileElement) {
      fileElement.outerHTML = this.renderFileItem(fileItem);
    }
  }

  /**
   * 渲染文件项
   * @param {Object} fileItem - 文件项
   */
  renderFileItem(fileItem) {
    const statusIcon = {
      'pending': '⏳',
      'processing': '🔄',
      'completed': '✅',
      'failed': '❌',
      'unsupported': '⚠️'
    };

    const statusText = {
      'pending': '等待处理',
      'processing': '处理中...',
      'completed': '转换完成',
      'failed': '转换失败',
      'unsupported': '格式不支持'
    };

    return `
      <div id="file-${fileItem.id}" class="file-item ${fileItem.status}">
        <div class="file-info">
          <div class="file-icon">${this.getFileIcon(fileItem.type)}</div>
          <div class="file-details">
            <div class="file-name">${fileItem.name}</div>
            <div class="file-meta">
              ${this.formatDetector.formatFileSize(fileItem.size)} • ${fileItem.description || '未知格式'}
            </div>
            ${fileItem.warnings.length > 0 ? `
              <div class="file-warnings">
                ${fileItem.warnings.map(w => `<span class="warning">⚠️ ${w}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        </div>
        <div class="file-status">
          <div class="status-info">
            <span class="status-icon">${statusIcon[fileItem.status]}</span>
            <span class="status-text">${statusText[fileItem.status]}</span>
          </div>
          ${fileItem.status === 'processing' || fileItem.status === 'completed' ? `
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${fileItem.progress}%"></div>
            </div>
            <div class="progress-text">${Math.round(fileItem.progress)}%</div>
          ` : ''}
          ${fileItem.error ? `
            <div class="error-message">${fileItem.error}</div>
          ` : ''}
          ${fileItem.status === 'completed' && fileItem.processingTime ? `
            <div class="processing-time">用时: ${(fileItem.processingTime / 1000).toFixed(1)}s</div>
          ` : ''}
        </div>
        <div class="file-actions">
          ${fileItem.status === 'pending' ? `
            <button class="btn-small" onclick="fileProcessor.removeFile('${fileItem.id}')">移除</button>
          ` : ''}
          ${fileItem.status === 'failed' ? `
            <button class="btn-small" onclick="fileProcessor.retryFile('${fileItem.id}')">重试</button>
          ` : ''}
          ${fileItem.status === 'completed' ? `
            <button class="btn-small" onclick="fileProcessor.viewResult('${fileItem.id}')">查看</button>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 获取文件图标
   * @param {string} type - 文件类型
   */
  getFileIcon(type) {
    const icons = {
      'document': '📄',
      'image': '🖼️',
      'unknown': '📎'
    };
    return icons[type] || icons.unknown;
  }

  /**
   * 移除文件
   * @param {string} fileId - 文件ID
   */
  removeFile(fileId) {
    const index = this.fileQueue.findIndex(f => f.id === fileId);
    if (index > -1) {
      this.fileQueue.splice(index, 1);
      this.updateQueueDisplay();
      this.updateOverallProgress();
    }
  }

  /**
   * 重试文件处理
   * @param {string} fileId - 文件ID
   */
  async retryFile(fileId) {
    const fileItem = this.fileQueue.find(f => f.id === fileId);
    if (fileItem && fileItem.status === 'failed') {
      fileItem.status = 'pending';
      fileItem.progress = 0;
      fileItem.error = null;
      
      // 从失败列表中移除
      const failedIndex = this.failedFiles.findIndex(f => f.id === fileId);
      if (failedIndex > -1) {
        this.failedFiles.splice(failedIndex, 1);
      }
      
      this.updateFileDisplay(fileItem);
      
      // 如果没有在处理中，开始处理
      if (!this.isProcessing) {
        await this.startProcessing();
      }
    }
  }

  /**
   * 查看转换结果
   * @param {string} fileId - 文件ID
   */
  viewResult(fileId) {
    const fileItem = this.fileQueue.find(f => f.id === fileId);
    if (fileItem && fileItem.result) {
      this.dispatchEvent('viewResult', { fileItem });
    }
  }

  /**
   * 清空队列
   */
  clearQueue() {
    this.fileQueue = [];
    this.processingQueue = [];
    this.completedFiles = [];
    this.failedFiles = [];
    this.updateQueueDisplay();
    this.updateOverallProgress();
  }

  /**
   * 获取所有转换结果
   */
  getAllResults() {
    return this.completedFiles.map(f => f.result).filter(r => r);
  }

  /**
   * 合并所有转换结果
   */
  getMergedResult() {
    const results = this.getAllResults();
    if (results.length === 0) return null;

    const mergedContent = results.map(result => {
      return `## 来自 ${result.source}\n\n${result.content}`;
    }).join('\n\n---\n\n');

    return {
      type: 'markdown',
      content: `# 合并转换结果\n\n${mergedContent}`,
      sources: results.map(r => r.source),
      totalFiles: results.length
    };
  }

  /**
   * 触发自定义事件
   * @param {string} eventName - 事件名称
   * @param {Object} detail - 事件详情
   */
  dispatchEvent(eventName, detail) {
    const event = new CustomEvent(`fileProcessor:${eventName}`, { detail });
    document.dispatchEvent(event);
  }

  /**
   * 获取队列统计信息
   */
  getQueueStats() {
    return {
      total: this.fileQueue.length,
      pending: this.fileQueue.filter(item => item.status === 'pending').length,
      processing: this.fileQueue.filter(item => item.status === 'processing').length,
      completed: this.fileQueue.filter(item => item.status === 'completed').length,
      failed: this.fileQueue.filter(item => item.status === 'failed').length
    };
  }

  /**
   * 清空队列
   */
  clearQueue() {
    this.fileQueue = [];
    this.processingQueue = [];
    this.completedFiles = [];
    this.failedFiles = [];
    this.updateQueueDisplay();
    this.dispatchEvent('queueCleared', {});
  }

  /**
   * 开始处理所有文件
   */
  startAll() {
    console.log('🚀 [DEBUG] startAll() 被调用');
    console.log('📊 [DEBUG] 当前队列状态:', this.getQueueStats());
    
    if (this.fileQueue.length === 0) {
      console.log('⚠️ [DEBUG] 队列为空，无文件需要处理');
      return;
    }
    
    console.log('✅ [DEBUG] 开始处理文件队列，文件数量:', this.fileQueue.length);
    this.isProcessing = true;
    this.processQueue().catch(error => {
      console.error('❌ [DEBUG] processQueue 执行失败:', error);
      this.isProcessing = false;
    });
  }

  /**
   * 暂停处理
   */
  pauseAll() {
    this.isProcessing = false;
    console.log('文件处理已暂停');
  }

  /**
   * 更新队列显示
   */
  updateQueueDisplay() {
    const container = document.getElementById('fileQueueContainer');
    if (!container) return;

    if (this.fileQueue.length === 0) {
      container.innerHTML = '<div class="empty-queue"><p>📋 暂无文件，请上传文件开始转换</p></div>';
      return;
    }

    const queueHTML = this.fileQueue.map(item => this.createFileItemHTML(item)).join('');
    container.innerHTML = queueHTML;
  }

  /**
   * 创建文件项 HTML
   */
  createFileItemHTML(item) {
    const statusIcons = {
      pending: '⏳',
      processing: '🔄',
      completed: '✅',
      failed: '❌'
    };

    const statusTexts = {
      pending: '等待处理',
      processing: '处理中...',
      completed: '已完成',
      failed: '处理失败'
    };

    return `
      <div class="file-item ${item.status}" data-file-id="${item.id}">
        <div class="file-info">
          <div class="file-icon">${window.FileUtils?.getFileIcon(item.file) || '📄'}</div>
          <div class="file-details">
            <div class="file-name">${item.file.name}</div>
            <div class="file-meta">
              ${window.FileUtils?.formatFileSize(item.file.size) || item.file.size + ' bytes'} • 
              ${item.file.type || '未知类型'}
            </div>
            ${item.error ? `<div class="error-message">${item.error}</div>` : ''}
          </div>
        </div>
        <div class="file-status">
          <div class="status-info">
            <span class="status-icon">${statusIcons[item.status]}</span>
            <span>${statusTexts[item.status]}</span>
          </div>
          ${item.status === 'processing' ? `
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${item.progress || 0}%"></div>
            </div>
            <div class="progress-text">${Math.round(item.progress || 0)}%</div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 销毁文件处理器
   */
  destroy() {
    this.clearQueue();
    this.isProcessing = false;
  }
}

// 导出模块
window.FileProcessor = FileProcessor;