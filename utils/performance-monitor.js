/**
 * 性能监控工具
 * 用于监控应用性能和用户体验指标
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      userActions: []
    };
    this.isEnabled = true;
  }

  /**
   * 初始化性能监控
   */
  init() {
    if (!this.isEnabled) return;

    this.measureLoadTime();
    this.setupMemoryMonitoring();
    this.setupUserActionTracking();
    this.setupErrorTracking();
  }

  /**
   * 测量页面加载时间
   */
  measureLoadTime() {
    if (typeof performance !== 'undefined' && performance.timing) {
      window.addEventListener('load', () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        this.metrics.loadTime = loadTime;
        console.log(`页面加载时间: ${loadTime}ms`);
      });
    }
  }

  /**
   * 设置内存监控
   */
  setupMemoryMonitoring() {
    if (typeof performance !== 'undefined' && performance.memory) {
      setInterval(() => {
        const memory = performance.memory;
        this.metrics.memoryUsage = {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        };
      }, 30000); // 每30秒检查一次
    }
  }

  /**
   * 设置用户行为追踪
   */
  setupUserActionTracking() {
    // 追踪按钮点击
    document.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.classList.contains('btn')) {
        this.trackUserAction('click', {
          element: e.target.textContent || e.target.id,
          timestamp: Date.now()
        });
      }
    });

    // 追踪文件操作
    document.addEventListener('fileProcessed', (e) => {
      this.trackUserAction('file_processed', {
        type: e.detail.type,
        size: e.detail.size,
        duration: e.detail.duration,
        timestamp: Date.now()
      });
    });

    // 追踪模式切换
    document.addEventListener('modeSwitch', (e) => {
      this.trackUserAction('mode_switch', {
        from: e.detail.from,
        to: e.detail.to,
        timestamp: Date.now()
      });
    });
  }

  /**
   * 设置错误追踪
   */
  setupErrorTracking() {
    window.addEventListener('error', (e) => {
      this.trackError({
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        timestamp: Date.now()
      });
    });

    window.addEventListener('unhandledrejection', (e) => {
      this.trackError({
        message: 'Unhandled Promise Rejection',
        reason: e.reason,
        timestamp: Date.now()
      });
    });
  }

  /**
   * 追踪用户行为
   */
  trackUserAction(action, data) {
    this.metrics.userActions.push({
      action,
      data,
      timestamp: Date.now()
    });

    // 保持最近100个行为记录
    if (this.metrics.userActions.length > 100) {
      this.metrics.userActions.shift();
    }
  }

  /**
   * 追踪错误
   */
  trackError(error) {
    console.error('应用错误:', error);
    
    // 可以在这里发送错误到监控服务
    if (this.shouldReportError(error)) {
      this.reportError(error);
    }
  }

  /**
   * 判断是否应该报告错误
   */
  shouldReportError(error) {
    // 过滤掉一些常见的无关紧要的错误
    const ignoredErrors = [
      'Script error',
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded'
    ];

    return !ignoredErrors.some(ignored => 
      error.message && error.message.includes(ignored)
    );
  }

  /**
   * 报告错误（可以发送到监控服务）
   */
  reportError(error) {
    // 这里可以集成第三方错误监控服务
    // 比如 Sentry, LogRocket 等
    console.log('错误已记录:', error);
  }

  /**
   * 测量函数执行时间
   */
  measureFunction(name, fn) {
    return (...args) => {
      const start = performance.now();
      const result = fn.apply(this, args);
      const end = performance.now();
      
      console.log(`${name} 执行时间: ${(end - start).toFixed(2)}ms`);
      
      return result;
    };
  }

  /**
   * 测量异步函数执行时间
   */
  measureAsyncFunction(name, fn) {
    return async (...args) => {
      const start = performance.now();
      const result = await fn.apply(this, args);
      const end = performance.now();
      
      console.log(`${name} 执行时间: ${(end - start).toFixed(2)}ms`);
      
      return result;
    };
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    const report = {
      ...this.metrics,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    // 添加 Web Vitals 指标（如果可用）
    if (typeof performance !== 'undefined' && performance.getEntriesByType) {
      const paintEntries = performance.getEntriesByType('paint');
      report.webVitals = {};
      
      paintEntries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          report.webVitals.fcp = entry.startTime;
        }
        if (entry.name === 'largest-contentful-paint') {
          report.webVitals.lcp = entry.startTime;
        }
      });
    }

    return report;
  }

  /**
   * 优化建议
   */
  getOptimizationSuggestions() {
    const suggestions = [];
    const report = this.getPerformanceReport();

    // 检查加载时间
    if (report.loadTime > 3000) {
      suggestions.push({
        type: 'performance',
        message: '页面加载时间较长，建议优化资源加载',
        priority: 'high'
      });
    }

    // 检查内存使用
    if (report.memoryUsage && report.memoryUsage.used > 50) {
      suggestions.push({
        type: 'memory',
        message: '内存使用较高，建议检查内存泄漏',
        priority: 'medium'
      });
    }

    // 检查错误频率
    const recentErrors = report.userActions.filter(
      action => action.action === 'error' && 
      Date.now() - action.timestamp < 300000 // 最近5分钟
    );

    if (recentErrors.length > 5) {
      suggestions.push({
        type: 'stability',
        message: '错误频率较高，建议检查代码稳定性',
        priority: 'high'
      });
    }

    return suggestions;
  }

  /**
   * 启用/禁用监控
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (enabled) {
      this.init();
    }
  }

  /**
   * 清除监控数据
   */
  clearMetrics() {
    this.metrics = {
      loadTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      userActions: []
    };
  }
}

// 创建全局实例
window.PerformanceMonitor = PerformanceMonitor;

// 自动初始化
if (typeof window !== 'undefined') {
  window.performanceMonitor = new PerformanceMonitor();
  
  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.performanceMonitor.init();
    });
  } else {
    window.performanceMonitor.init();
  }
}