/**
 * OCR Worker
 * 在后台线程中处理图片 OCR 识别任务
 */

// 导入 Tesseract.js
importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js');

class OCRWorker {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.defaultLanguage = 'eng+chi_sim';
  }

  /**
   * 初始化 OCR Worker
   */
  async init() {
    if (this.isInitialized) return;

    try {
      this.worker = await Tesseract.createWorker();
      await this.worker.loadLanguage(this.defaultLanguage);
      await this.worker.initialize(this.defaultLanguage);
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
   * 执行 OCR 识别
   */
  async recognize(imageData, options = {}) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const result = await this.worker.recognize(imageData, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.postMessage({
              type: 'progress',
              progress: m.progress,
              status: m.status
            });
          }
        }
      });

      this.postMessage({
        type: 'recognition-complete',
        result: {
          text: result.data.text,
          confidence: result.data.confidence,
          words: result.data.words,
          lines: result.data.lines,
          paragraphs: result.data.paragraphs
        }
      });

    } catch (error) {
      this.postMessage({
        type: 'recognition-error',
        error: error.message
      });
    }
  }

  /**
   * 设置识别语言
   */
  async setLanguage(language) {
    try {
      if (this.worker) {
        await this.worker.loadLanguage(language);
        await this.worker.initialize(language);
      }
      
      this.postMessage({
        type: 'language-set',
        language: language
      });
    } catch (error) {
      this.postMessage({
        type: 'language-error',
        error: error.message
      });
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
  async destroy() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
  }
}

// 创建 OCR Worker 实例
const ocrWorker = new OCRWorker();

// 监听主线程消息
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'init':
      await ocrWorker.init();
      break;

    case 'recognize':
      await ocrWorker.recognize(data.imageData, data.options);
      break;

    case 'set-language':
      await ocrWorker.setLanguage(data.language);
      break;

    case 'destroy':
      await ocrWorker.destroy();
      break;

    default:
      ocrWorker.postMessage({
        type: 'error',
        error: `Unknown message type: ${type}`
      });
  }
});

// 错误处理
self.addEventListener('error', (error) => {
  ocrWorker.postMessage({
    type: 'worker-error',
    error: error.message
  });
});

// 未捕获的 Promise 错误
self.addEventListener('unhandledrejection', (event) => {
  ocrWorker.postMessage({
    type: 'worker-error',
    error: event.reason.message || 'Unhandled promise rejection'
  });
});