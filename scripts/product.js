// 产品页面主要功能
class ProductPage {
    constructor() {
        this.fileProcessor = null;
        this.conversionManager = null;
        this.currentFiles = [];
        this.currentResults = {};
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeModules();
        this.setupFileUpload();
        this.setupTabs();
    }

    // 初始化模块
    async initializeModules() {
        try {
            // 等待依赖库加载
            await this.waitForDependencies();
            
            // 初始化文件处理器
            if (window.FileProcessor) {
                this.fileProcessor = new window.FileProcessor();
                this.fileProcessor.init();
                console.log('FileProcessor 初始化成功');
            }
            
            // 初始化转换管理器
            if (window.ConversionManager) {
                this.conversionManager = new window.ConversionManager();
                console.log('ConversionManager 初始化成功');
            }
            
        } catch (error) {
            console.error('模块初始化失败:', error);
            this.showError('系统初始化失败，请刷新页面重试');
        }
    }

    // 等待依赖库加载
    waitForDependencies() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkDependencies = () => {
                attempts++;
                
                const hasBasicDeps = window.mammoth && (window.TurndownService || window.Turndown);
                
                if (hasBasicDeps) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('依赖库加载超时'));
                } else {
                    setTimeout(checkDependencies, 100);
                }
            };
            
            checkDependencies();
        });
    }

    // 设置事件监听器
    setupEventListeners() {
        // 导航菜单
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-link')) {
                e.preventDefault();
                const target = e.target.getAttribute('href');
                this.scrollToSection(target);
            }
        });



        // 响应式导航
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }
    }

    // 设置文件上传
    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        if (!uploadArea || !fileInput) return;

        // 点击上传区域
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // 文件选择
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // 拖拽上传
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
    }

    // 设置标签页
    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                
                // 更新按钮状态
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // 更新内容显示
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${targetTab}-tab`) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    // 处理文件
    async handleFiles(files) {
        if (!files || files.length === 0) return;

        this.currentFiles = Array.from(files);
        
        // 验证文件
        const validFiles = this.validateFiles(this.currentFiles);
        if (validFiles.length === 0) {
            this.showError('请选择支持的文件格式：Word (.doc, .docx)、PDF (.pdf)、图片 (.png, .jpg, .jpeg)');
            return;
        }

        // 显示转换状态
        this.showConversionStatus();
        this.displayFileList(validFiles);

        // 开始转换
        await this.startConversion(validFiles);
    }

    // 验证文件
    validateFiles(files) {
        const supportedTypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/msword', // .doc
            'application/pdf', // .pdf
            'image/png',
            'image/jpeg',
            'image/jpg'
        ];

        const supportedExtensions = ['.doc', '.docx', '.pdf', '.png', '.jpg', '.jpeg'];

        return files.filter(file => {
            const hasValidType = supportedTypes.includes(file.type);
            const hasValidExtension = supportedExtensions.some(ext => 
                file.name.toLowerCase().endsWith(ext)
            );
            return hasValidType || hasValidExtension;
        });
    }

    // 显示转换状态
    showConversionStatus() {
        const uploadArea = document.getElementById('uploadArea');
        const conversionStatus = document.getElementById('conversionStatus');
        
        if (uploadArea) uploadArea.style.display = 'none';
        if (conversionStatus) conversionStatus.style.display = 'block';
    }

    // 显示文件列表
    displayFileList(files) {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        fileList.innerHTML = files.map((file, index) => `
            <div class="file-item" id="file-${index}">
                <div class="file-info">
                    <i class="fas fa-file"></i>
                    <span>${file.name}</span>
                    <span class="file-size">(${this.formatFileSize(file.size)})</span>
                </div>
                <div class="file-status status-processing">处理中...</div>
            </div>
        `).join('');
    }

    // 开始转换
    async startConversion(files) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        let completedFiles = 0;
        const totalFiles = files.length;
        let allResults = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileItem = document.getElementById(`file-${i}`);
            const statusElement = fileItem?.querySelector('.file-status');

            try {
                // 更新文件状态
                if (statusElement) {
                    statusElement.textContent = '转换中...';
                    statusElement.className = 'file-status status-processing';
                }

                // 执行转换
                const result = await this.convertFile(file);
                allResults.push(result);

                // 更新成功状态
                if (statusElement) {
                    statusElement.textContent = '完成';
                    statusElement.className = 'file-status status-completed';
                }

            } catch (error) {
                console.error(`文件 ${file.name} 转换失败:`, error);
                
                // 更新错误状态
                if (statusElement) {
                    statusElement.textContent = '失败';
                    statusElement.className = 'file-status status-error';
                }
            }

            // 更新进度
            completedFiles++;
            const progress = (completedFiles / totalFiles) * 100;
            
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `${Math.round(progress)}%`;
        }

        // 显示结果
        this.showResults(allResults);
    }

    // 转换单个文件
    async convertFile(file) {
        const fileExtension = file.name.toLowerCase().split('.').pop();
        
        switch (fileExtension) {
            case 'docx':
            case 'doc':
                return await this.convertWordFile(file);
            case 'pdf':
                return await this.convertPdfFile(file);
            case 'png':
            case 'jpg':
            case 'jpeg':
                return await this.convertImageFile(file);
            default:
                throw new Error(`不支持的文件格式: ${fileExtension}`);
        }
    }

    // 转换 Word 文件
    async convertWordFile(file) {
        if (!window.WordConverter) {
            throw new Error('WordConverter 模块未加载，请刷新页面重试');
        }

        try {
            // 验证文件格式
            const validExtensions = ['.doc', '.docx'];
            const fileExtension = '.' + file.name.toLowerCase().split('.').pop();
            if (!validExtensions.includes(fileExtension)) {
                throw new Error('请选择有效的Word文档文件(.doc或.docx)');
            }

            // 检查文件大小 (限制50MB)
            if (file.size > 50 * 1024 * 1024) {
                throw new Error('Word文件过大，请选择小于50MB的文件');
            }

            console.log(`开始转换Word文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

            // 检查WordConverter依赖
            const deps = window.WordConverter.checkDependencies();
            if (!deps.mammoth || !deps.turndown) {
                throw new Error('Word转换依赖库未完全加载，请刷新页面重试');
            }

            // 执行转换 - 直接传递file对象，让WordConverter内部处理
            const markdown = await window.WordConverter.convertDocxToMarkdown(file);
            
            console.log(`Word转换完成: ${file.name}`);
            
            // 检查转换结果
            if (!markdown || typeof markdown !== 'string') {
                throw new Error('Word转换返回了空的结果');
            }
            
            return {
                fileName: file.name,
                type: 'word',
                markdown: markdown,
                html: this.markdownToHtml(markdown),
                success: true
            };
        } catch (error) {
            console.error('Word转换失败:', error);
            
            // 提供更友好的错误信息
            let errorMessage = 'Word文件转换失败';
            if (error.message.includes('not supported')) {
                errorMessage = '不支持的Word文档格式，请使用.docx格式';
            } else if (error.message.includes('corrupted') || error.message.includes('Invalid')) {
                errorMessage = 'Word文档文件损坏或格式不正确';
            } else if (error.message.includes('依赖库')) {
                errorMessage = 'Word转换库未加载，请刷新页面重试';
            } else {
                errorMessage = `Word文件转换失败: ${error.message}`;
            }
            
            throw new Error(errorMessage);
        }
    }

    // 读取文件为ArrayBuffer的辅助方法
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    // 转换 PDF 文件
    async convertPdfFile(file) {
        // 检查 PdfConverter 模块
        if (!window.PdfConverter) {
            throw new Error('PDF转换模块未加载，请刷新页面重试');
        }

        // 检查 PDF.js 库
        if (!window.pdfjsLib) {
            throw new Error('PDF处理库未加载，请检查网络连接');
        }

        try {
            // 验证文件格式
            if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
                throw new Error('请选择有效的PDF文件');
            }

            // 检查文件大小 (限制50MB)
            if (file.size > 50 * 1024 * 1024) {
                throw new Error('PDF文件过大，请选择小于50MB的文件');
            }

            console.log(`开始转换PDF文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

            // 创建转换器实例
            const converter = new window.PdfConverter();
            
            // 执行转换，传入进度回调
            const result = await converter.convertPdfToMarkdown(file, (progress) => {
                console.log(`PDF转换进度: ${progress}%`);
            });
            
            console.log(`PDF转换完成: ${result.totalPages || 0} 页`);
            
            return {
                fileName: file.name,
                type: 'pdf',
                markdown: result.markdown,
                html: result.html || this.markdownToHtml(result.markdown),
                success: true,
                pages: result.totalPages || 0,
                metadata: result.metadata || {}
            };
        } catch (error) {
            console.error('PDF转换失败:', error);
            
            // 提供更友好的错误信息
            let errorMessage = 'PDF转换失败';
            if (error.message.includes('Invalid PDF')) {
                errorMessage = 'PDF文件损坏或格式不正确';
            } else if (error.message.includes('password')) {
                errorMessage = '不支持加密的PDF文件';
            } else if (error.message.includes('network') || error.message.includes('加载')) {
                errorMessage = 'PDF处理库加载失败，请检查网络连接并刷新页面';
            } else {
                errorMessage = `PDF转换失败: ${error.message}`;
            }
            
            throw new Error(errorMessage);
        }
    }

    // 转换图片文件
    async convertImageFile(file) {
        if (!window.ImageConverter) {
            throw new Error('ImageConverter 模块未加载');
        }

        try {
            const result = await window.ImageConverter.convertImageToMarkdown(file);
            
            return {
                fileName: file.name,
                type: 'image',
                markdown: result.markdown,
                html: result.html || this.markdownToHtml(result.markdown),
                success: true
            };
        } catch (error) {
            throw new Error(`图片文件转换失败: ${error.message}`);
        }
    }

    // Markdown 转 HTML
    markdownToHtml(markdown) {
        if (window.marked) {
            return window.marked.parse(markdown);
        }
        
        // 简单的 Markdown 转 HTML（备用方案）
        return markdown
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/\n/gim, '<br>');
    }

    // 显示结果
    showResults(results) {
        const conversionStatus = document.getElementById('conversionStatus');
        const resultsArea = document.getElementById('resultsArea');
        
        if (conversionStatus) conversionStatus.style.display = 'none';
        if (resultsArea) resultsArea.style.display = 'block';

        // 合并所有结果
        const combinedMarkdown = results
            .filter(r => r.success)
            .map(r => `# ${r.fileName}\n\n${r.markdown}`)
            .join('\n\n---\n\n');

        const combinedHtml = results
            .filter(r => r.success)
            .map(r => r.html)
            .join('<hr>');

        // 更新显示内容
        this.currentResults = {
            markdown: combinedMarkdown,
            html: combinedHtml
        };

        this.updateResultsDisplay();
    }

    // 更新结果显示
    updateResultsDisplay() {
        const markdownPreview = document.getElementById('markdownPreview');
        const markdownEditor = document.getElementById('markdownEditor');
        const htmlEditor = document.getElementById('htmlEditor');

        if (markdownPreview) {
            markdownPreview.innerHTML = this.currentResults.html;
        }

        if (markdownEditor) {
            markdownEditor.value = this.currentResults.markdown;
        }

        if (htmlEditor) {
            htmlEditor.value = this.currentResults.html;
        }
    }

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 滚动到指定区域
    scrollToSection(target) {
        const element = document.querySelector(target);
        if (element) {
            const offsetTop = element.offsetTop - 70; // 考虑导航栏高度
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }



    // 显示成功消息
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    // 显示错误消息
    showError(message) {
        this.showNotification(message, 'error');
    }

    // 显示通知
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;

        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
            border-radius: 8px;
            padding: 15px 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;

        // 添加到页面
        document.body.appendChild(notification);

        // 关闭按钮事件
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        // 自动关闭
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// 全局函数
window.scrollToConverter = function() {
    const converterSection = document.getElementById('converter');
    if (converterSection) {
        const offsetTop = converterSection.offsetTop - 70;
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }
};



window.downloadMarkdown = function() {
    if (window.productPage && window.productPage.currentResults) {
        const markdown = window.productPage.currentResults.markdown;
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'converted-document.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.productPage.showSuccess('Markdown 文件已下载！');
    }
};

window.copyToClipboard = function() {
    if (window.productPage && window.productPage.currentResults) {
        const markdown = window.productPage.currentResults.markdown;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(markdown).then(() => {
                window.productPage.showSuccess('内容已复制到剪贴板！');
            }).catch(() => {
                window.productPage.showError('复制失败，请手动选择文本复制');
            });
        } else {
            // 备用方案
            const textArea = document.createElement('textarea');
            textArea.value = markdown;
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                window.productPage.showSuccess('内容已复制到剪贴板！');
            } catch (err) {
                window.productPage.showError('复制失败，请手动选择文本复制');
            }
            
            document.body.removeChild(textArea);
        }
    }
};

window.resetConverter = function() {
    const uploadArea = document.getElementById('uploadArea');
    const conversionStatus = document.getElementById('conversionStatus');
    const resultsArea = document.getElementById('resultsArea');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadArea) uploadArea.style.display = 'block';
    if (conversionStatus) conversionStatus.style.display = 'none';
    if (resultsArea) resultsArea.style.display = 'none';
    if (fileInput) fileInput.value = '';
    
    if (window.productPage) {
        window.productPage.currentFiles = [];
        window.productPage.currentResults = {};
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.productPage = new ProductPage();
    
    // 添加 CSS 动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .notification-close {
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            margin-left: 10px;
            opacity: 0.7;
        }
        
        .notification-close:hover {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
});