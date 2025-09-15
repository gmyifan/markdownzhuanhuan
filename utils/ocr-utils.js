/**
 * OCR 工具模块
 * 提供图片文字识别功能的统一接口
 */

class OCRUtils {
  constructor() {
    this.isInitialized = false;
    this.tesseractWorker = null;
    this.supportedLanguages = ['eng', 'chi_sim', 'chi_tra'];
    this.defaultLanguage = 'eng+chi_sim';
  }

  /**
   * 初始化 OCR 引擎
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      // 检查 Tesseract.js 是否可用
      if (typeof Tesseract !== 'undefined') {
        this.tesseractWorker = await Tesseract.createWorker();
        await this.tesseractWorker.loadLanguage(this.defaultLanguage);
        await this.tesseractWorker.initialize(this.defaultLanguage);
        
        console.log('Tesseract.js OCR 引擎初始化成功');
        this.isInitialized = true;
        return true;
      } else {
        console.warn('Tesseract.js 未加载，使用备用 OCR 方案');
        this.isInitialized = true;
        return false;
      }
    } catch (error) {
      console.error('OCR 引擎初始化失败:', error);
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * 识别图片中的文字
   */
  async recognizeText(imageFile, options = {}) {
    const {
      language = this.defaultLanguage,
      psm = 6, // Page segmentation mode
      oem = 3, // OCR Engine mode
      progress = null
    } = options;

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // 如果有 Tesseract.js，使用它进行识别
      if (this.tesseractWorker) {
        const result = await this.tesseractWorker.recognize(imageFile, {
          logger: progress ? (m) => {
            if (m.status === 'recognizing text') {
              progress(m.progress);
            }
          } : undefined
        });

        return {
          text: result.data.text,
          confidence: result.data.confidence,
          words: result.data.words,
          lines: result.data.lines,
          paragraphs: result.data.paragraphs,
          blocks: result.data.blocks
        };
      } else {
        // 备用方案：返回模拟结果
        return await this.fallbackOCR(imageFile, progress);
      }
    } catch (error) {
      console.error('OCR 识别失败:', error);
      throw new Error(`OCR 识别失败: ${error.message}`);
    }
  }

  /**
   * 备用 OCR 方案
   */
  async fallbackOCR(imageFile, progress) {
    // 模拟进度
    if (progress) {
      for (let i = 0; i <= 100; i += 20) {
        progress(i / 100);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 返回模拟结果
    return {
      text: `[OCR 功能需要 Tesseract.js 库支持]\n\n图片文件: ${imageFile.name}\n大小: ${this.formatFileSize(imageFile.size)}\n\n请手动输入图片中的文字内容，或者加载 Tesseract.js 库以启用自动识别功能。`,
      confidence: 0,
      words: [],
      lines: [],
      paragraphs: [],
      blocks: []
    };
  }

  /**
   * 预处理图片
   */
  async preprocessImage(imageFile) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // 设置画布大小
        canvas.width = img.width;
        canvas.height = img.height;

        // 绘制图片
        ctx.drawImage(img, 0, 0);

        // 应用图像增强
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const enhancedData = this.enhanceImage(imageData);
        ctx.putImageData(enhancedData, 0, 0);

        // 转换为 Blob
        canvas.toBlob(resolve, 'image/png');
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(imageFile);
    });
  }

  /**
   * 图像增强
   */
  enhanceImage(imageData) {
    const data = imageData.data;
    
    // 简单的对比度和亮度调整
    for (let i = 0; i < data.length; i += 4) {
      // 转换为灰度
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      // 增强对比度
      const enhanced = gray > 128 ? 255 : 0;
      
      data[i] = enhanced;     // R
      data[i + 1] = enhanced; // G
      data[i + 2] = enhanced; // B
      // Alpha 通道保持不变
    }

    return imageData;
  }

  /**
   * 提取结构化文本
   */
  extractStructuredText(ocrResult) {
    if (!ocrResult.text) return '';

    let markdown = '';
    const lines = ocrResult.text.split('\n').filter(line => line.trim());

    // 简单的结构化处理
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed) continue;

      // 检测标题（全大写或特殊格式）
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
        markdown += `\n## ${trimmed}\n\n`;
      }
      // 检测列表项
      else if (/^[-•*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
        markdown += `${trimmed}\n`;
      }
      // 普通段落
      else {
        markdown += `${trimmed}\n\n`;
      }
    }

    return markdown.trim();
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 检查图片格式支持
   */
  isImageSupported(file) {
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff'];
    return supportedTypes.includes(file.type.toLowerCase());
  }

  /**
   * 获取图片信息
   */
  async getImageInfo(imageFile) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          size: imageFile.size,
          type: imageFile.type,
          name: imageFile.name
        });
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(imageFile);
    });
  }

  /**
   * 销毁 OCR 引擎
   */
  async destroy() {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
    this.isInitialized = false;
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages() {
    return this.supportedLanguages.map(lang => ({
      code: lang,
      name: this.getLanguageName(lang)
    }));
  }

  /**
   * 获取语言名称
   */
  getLanguageName(code) {
    const names = {
      'eng': 'English',
      'chi_sim': '简体中文',
      'chi_tra': '繁体中文',
      'jpn': '日语',
      'kor': '韩语',
      'fra': 'Français',
      'deu': 'Deutsch',
      'spa': 'Español',
      'rus': 'Русский'
    };
    return names[code] || code;
  }
}

// 创建全局实例
window.OCRUtils = OCRUtils;

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OCRUtils;
}