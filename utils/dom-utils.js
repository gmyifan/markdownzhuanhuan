/**
 * DOM 操作工具函数
 */

const DOMUtils = {
  /**
   * 安全获取元素
   * @param {string} selector - CSS 选择器
   * @param {HTMLElement} parent - 父元素，默认为 document
   * @returns {HTMLElement|null} 元素或 null
   */
  $(selector, parent = document) {
    try {
      return parent.querySelector(selector);
    } catch (error) {
      console.warn('选择器错误:', selector, error);
      return null;
    }
  },

  /**
   * 安全获取多个元素
   * @param {string} selector - CSS 选择器
   * @param {HTMLElement} parent - 父元素，默认为 document
   * @returns {HTMLElement[]} 元素数组
   */
  $$(selector, parent = document) {
    try {
      return Array.from(parent.querySelectorAll(selector));
    } catch (error) {
      console.warn('选择器错误:', selector, error);
      return [];
    }
  },

  /**
   * 创建元素
   * @param {string} tagName - 标签名
   * @param {Object} attributes - 属性对象
   * @param {string|HTMLElement|HTMLElement[]} children - 子元素
   * @returns {HTMLElement} 创建的元素
   */
  createElement(tagName, attributes = {}, children = null) {
    const element = document.createElement(tagName);

    // 设置属性
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className' || key === 'class') {
        element.className = value;
      } else if (key === 'innerHTML') {
        element.innerHTML = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, value);
      } else if (key in element) {
        element[key] = value;
      } else {
        element.setAttribute(key, value);
      }
    });

    // 添加子元素
    if (children) {
      this.appendChildren(element, children);
    }

    return element;
  },

  /**
   * 添加子元素
   * @param {HTMLElement} parent - 父元素
   * @param {string|HTMLElement|HTMLElement[]} children - 子元素
   */
  appendChildren(parent, children) {
    if (!parent) return;

    if (typeof children === 'string') {
      parent.textContent = children;
    } else if (children instanceof HTMLElement) {
      parent.appendChild(children);
    } else if (Array.isArray(children)) {
      children.forEach(child => {
        if (typeof child === 'string') {
          parent.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
          parent.appendChild(child);
        }
      });
    }
  },

  /**
   * 添加事件监听器
   * @param {HTMLElement|string} element - 元素或选择器
   * @param {string} event - 事件名
   * @param {Function} handler - 事件处理函数
   * @param {Object} options - 选项
   * @returns {Function} 移除监听器的函数
   */
  on(element, event, handler, options = {}) {
    const el = typeof element === 'string' ? this.$(element) : element;
    if (!el) return () => {};

    el.addEventListener(event, handler, options);
    
    return () => {
      el.removeEventListener(event, handler, options);
    };
  },

  /**
   * 移除事件监听器
   * @param {HTMLElement|string} element - 元素或选择器
   * @param {string} event - 事件名
   * @param {Function} handler - 事件处理函数
   */
  off(element, event, handler) {
    const el = typeof element === 'string' ? this.$(element) : element;
    if (el) {
      el.removeEventListener(event, handler);
    }
  },

  /**
   * 事件委托
   * @param {HTMLElement|string} parent - 父元素或选择器
   * @param {string} selector - 子元素选择器
   * @param {string} event - 事件名
   * @param {Function} handler - 事件处理函数
   * @returns {Function} 移除监听器的函数
   */
  delegate(parent, selector, event, handler) {
    const parentEl = typeof parent === 'string' ? this.$(parent) : parent;
    if (!parentEl) return () => {};

    const delegateHandler = (e) => {
      const target = e.target.closest(selector);
      if (target && parentEl.contains(target)) {
        handler.call(target, e);
      }
    };

    parentEl.addEventListener(event, delegateHandler);
    
    return () => {
      parentEl.removeEventListener(event, delegateHandler);
    };
  },

  /**
   * 添加 CSS 类
   * @param {HTMLElement|string} element - 元素或选择器
   * @param {string|string[]} classes - 类名
   */
  addClass(element, classes) {
    const el = typeof element === 'string' ? this.$(element) : element;
    if (!el) return;

    const classArray = Array.isArray(classes) ? classes : [classes];
    el.classList.add(...classArray);
  },

  /**
   * 移除 CSS 类
   * @param {HTMLElement|string} element - 元素或选择器
   * @param {string|string[]} classes - 类名
   */
  removeClass(element, classes) {
    const el = typeof element === 'string' ? this.$(element) : element;
    if (!el) return;

    const classArray = Array.isArray(classes) ? classes : [classes];
    el.classList.remove(...classArray);
  },

  /**
   * 切换 CSS 类
   * @param {HTMLElement|string} element - 元素或选择器
   * @param {string} className - 类名
   * @param {boolean} force - 强制添加或移除
   * @returns {boolean} 是否包含该类
   */
  toggleClass(element, className, force) {
    const el = typeof element === 'string' ? this.$(element) : element;
    if (!el) return false;

    return el.classList.toggle(className, force);
  },

  /**
   * 检查是否包含 CSS 类
   * @param {HTMLElement|string} element - 元素或选择器
   * @param {string} className - 类名
   * @returns {boolean} 是否包含
   */
  hasClass(element, className) {
    const el = typeof element === 'string' ? this.$(element) : element;
    return el ? el.classList.contains(className) : false;
  },

  /**
   * 设置元素样式
   * @param {HTMLElement|string} element - 元素或选择器
   * @param {Object|string} styles - 样式对象或样式名
   * @param {string} value - 样式值（当 styles 为字符串时）
   */
  setStyle(element, styles, value) {
    const el = typeof element === 'string' ? this.$(element) : element;
    if (!el) return;

    if (typeof styles === 'string') {
      el.style[styles] = value;
    } else if (typeof styles === 'object') {
      Object.entries(styles).forEach(([key, val]) => {
        el.style[key] = val;
      });
    }
  },

  /**
   * 获取元素样式
   * @param {HTMLElement|string} element - 元素或选择器
   * @param {string} property - 样式属性
   * @returns {string} 样式值
   */
  getStyle(element, property) {
    const el = typeof element === 'string' ? this.$(element) : element;
    if (!el) return '';

    return window.getComputedStyle(el)[property];
  },

  /**
   * 显示元素
   * @param {HTMLElement|string} element - 元素或选择器
   * @param {string} display - 显示方式，默认为 'block'
   */
  show(element, display = 'block') {
    this.setStyle(element, 'display', display);
  },

  /**
   * 隐藏元素
   * @param {HTMLElement|string} element - 元素或选择器
   */
  hide(element) {
    this.setStyle(element, 'display', 'none');
  },

  /**
   * 切换元素显示/隐藏
   * @param {HTMLElement|string} element - 元素或选择器
   * @param {string} display - 显示方式，默认为 'block'
   */
  toggle(element, display = 'block') {
    const el = typeof element === 'string' ? this.$(element) : element;
    if (!el) return;

    const currentDisplay = this.getStyle(el, 'display');
    if (currentDisplay === 'none') {
      this.show(el, display);
    } else {
      this.hide(el);
    }
  },

  /**
   * 获取元素位置和尺寸
   * @param {HTMLElement|string} element - 元素或选择器
   * @returns {DOMRect|null} 位置和尺寸信息
   */
  getBounds(element) {
    const el = typeof element === 'string' ? this.$(element) : element;
    return el ? el.getBoundingClientRect() : null;
  },

  /**
   * 滚动到元素
   * @param {HTMLElement|string} element - 元素或选择器
   * @param {Object} options - 滚动选项
   */
  scrollTo(element, options = {}) {
    const el = typeof element === 'string' ? this.$(element) : element;
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
        ...options
      });
    }
  },

  /**
   * 防抖函数
   * @param {Function} func - 要防抖的函数
   * @param {number} wait - 等待时间（毫秒）
   * @param {boolean} immediate - 是否立即执行
   * @returns {Function} 防抖后的函数
   */
  debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(this, args);
    };
  },

  /**
   * 节流函数
   * @param {Function} func - 要节流的函数
   * @param {number} limit - 限制时间（毫秒）
   * @returns {Function} 节流后的函数
   */
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * 等待 DOM 就绪
   * @param {Function} callback - 回调函数
   */
  ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  },

  /**
   * 创建模态框
   * @param {Object} options - 选项
   * @returns {HTMLElement} 模态框元素
   */
  createModal(options = {}) {
    const {
      title = '提示',
      content = '',
      showClose = true,
      className = '',
      onClose = null
    } = options;

    const modal = this.createElement('div', {
      className: `modal-overlay ${className}`,
      innerHTML: `
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            ${showClose ? '<button class="modal-close">&times;</button>' : ''}
          </div>
          <div class="modal-body">
            ${content}
          </div>
        </div>
      `
    });

    // 绑定关闭事件
    if (showClose) {
      this.on(modal, 'click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal-close')) {
          this.closeModal(modal);
          if (onClose) onClose();
        }
      });
    }

    return modal;
  },

  /**
   * 显示模态框
   * @param {HTMLElement} modal - 模态框元素
   */
  showModal(modal) {
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
  },

  /**
   * 关闭模态框
   * @param {HTMLElement} modal - 模态框元素
   */
  closeModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }
};

// 导出工具
window.DOMUtils = DOMUtils;