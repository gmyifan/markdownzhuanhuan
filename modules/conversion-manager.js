/**
 * 转换管理器模块
 * 统一管理所有文件转换器，提供统一的转换接口
 */

class ConversionManager {
  constructor() {
    this.converters = {};
    this.isInitialized = false;
    this.activeConversions = new Map();
    this.conversionHistory = [];
    this.maxConcurrentConversions = 3;
    
    // 转换器配置
    this.converterConfig = {
      word: {
        class: 'WordConverter',
        types: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
        extensions: ['.docx', '.doc'],
        maxSize: 50 * 1024 * 1024, // 50MB
        description: 'Word 文档转换器'
      },
      pdf: {
        class: 'PdfConverter',
        types: ['application/pdf'],
        extensions: ['.pdf'],
        maxSize: 100 * 1024 * 1024, // 100MB
        description: 'PDF 文档转换器'
      },
      ocr: {
        class: 'ImageConverter',
        types: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
        maxSize: 20 * 1024 * 1024, // 20MB
        description: '图片 OCR 转换器'
      }
    };
  }

  /**
   * 初始化转换管理器
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // 初始化所有转换器
      await this.initializeConverters();
      
      // 绑定事件监听器
      this.bindEvents();
      
      this.isInitialized = true;
      console.log('转换管理器初始化完成');
      
    } catch (error) {
      console.error('转换管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化所有转换器
   */
  async initializeConverters() {
    for (const [type, config] of Object.entries(this.converterConfig)) {
      try {
        const ConverterClass = window[config.class];
        if (ConverterClass) {
          const converter = new ConverterClass();
          
          // 如果转换器有 init 方法，则调用
          if (typeof converter.init === 'function') {
            await converter.init();
          }
          
          this.converters[type] = converter;
          console.log(`${config.description} 初始化成功`);
        } else {
          console.warn(`转换器类 ${config.class} 未找到`);
        }
      } catch (error) {
        console.error(`初始化 ${config.description} 失败:`, error);
      }
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 监听转换完成事件
    document.addEventListener('conversionComplete', (e) => {
      this.handleConversionComplete(e.detail);
    });

    // 监听转换错误事件
    document.addEventListener('conversionError', (e) => {
      this.handleConversionError(e.detail);
    });
  }

  /**
   * 转换文件
   * @param {File} file - 要转换的文件
   * @param {Object} options - 转换选项
   * @returns {Promise<Object>} 转换结果
   */
  async convertFile(file, options = {}) {
    try {
      // 检测文件格式
      const formatDetector = new FormatDetector();
      const detection = formatDetector.detectFormat(file);
      
      if (!detection.isSupported) {
        throw new Error(detection.error || '不支持的文件格式');
      }

      // 获取对应的转换器
      const converter = this.converters[detection.converter];
      if (!converter) {
        throw new Error(`转换器 ${detection.converter} 不可用`);
      }

      // 检查并发限制
      if (this.activeConversions.size >= this.maxConcurrentConversions) {
        throw new Error('转换队列已满，请稍后重试');
      }

      // 创建转换任务
      const conversionId = this.generateConversionId();
      const conversionTask = {
        id: conversionId,
        file: file,
        converter: detection.converter,
        status: 'processing',
        startTime: Date.now(),
        progress: 0,
        options: options
      };

      this.activeConversions.set(conversionId, conversionTask);

      // 触发转换开始事件
      this.dispatchEvent('conversionStarted', {
        conversionId,
        fileName: file.name,
        converter: detection.converter
      });

      // 执行转换
      let result;
      switch (detection.converter) {
        case 'word':
          result = await this.convertWordFile(converter, file, conversionTask);
          break;
        case 'pdf':
          result = await this.convertPdfFile(converter, file, conversionTask);
          break;
        case 'ocr':
          result = await this.convertImageFile(converter, file, conversionTask);
          break;
        default:
          throw new Error(`未知的转换器类型: ${detection.converter}`);
      }

      // 更新任务状态
      conversionTask.status = 'completed';
      conversionTask.endTime = Date.now();
      conversionTask.result = result;
      conversionTask.progress = 100;

      // 添加到历史记录
      this.conversionHistory.push({ ...conversionTask });

      // 从活动转换中移除
      this.activeConversions.delete(conversionId);

      // 触发转换完成事件
      this.dispatchEvent('conversionComplete', {
        conversionId,
        result,
        task: conversionTask
      });

      return result;

    } catch (error) {
      console.error('文件转换失败:', error);
      
      // 触发转换错误事件
      this.dispatchEvent('conversionError', {
        fileName: file.name,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * 转换 Word 文件
   * @param {Object} converter - Word 转换器
   * @param {File} file - 文件
   * @param {Object} task - 转换任务
   */
  async convertWordFile(converter, file, task) {
    const updateProgress = (progress) => {
      task.progress = progress;
      this.dispatchEvent('conversionProgress', {
        conversionId: task.id,
        progress: progress
      });
    };

    updateProgress(10);
    
    let markdown;
    if (typeof converter.convertDocxToMarkdown === 'function') {
      markdown = await converter.convertDocxToMarkdown(file);
    } else {
      throw new Error('Word 转换器方法不可用');
    }

    updateProgress(100);

    return {
      type: 'markdown',
      content: markdown,
      source: file.name,
      converter: 'word',
      metadata: {
        originalSize: file.size,
        convertedAt: new Date().toISOString()
      }
    };
  }

  /**
   * 转换 PDF 文件
   * @param {Object} converter - PDF 转换器
   * @param {File} file - 文件
   * @param {Object} task - 转换任务
   */
  async convertPdfFile(converter, file, task) {
    const updateProgress = (progress) => {
      task.progress = progress;
      this.dispatchEvent('conversionProgress', {
        conversionId: task.id,
        progress: progress
      });
    };

    const result = await converter.convertPdfToMarkdown(file, updateProgress);

    return {
      type: 'markdown',
      content: result.markdown,
      source: file.name,
      converter: 'pdf',
      metadata: {
        originalSize: file.size,
        pages: result.totalPages,
        images: result.images.length,
        convertedAt: new Date().toISOString(),
        pdfMetadata: result.metadata
      },
      additionalData: {
        pages: result.pages,
        images: result.images
      }
    };
  }

  /**
   * 转换图片文件
   * @param {Object} converter - 图片转换器
   * @param {File} file - 文件
   * @param {Object} task - 转换任务
   */
  async convertImageFile(converter, file, task) {
    const updateProgress = (progress) => {
      task.progress = progress;
      this.dispatchEvent('conversionProgress', {
        conversionId: task.id,
        progress: progress
      });
    };

    const result = await converter.convertImageToMarkdown(file, updateProgress);

    // 替换 Markdown 中的图片占位符
    let markdown = result.markdown;
    if (result.imageBase64) {
      markdown = markdown.replace('{IMAGE_BASE64}', result.imageBase64);
    }

    return {
      type: 'markdown',
      content: markdown,
      source: file.name,
      converter: 'ocr',
      metadata: {
        originalSize: file.size,
        confidence: result.confidence,
        wordsCount: result.words ? result.words.length : 0,
        convertedAt: new Date().toISOString(),
        imageInfo: result.imageInfo
      },
      additionalData: {
        text: result.text,
        words: result.words,
        lines: result.lines,
        paragraphs: result.paragraphs
      }
    };
  }

  /**
   * 批量转换文件
   * @param {Array} files - 文件数组
   * @param {Object} options - 转换选项
   * @returns {Promise<Array>} 转换结果数组
   */
  async convertMultipleFiles(files, options = {}) {
    const results = [];
    const errors = [];

    // 分批处理以控制并发
    const batchSize = Math.min(this.maxConcurrentConversions, files.length);
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.convertFile(file, options);
          return { success: true, file: file.name, result };
        } catch (error) {
          return { success: false, file: file.name, error: error.message };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((promiseResult) => {
        if (promiseResult.status === 'fulfilled') {
          const result = promiseResult.value;
          if (result.success) {
            results.push(result);
          } else {
            errors.push(result);
          }
        } else {
          errors.push({
            success: false,
            file: 'unknown',
            error: promiseResult.reason.message
          });
        }
      });
    }

    return {
      successful: results,
      failed: errors,
      total: files.length,
      successCount: results.length,
      failureCount: errors.length
    };
  }

  /**
   * 合并多个转换结果
   * @param {Array} results - 转换结果数组
   * @returns {Object} 合并后的结果
   */
  mergeResults(results) {
    if (!results || results.length === 0) {
      return null;
    }

    if (results.length === 1) {
      return results[0];
    }

    // 按转换器类型分组
    const groupedResults = {};
    results.forEach(result => {
      const converter = result.converter;
      if (!groupedResults[converter]) {
        groupedResults[converter] = [];
      }
      groupedResults[converter].push(result);
    });

    // 生成合并的 Markdown 内容
    let mergedContent = '# 多文件转换结果\n\n';
    
    Object.entries(groupedResults).forEach(([converter, converterResults]) => {
      const converterName = this.converterConfig[converter]?.description || converter;
      mergedContent += `## ${converterName} (${converterResults.length} 个文件)\n\n`;
      
      converterResults.forEach((result, index) => {
        mergedContent += `### ${index + 1}. ${result.source}\n\n`;
        mergedContent += `${result.content}\n\n`;
        
        if (index < converterResults.length - 1) {
          mergedContent += '---\n\n';
        }
      });
      
      mergedContent += '\n';
    });

    return {
      type: 'markdown',
      content: mergedContent,
      source: 'merged_results',
      converter: 'multiple',
      metadata: {
        totalFiles: results.length,
        converters: Object.keys(groupedResults),
        mergedAt: new Date().toISOString()
      },
      originalResults: results
    };
  }

  /**
   * 获取转换器状态
   * @returns {Object} 转换器状态信息
   */
  getConverterStatus() {
    const status = {};
    
    Object.entries(this.converterConfig).forEach(([type, config]) => {
      const converter = this.converters[type];
      status[type] = {
        available: !!converter,
        description: config.description,
        supportedTypes: config.types,
        supportedExtensions: config.extensions,
        maxSize: config.maxSize,
        isReady: converter && (typeof converter.isAvailable !== 'function' || converter.isAvailable())
      };
    });

    return status;
  }

  /**
   * 获取活动转换任务
   * @returns {Array} 活动转换任务列表
   */
  getActiveConversions() {
    return Array.from(this.activeConversions.values());
  }

  /**
   * 获取转换历史
   * @returns {Array} 转换历史记录
   */
  getConversionHistory() {
    return [...this.conversionHistory];
  }

  /**
   * 取消转换任务
   * @param {string} conversionId - 转换任务ID
   */
  cancelConversion(conversionId) {
    const task = this.activeConversions.get(conversionId);
    if (task) {
      task.status = 'cancelled';
      this.activeConversions.delete(conversionId);
      
      this.dispatchEvent('conversionCancelled', {
        conversionId,
        fileName: task.file.name
      });
    }
  }

  /**
   * 清理转换历史
   */
  clearHistory() {
    this.conversionHistory = [];
  }

  /**
   * 生成转换任务ID
   * @returns {string} 唯一ID
   */
  generateConversionId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 处理转换完成事件
   * @param {Object} detail - 事件详情
   */
  handleConversionComplete(detail) {
    console.log('转换完成:', detail);
  }

  /**
   * 处理转换错误事件
   * @param {Object} detail - 事件详情
   */
  handleConversionError(detail) {
    console.error('转换错误:', detail);
  }

  /**
   * 触发自定义事件
   * @param {string} eventName - 事件名称
   * @param {Object} detail - 事件详情
   */
  dispatchEvent(eventName, detail) {
    const event = new CustomEvent(`conversionManager:${eventName}`, { detail });
    document.dispatchEvent(event);
  }

  /**
   * 获取支持的文件格式信息
   * @returns {Object} 格式信息
   */
  getSupportedFormats() {
    const formats = {};
    
    Object.entries(this.converterConfig).forEach(([type, config]) => {
      formats[type] = {
        description: config.description,
        types: config.types,
        extensions: config.extensions,
        maxSize: config.maxSize,
        available: !!this.converters[type]
      };
    });

    return formats;
  }

  /**
   * 检查文件是否支持
   * @param {File} file - 文件对象
   * @returns {Object} 支持性检查结果
   */
  checkFileSupport(file) {
    const formatDetector = new FormatDetector();
    return formatDetector.detectFormat(file);
  }

  /**
   * 销毁转换管理器
   */
  async destroy() {
    // 取消所有活动转换
    for (const conversionId of this.activeConversions.keys()) {
      this.cancelConversion(conversionId);
    }

    // 销毁所有转换器
    for (const converter of Object.values(this.converters)) {
      if (typeof converter.destroy === 'function') {
        await converter.destroy();
      }
    }

    this.converters = {};
    this.activeConversions.clear();
    this.conversionHistory = [];
    this.isInitialized = false;
  }
}

// 导出模块
window.ConversionManager = ConversionManager;