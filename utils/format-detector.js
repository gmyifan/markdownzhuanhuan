/**
 * 格式检测器模块
 * 负责检测文件格式、验证支持性、提供转换策略
 */

class FormatDetector {
  constructor() {
    // 支持的文件格式配置
    this.supportedFormats = {
      // Word 文档
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        extensions: ['.docx'],
        type: 'document',
        converter: 'word',
        maxSize: 50 * 1024 * 1024, // 50MB
        description: 'Word 文档 (DOCX)'
      },
      'application/msword': {
        extensions: ['.doc'],
        type: 'document', 
        converter: 'word',
        maxSize: 50 * 1024 * 1024, // 50MB
        description: 'Word 文档 (DOC)'
      },
      
      // PDF 文档
      'application/pdf': {
        extensions: ['.pdf'],
        type: 'document',
        converter: 'pdf',
        maxSize: 100 * 1024 * 1024, // 100MB
        description: 'PDF 文档'
      },
      
      // 图片文件
      'image/png': {
        extensions: ['.png'],
        type: 'image',
        converter: 'ocr',
        maxSize: 20 * 1024 * 1024, // 20MB
        description: 'PNG 图片'
      },
      'image/jpeg': {
        extensions: ['.jpg', '.jpeg'],
        type: 'image',
        converter: 'ocr',
        maxSize: 20 * 1024 * 1024, // 20MB
        description: 'JPEG 图片'
      }
    };

    // 文件扩展名到 MIME 类型的映射
    this.extensionToMime = {};
    this.initExtensionMapping();
  }

  /**
   * 初始化扩展名映射
   */
  initExtensionMapping() {
    Object.entries(this.supportedFormats).forEach(([mimeType, config]) => {
      config.extensions.forEach(ext => {
        this.extensionToMime[ext.toLowerCase()] = mimeType;
      });
    });
  }

  /**
   * 检测文件格式
   * @param {File} file - 要检测的文件
   * @returns {Object} 检测结果
   */
  detectFormat(file) {
    const result = {
      isSupported: false,
      mimeType: null,
      detectedType: null,
      converter: null,
      maxSize: 0,
      description: '',
      error: null,
      warnings: []
    };

    try {
      // 1. 基于文件扩展名检测
      const extension = this.getFileExtension(file.name);
      const mimeFromExt = this.extensionToMime[extension];
      
      // 2. 使用文件的 MIME 类型
      const fileMimeType = file.type;
      
      // 3. 优先使用文件的 MIME 类型，回退到扩展名检测
      const detectedMime = fileMimeType || mimeFromExt;
      
      if (!detectedMime) {
        result.error = `不支持的文件格式: ${file.name}`;
        return result;
      }

      // 4. 检查是否在支持列表中
      const formatConfig = this.supportedFormats[detectedMime];
      if (!formatConfig) {
        result.error = `不支持的文件类型: ${detectedMime}`;
        return result;
      }

      // 5. 验证文件扩展名匹配
      if (!formatConfig.extensions.includes(extension)) {
        result.warnings.push(`文件扩展名 ${extension} 与检测到的类型 ${formatConfig.description} 不匹配`);
      }

      // 6. 检查文件大小
      if (file.size > formatConfig.maxSize) {
        result.error = `文件大小 ${this.formatFileSize(file.size)} 超过限制 ${this.formatFileSize(formatConfig.maxSize)}`;
        return result;
      }

      // 7. 检查文件是否为空
      if (file.size === 0) {
        result.error = '文件为空';
        return result;
      }

      // 8. 填充成功结果
      result.isSupported = true;
      result.mimeType = detectedMime;
      result.detectedType = formatConfig.type;
      result.converter = formatConfig.converter;
      result.maxSize = formatConfig.maxSize;
      result.description = formatConfig.description;

      // 9. 添加性能警告
      if (file.size > 10 * 1024 * 1024) { // 10MB
        result.warnings.push('大文件可能需要较长转换时间');
      }

    } catch (error) {
      result.error = `格式检测失败: ${error.message}`;
    }

    return result;
  }

  /**
   * 批量检测文件格式
   * @param {FileList|Array} files - 文件列表
   * @returns {Array} 检测结果数组
   */
  detectMultipleFormats(files) {
    const results = [];
    const fileArray = Array.from(files);

    fileArray.forEach((file, index) => {
      const detection = this.detectFormat(file);
      results.push({
        index,
        file,
        ...detection
      });
    });

    return results;
  }

  /**
   * 获取文件扩展名
   * @param {string} filename - 文件名
   * @returns {string} 扩展名（包含点号）
   */
  getFileExtension(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.slice(lastDotIndex).toLowerCase() : '';
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化的大小字符串
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 获取支持的格式列表
   * @returns {Array} 支持的格式信息
   */
  getSupportedFormats() {
    return Object.entries(this.supportedFormats).map(([mimeType, config]) => ({
      mimeType,
      ...config
    }));
  }

  /**
   * 检查是否支持某个 MIME 类型
   * @param {string} mimeType - MIME 类型
   * @returns {boolean} 是否支持
   */
  isFormatSupported(mimeType) {
    return !!this.supportedFormats[mimeType];
  }

  /**
   * 根据转换器类型获取格式
   * @param {string} converterType - 转换器类型 ('word', 'pdf', 'ocr')
   * @returns {Array} 该转换器支持的格式
   */
  getFormatsByConverter(converterType) {
    return Object.entries(this.supportedFormats)
      .filter(([, config]) => config.converter === converterType)
      .map(([mimeType, config]) => ({
        mimeType,
        ...config
      }));
  }

  /**
   * 生成文件接受属性字符串（用于 input[type="file"]）
   * @returns {string} accept 属性值
   */
  getAcceptString() {
    const extensions = [];
    const mimeTypes = [];

    Object.entries(this.supportedFormats).forEach(([mimeType, config]) => {
      mimeTypes.push(mimeType);
      extensions.push(...config.extensions);
    });

    return [...new Set([...mimeTypes, ...extensions])].join(',');
  }

  /**
   * 验证文件安全性
   * @param {File} file - 要验证的文件
   * @returns {Object} 安全性检查结果
   */
  validateFileSecurity(file) {
    const result = {
      isSafe: true,
      risks: [],
      recommendations: []
    };

    // 检查文件名中的可疑字符
    const suspiciousChars = /[<>:"|?*\x00-\x1f]/;
    if (suspiciousChars.test(file.name)) {
      result.risks.push('文件名包含可疑字符');
      result.recommendations.push('建议重命名文件');
    }

    // 检查文件名长度
    if (file.name.length > 255) {
      result.risks.push('文件名过长');
      result.recommendations.push('建议缩短文件名');
    }

    // 检查双重扩展名
    const parts = file.name.split('.');
    if (parts.length > 2) {
      result.risks.push('文件可能包含双重扩展名');
      result.recommendations.push('请确认文件来源可信');
    }

    // 如果有风险，标记为不安全
    if (result.risks.length > 0) {
      result.isSafe = false;
    }

    return result;
  }

  /**
   * 获取转换策略建议
   * @param {Array} detectionResults - 检测结果数组
   * @returns {Object} 转换策略
   */
  getConversionStrategy(detectionResults) {
    const strategy = {
      totalFiles: detectionResults.length,
      supportedFiles: 0,
      unsupportedFiles: 0,
      converters: {},
      estimatedTime: 0,
      memoryRequirement: 0,
      recommendations: []
    };

    detectionResults.forEach(result => {
      if (result.isSupported) {
        strategy.supportedFiles++;
        
        // 按转换器分组
        if (!strategy.converters[result.converter]) {
          strategy.converters[result.converter] = [];
        }
        strategy.converters[result.converter].push(result);

        // 估算处理时间（基于文件大小和类型）
        const timeMultiplier = {
          'word': 0.5,  // 秒/MB
          'pdf': 1.0,   // 秒/MB
          'ocr': 2.0    // 秒/MB
        };
        const fileSizeMB = result.file.size / (1024 * 1024);
        strategy.estimatedTime += fileSizeMB * (timeMultiplier[result.converter] || 1.0);

        // 估算内存需求
        strategy.memoryRequirement += result.file.size * 2; // 假设需要2倍文件大小的内存

      } else {
        strategy.unsupportedFiles++;
      }
    });

    // 生成建议
    if (strategy.unsupportedFiles > 0) {
      strategy.recommendations.push(`${strategy.unsupportedFiles} 个文件格式不支持，将被跳过`);
    }

    if (strategy.estimatedTime > 60) {
      strategy.recommendations.push('预计处理时间较长，建议分批处理');
    }

    if (strategy.memoryRequirement > 200 * 1024 * 1024) { // 200MB
      strategy.recommendations.push('内存需求较高，建议关闭其他应用程序');
    }

    return strategy;
  }
}

// 导出模块
window.FormatDetector = FormatDetector;