/**
 * 文件处理工具函数
 */

const FileUtils = {
  /**
   * 读取文件为文本
   * @param {File} file - 文件对象
   * @returns {Promise<string>} 文件内容
   */
  readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onabort = () => reject(new Error('读取被取消'));
      reader.onload = () => resolve(reader.result);
      reader.readAsText(file);
    });
  },

  /**
   * 读取文件为 ArrayBuffer
   * @param {File} file - 文件对象
   * @returns {Promise<ArrayBuffer>} 文件内容
   */
  readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onabort = () => reject(new Error('读取被取消'));
      reader.onload = () => resolve(reader.result);
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * 读取文件为 Data URL
   * @param {File} file - 文件对象
   * @returns {Promise<string>} Data URL
   */
  readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onabort = () => reject(new Error('读取被取消'));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  },

  /**
   * 读取图片文件并获取尺寸信息
   * @param {File} file - 图片文件
   * @returns {Promise<Object>} 图片信息
   */
  readImageInfo(file) {
    return new Promise((resolve, reject) => {
      if (!this.isImageFile(file)) {
        reject(new Error('不是有效的图片文件'));
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.width,
          height: img.height,
          size: file.size,
          type: file.type,
          name: file.name,
          aspectRatio: img.width / img.height
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片加载失败'));
      };

      img.src = url;
    });
  },

  /**
   * 下载文件
   * @param {string} content - 文件内容
   * @param {string} filename - 文件名
   * @param {string} contentType - MIME 类型
   */
  download(content, filename, contentType = 'text/plain') {
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
  },

  /**
   * 验证文件类型
   * @param {File} file - 文件对象
   * @param {string[]} allowedTypes - 允许的文件类型
   * @returns {boolean} 是否有效
   */
  validateFileType(file, allowedTypes) {
    if (!file || !allowedTypes || allowedTypes.length === 0) {
      return false;
    }

    const fileName = file.name.toLowerCase();
    return allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileName.endsWith(type.toLowerCase());
      }
      return file.type === type;
    });
  },

  /**
   * 验证文件大小
   * @param {File} file - 文件对象
   * @param {number} maxSizeInMB - 最大大小（MB）
   * @returns {boolean} 是否有效
   */
  validateFileSize(file, maxSizeInMB) {
    if (!file || !maxSizeInMB) {
      return false;
    }

    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
  },

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * 获取文件扩展名
   * @param {string} filename - 文件名
   * @returns {string} 扩展名（包含点）
   */
  getFileExtension(filename) {
    if (!filename) return '';
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
  },

  /**
   * 获取文件基础名（不含扩展名）
   * @param {string} filename - 文件名
   * @returns {string} 基础名
   */
  getBaseName(filename) {
    if (!filename) return '';
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  },

  /**
   * 生成唯一文件名
   * @param {string} baseName - 基础文件名
   * @param {string} extension - 扩展名
   * @returns {string} 唯一文件名
   */
  generateUniqueFilename(baseName, extension) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${baseName}-${timestamp}${extension}`;
  },

  /**
   * 创建文件选择器
   * @param {Object} options - 选项
   * @param {string[]} options.accept - 接受的文件类型
   * @param {boolean} options.multiple - 是否多选
   * @param {Function} options.onSelect - 选择回调
   */
  createFileSelector(options = {}) {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';

    if (options.accept) {
      input.accept = options.accept.join(',');
    }

    if (options.multiple) {
      input.multiple = true;
    }

    input.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (options.onSelect) {
        options.onSelect(files);
      }
      // 清除选择，允许重复选择同一文件
      input.value = '';
    });

    return input;
  },

  /**
   * 拖拽上传处理器
   * @param {HTMLElement} element - 拖拽目标元素
   * @param {Object} options - 选项
   * @param {Function} options.onDrop - 拖拽回调
   * @param {string[]} options.accept - 接受的文件类型
   */
  setupDragAndDrop(element, options = {}) {
    if (!element) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.add('drag-over');
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.remove('drag-over');
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.remove('drag-over');

      const files = Array.from(e.dataTransfer.files);
      
      // 过滤文件类型
      let validFiles = files;
      if (options.accept) {
        validFiles = files.filter(file => 
          this.validateFileType(file, options.accept)
        );
      }

      if (options.onDrop && validFiles.length > 0) {
        options.onDrop(validFiles);
      }
    };

    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('dragenter', handleDragOver);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('drop', handleDrop);

    // 返回清理函数
    return () => {
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragenter', handleDragOver);
      element.removeEventListener('dragleave', handleDragLeave);
      element.removeEventListener('drop', handleDrop);
    };
  },

  /**
   * 检查是否为图片文件
   * @param {File} file - 文件对象
   * @returns {boolean} 是否为图片
   */
  isImageFile(file) {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff'];
    return imageTypes.includes(file.type.toLowerCase());
  },

  /**
   * 检查是否为 PDF 文件
   * @param {File} file - 文件对象
   * @returns {boolean} 是否为 PDF
   */
  isPDFFile(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  },

  /**
   * 检查是否为 Word 文件
   * @param {File} file - 文件对象
   * @returns {boolean} 是否为 Word 文档
   */
  isWordFile(file) {
    const wordTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const wordExtensions = ['.doc', '.docx'];
    
    return wordTypes.includes(file.type) || 
           wordExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  },

  /**
   * 获取文件类型分类
   * @param {File} file - 文件对象
   * @returns {string} 文件类型分类
   */
  getFileCategory(file) {
    if (this.isImageFile(file)) return 'image';
    if (this.isPDFFile(file)) return 'pdf';
    if (this.isWordFile(file)) return 'document';
    return 'unknown';
  },

  /**
   * 获取文件图标
   * @param {File} file - 文件对象
   * @returns {string} 图标类名或 emoji
   */
  getFileIcon(file) {
    const category = this.getFileCategory(file);
    const icons = {
      'image': '🖼️',
      'pdf': '📑',
      'document': '📄',
      'unknown': '📎'
    };
    return icons[category] || icons.unknown;
  },

  /**
   * 批量处理文件
   * @param {File[]} files - 文件数组
   * @param {Function} processor - 处理函数
   * @param {Object} options - 选项
   * @returns {Promise<Array>} 处理结果
   */
  async batchProcess(files, processor, options = {}) {
    const { 
      concurrency = 3, 
      onProgress = null,
      onError = null 
    } = options;

    const results = [];
    const errors = [];
    let completed = 0;

    // 分批处理
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const batchPromises = batch.map(async (file, index) => {
        try {
          const result = await processor(file, i + index);
          completed++;
          
          if (onProgress) {
            onProgress({
              completed,
              total: files.length,
              progress: completed / files.length,
              currentFile: file.name
            });
          }
          
          return { success: true, result, file };
        } catch (error) {
          completed++;
          errors.push({ file, error });
          
          if (onError) {
            onError(error, file);
          }
          
          if (onProgress) {
            onProgress({
              completed,
              total: files.length,
              progress: completed / files.length,
              currentFile: file.name,
              error: true
            });
          }
          
          return { success: false, error, file };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return {
      results: results.filter(r => r.success).map(r => r.result),
      errors,
      total: files.length,
      successful: results.filter(r => r.success).length,
      failed: errors.length
    };
  },

  /**
   * 压缩图片
   * @param {File} file - 图片文件
   * @param {Object} options - 压缩选项
   * @returns {Promise<Blob>} 压缩后的图片
   */
  compressImage(file, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 0.8,
        type = 'image/jpeg'
      } = options;

      if (!this.isImageFile(file)) {
        reject(new Error('不是有效的图片文件'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // 计算新尺寸
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // 设置画布尺寸
        canvas.width = width;
        canvas.height = height;

        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height);

        // 转换为 Blob
        canvas.toBlob(resolve, type, quality);
      };

      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = URL.createObjectURL(file);
    });
  },

  /**
   * 检测文件编码
   * @param {File} file - 文件对象
   * @returns {Promise<string>} 编码类型
   */
  async detectEncoding(file) {
    const buffer = await this.readAsArrayBuffer(file);
    const bytes = new Uint8Array(buffer.slice(0, 1024)); // 读取前1KB

    // 检测 BOM
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return 'utf-8';
    }
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return 'utf-16le';
    }
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return 'utf-16be';
    }

    // 简单的 UTF-8 检测
    let isUTF8 = true;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] > 127) {
        isUTF8 = false;
        break;
      }
    }

    return isUTF8 ? 'utf-8' : 'unknown';
  },

  /**
   * 创建文件预览
   * @param {File} file - 文件对象
   * @returns {Promise<string>} 预览 URL
   */
  createPreview(file) {
    if (this.isImageFile(file)) {
      return Promise.resolve(URL.createObjectURL(file));
    }
    
    // 其他文件类型返回默认图标
    return Promise.resolve(null);
  },

  /**
   * 清理预览 URL
   * @param {string} url - 预览 URL
   */
  revokePreview(url) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
};

// 导出工具
window.FileUtils = FileUtils;