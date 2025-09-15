/**
 * 图片转换器模块
 * 负责将图片文件通过 OCR 识别转换为 Markdown 格式
 */

class ImageConverter {
  constructor() {
    this.tesseract = null;
    this.isInitialized = false;
    this.worker = null;
    this.supportedLanguages = ['eng', 'chi_sim', 'chi_tra']; // 英文、简体中文、繁体中文
    this.defaultLanguage = 'eng+chi_sim'; // 默认支持英文和简体中文
  }

  /**
   * 初始化图片转换器（延迟初始化，避免AudioContext警告）
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // 检查 Tesseract.js 是否已加载
      if (typeof Tesseract === 'undefined') {
        throw new Error('Tesseract.js 库未加载');
      }

      this.tesseract = Tesseract;
      
      // 延迟创建 Worker，只在实际需要时创建
      // 这样可以避免在页面加载时就创建AudioContext
      
      this.isInitialized = true;
    } catch (error) {
      console.error('图片转换器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建并初始化 Worker（仅在需要时调用）
   */
  async initWorker() {
    if (this.worker) return;

    try {
      // 创建 Worker
      this.worker = await this.tesseract.createWorker();
      
      // 初始化 Worker
      await this.worker.loadLanguage(this.defaultLanguage);
      await this.worker.initialize(this.defaultLanguage);
    } catch (error) {
      console.error('Worker 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 将图片文件转换为 Markdown
   * @param {File} file - 图片文件
   * @param {Function} onProgress - 进度回调函数
   * @returns {Promise<Object>} 转换结果
   */
  async convertImageToMarkdown(file, onProgress = null) {
    await this.init();
    
    // 只在实际需要转换时才初始化Worker（避免AudioContext警告）
    await this.initWorker();

    try {
      if (onProgress) onProgress(5);

      // 预处理图片
      const processedImage = await this.preprocessImage(file);
      
      if (onProgress) onProgress(15);

      // 执行 OCR 识别
      const ocrResult = await this.performOCR(processedImage, onProgress);
      
      if (onProgress) onProgress(85);

      // 转换为 Markdown
      const markdown = this.convertOcrToMarkdown(ocrResult, file.name);
      
      if (onProgress) onProgress(95);

      // 生成图片的 Base64 编码
      const imageBase64 = await this.convertImageToBase64(file);
      
      if (onProgress) onProgress(100);

      return {
        markdown: markdown,
        text: ocrResult.data.text,
        confidence: ocrResult.data.confidence,
        words: ocrResult.data.words,
        lines: ocrResult.data.lines,
        paragraphs: ocrResult.data.paragraphs,
        imageBase64: imageBase64,
        imageInfo: {
          name: file.name,
          size: file.size,
          type: file.type,
          width: processedImage.width,
          height: processedImage.height
        }
      };

    } catch (error) {
      console.error('图片转换失败:', error);
      throw new Error(`图片转换失败: ${error.message}`);
    }
  }

  /**
   * 预处理图片以提高 OCR 识别率
   * @param {File} file - 图片文件
   * @returns {Promise<HTMLCanvasElement>} 处理后的图片
   */
  async preprocessImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // 设置画布尺寸
          canvas.width = img.width;
          canvas.height = img.height;
          
          // 绘制原图
          ctx.drawImage(img, 0, 0);
          
          // 图像增强处理
          this.enhanceImage(ctx, canvas.width, canvas.height);
          
          resolve(canvas);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('图片加载失败'));
      
      // 创建图片 URL
      const url = URL.createObjectURL(file);
      img.src = url;
    });
  }

  /**
   * 图像增强处理
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {number} width - 图片宽度
   * @param {number} height - 图片高度
   */
  enhanceImage(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 转换为灰度并增强对比度
    for (let i = 0; i < data.length; i += 4) {
      // 计算灰度值
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      
      // 增强对比度（简单的阈值处理）
      const enhanced = gray > 128 ? 255 : 0;
      
      data[i] = enhanced;     // R
      data[i + 1] = enhanced; // G
      data[i + 2] = enhanced; // B
      // data[i + 3] 保持不变 (Alpha)
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 执行 OCR 识别
   * @param {HTMLCanvasElement} image - 预处理后的图片
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<Object>} OCR 结果
   */
  async performOCR(image, onProgress = null) {
    try {
      const result = await this.worker.recognize(image, {
        logger: (m) => {
          if (onProgress && m.status === 'recognizing text') {
            const progress = 15 + (m.progress * 70); // 15% 到 85%
            onProgress(progress);
          }
        }
      });

      return result;
    } catch (error) {
      console.error('OCR 识别失败:', error);
      throw error;
    }
  }

  /**
   * 将 OCR 结果转换为 Markdown
   * @param {Object} ocrResult - OCR 识别结果
   * @param {string} imageName - 图片文件名
   * @returns {string} Markdown 内容
   */
  convertOcrToMarkdown(ocrResult, imageName) {
    const { data } = ocrResult;
    let markdown = '';

    // 添加图片标题
    markdown += `# 图片文字识别结果\n\n`;
    markdown += `**来源图片**: ${imageName}\n`;
    markdown += `**识别置信度**: ${Math.round(data.confidence)}%\n\n`;

    // 如果识别到文字
    if (data.text && data.text.trim()) {
      // 按段落组织文本
      const paragraphs = this.organizeParagraphs(data.paragraphs);
      
      if (paragraphs.length > 0) {
        markdown += `## 识别内容\n\n`;
        
        paragraphs.forEach((paragraph, index) => {
          if (paragraph.text.trim()) {
            // 检测是否可能是标题
            if (this.isPossibleHeading(paragraph)) {
              markdown += `### ${paragraph.text.trim()}\n\n`;
            } else {
              markdown += `${paragraph.text.trim()}\n\n`;
            }
          }
        });
      } else {
        // 如果段落识别失败，使用原始文本
        markdown += `## 识别内容\n\n`;
        markdown += `${data.text.trim()}\n\n`;
      }

      // 添加详细信息
      if (data.words && data.words.length > 0) {
        markdown += `---\n\n`;
        markdown += `**统计信息**:\n`;
        markdown += `- 识别字数: ${data.words.length}\n`;
        markdown += `- 文本行数: ${data.lines ? data.lines.length : 0}\n`;
        markdown += `- 段落数: ${data.paragraphs ? data.paragraphs.length : 0}\n\n`;
      }

    } else {
      markdown += `## 识别结果\n\n`;
      markdown += `未能识别到文字内容。可能的原因：\n`;
      markdown += `- 图片质量较低\n`;
      markdown += `- 文字过小或模糊\n`;
      markdown += `- 字体不清晰\n`;
      markdown += `- 语言不在支持范围内\n\n`;
    }

    // 添加原图片引用
    markdown += `## 原始图片\n\n`;
    markdown += `![${imageName}](data:${this.getImageMimeType(imageName)};base64,{IMAGE_BASE64})\n\n`;

    return markdown;
  }

  /**
   * 组织段落文本
   * @param {Array} paragraphs - OCR 段落数据
   * @returns {Array} 组织后的段落
   */
  organizeParagraphs(paragraphs) {
    if (!paragraphs || paragraphs.length === 0) return [];

    return paragraphs
      .filter(p => p.text && p.text.trim())
      .map(p => ({
        text: p.text.trim(),
        confidence: p.confidence,
        bbox: p.bbox,
        words: p.words || []
      }))
      .sort((a, b) => {
        // 按位置排序（从上到下，从左到右）
        if (Math.abs(a.bbox.y0 - b.bbox.y0) > 10) {
          return a.bbox.y0 - b.bbox.y0;
        }
        return a.bbox.x0 - b.bbox.x0;
      });
  }

  /**
   * 判断是否可能是标题
   * @param {Object} paragraph - 段落对象
   * @returns {boolean} 是否可能是标题
   */
  isPossibleHeading(paragraph) {
    const text = paragraph.text.trim();
    
    // 标题特征检测
    return (
      text.length < 50 && // 长度较短
      text.length > 2 &&  // 不能太短
      !/[.。!！?？]$/.test(text) && // 不以句号等结尾
      (
        /^[A-Z]/.test(text) || // 英文大写开头
        /^[\u4e00-\u9fa5]/.test(text) || // 中文开头
        /^\d+[\.、]/.test(text) // 数字编号开头
      )
    );
  }

  /**
   * 将图片转换为 Base64
   * @param {File} file - 图片文件
   * @returns {Promise<string>} Base64 字符串
   */
  async convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // 移除 data:image/...;base64, 前缀
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * 获取图片 MIME 类型
   * @param {string} filename - 文件名
   * @returns {string} MIME 类型
   */
  getImageMimeType(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * 设置识别语言
   * @param {string} language - 语言代码
   */
  async setLanguage(language) {
    if (!this.supportedLanguages.includes(language)) {
      throw new Error(`不支持的语言: ${language}`);
    }

    this.defaultLanguage = language;
    
    // 如果Worker已经存在，重新初始化
    if (this.worker) {
      await this.worker.loadLanguage(language);
      await this.worker.initialize(language);
    }
  }

  /**
   * 获取支持的语言列表
   * @returns {Array} 支持的语言
   */
  getSupportedLanguages() {
    return [
      { code: 'eng', name: '英语' },
      { code: 'chi_sim', name: '简体中文' },
      { code: 'chi_tra', name: '繁体中文' },
      { code: 'eng+chi_sim', name: '英语+简体中文' }
    ];
  }

  /**
   * 检查 Tesseract.js 是否可用
   * @returns {boolean} 是否可用
   */
  isAvailable() {
    return typeof Tesseract !== 'undefined';
  }

  /**
   * 获取支持的文件类型
   * @returns {Array} 支持的 MIME 类型
   */
  getSupportedTypes() {
    return ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
  }

  /**
   * 验证图片文件
   * @param {File} file - 图片文件
   * @returns {Promise<boolean>} 是否有效
   */
  async validateImageFile(file) {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        resolve(true);
        URL.revokeObjectURL(img.src);
      };
      
      img.onerror = () => {
        resolve(false);
        URL.revokeObjectURL(img.src);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 获取图片信息
   * @param {File} file - 图片文件
   * @returns {Promise<Object>} 图片信息
   */
  async getImageInfo(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          isValid: true,
          width: img.width,
          height: img.height,
          size: file.size,
          type: file.type,
          aspectRatio: img.width / img.height
        });
        URL.revokeObjectURL(img.src);
      };
      
      img.onerror = () => {
        resolve({
          isValid: false,
          error: '无法加载图片'
        });
        URL.revokeObjectURL(img.src);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 批量处理图片
   * @param {Array} files - 图片文件数组
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<Array>} 处理结果数组
   */
  async convertMultipleImages(files, onProgress = null) {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const result = await this.convertImageToMarkdown(file, (fileProgress) => {
          if (onProgress) {
            const overallProgress = (i / files.length) * 100 + (fileProgress / files.length);
            onProgress(overallProgress, i, file.name);
          }
        });
        
        results.push({
          file: file.name,
          success: true,
          result: result
        });
        
      } catch (error) {
        results.push({
          file: file.name,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * 销毁转换器
   */
  async destroy() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
  }
}

// 导出模块
window.ImageConverter = ImageConverter;