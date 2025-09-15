# Markdown 转换器 v0.1.5

🚀 **专业的文档转换工具** - 支持 Word、PDF、图片等多种格式一键转换为 Markdown

## ✨ 功能特性

- 📝 **Word 转换**: 支持 .docx 格式，保持原有格式和结构
- 📄 **PDF 转换**: 智能提取 PDF 文本内容转为 Markdown
- 🖼️ **图片 OCR**: 使用 AI 识别图片中的文字并转换
- 🎯 **拖拽上传**: 简单易用的拖拽界面
- 🔒 **隐私保护**: 所有转换在本地完成，不上传任何文件
- 📱 **响应式设计**: 完美支持桌面和移动设备
- ⚡ **快速转换**: 纯前端实现，无需等待服务器处理

## 🎨 界面预览

v0.1.5 版本采用精简设计，专注于核心转换功能：

```
┌─────────────────────────────────────────────────────────────┐
│                    Markdown 转换器                           │
│              专业免费文档转换工具                             │
└─────────────────────────────────────────────────────────────┘
│ 导航: [功能特色] [在线转换]                                  │
└─────────────────────────────────────────────────────────────┘
│ 🎯 英雄区域: 专业的 Markdown 转换工具                        │
│    支持多种格式，一键转换 [立即开始]                         │
└─────────────────────────────────────────────────────────────┘
│ ⭐ 功能特色: Word转换 | PDF处理 | OCR识别                    │
│             批量处理 | 隐私保护 | 多格式导出                 │
└─────────────────────────────────────────────────────────────┘
│ 🔧 在线转换器: 拖拽上传 → 转换处理 → 结果下载               │
└─────────────────────────────────────────────────────────────┘
│ 📄 页脚: © 2024 Markdown转换器 | 隐私政策 | 使用条款        │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 在线使用
1. 打开 `product.html` 文件
2. 拖拽或选择要转换的文件
3. 等待转换完成
4. 下载 Markdown 文件

### 本地部署
```bash
# 克隆项目
git clone https://github.com/gmyifan/markdownzhuanhuan.git

# 进入项目目录
cd markdownzhuanhuan

# 启动本地服务器
python3 -m http.server 8080

# 访问 http://localhost:8080/product.html
```

## 🔧 技术架构

### 核心技术栈
- **前端框架**: 纯 HTML5 + CSS3 + JavaScript ES6+
- **Word 转换**: mammoth.js - 解析 .docx 文件
- **PDF 处理**: pdf.js - 提取 PDF 文本内容  
- **OCR 识别**: tesseract.js - 图片文字识别
- **Markdown 生成**: turndown.js - HTML 转 Markdown
- **UI 框架**: 现代 CSS Grid/Flexbox 布局

### 项目结构
```
markdownzhuanhuan/
├── product.html          # 主页面 (v0.1.5)
├── prd.md               # 产品需求文档
├── README.md            # 项目说明
├── modules/             # 核心转换模块
│   ├── word-converter.js    # Word 转换器
│   ├── pdf-converter.js     # PDF 转换器
│   ├── image-converter.js   # 图片 OCR 转换器
│   ├── file-processor.js    # 文件处理器
│   └── ...
├── scripts/             # 页面脚本
│   └── product.js           # 产品页面逻辑
├── styles/              # 样式文件
│   └── product.css          # 产品页面样式
├── libs/                # 第三方库
│   ├── mammoth-fallback.js  # Word 处理库
│   ├── pdf.min.js          # PDF 处理库
│   ├── tesseract.min.js    # OCR 识别库
│   └── turndown-fallback.js # Markdown 生成库
├── utils/               # 工具函数
└── assets/              # 静态资源
```

## 📝 版本历程

### v0.1.5 (当前版本) - 界面精简版
- ✅ 移除联系我们板块，界面更加简洁
- ✅ 专注核心转换功能
- ✅ 优化用户体验流程
- ✅ 提升页面加载性能

### v0.1.4 - 产品优化版
- ✅ 去除付费模式，完全免费
- ✅ 修复 PDF 转换功能
- ✅ 移除演示功能
- ✅ 优化错误处理

### v0.1.3 - 核心功能版
- ✅ 实现 Word/PDF/图片转换
- ✅ 完善用户界面
- ✅ 添加进度显示

## 🎯 支持格式

| 输入格式 | 输出格式 | 转换方式 | 状态 |
|---------|---------|---------|------|
| .docx   | .md     | mammoth.js | ✅ |
| .pdf    | .md     | pdf.js | ✅ |
| .jpg/.png | .md   | tesseract.js | ✅ |
| .gif/.bmp | .md   | tesseract.js | ✅ |

## 🔒 隐私保护

- 🛡️ **本地处理**: 所有文件转换在浏览器本地完成
- 🚫 **不上传文件**: 文件不会发送到任何服务器
- 🔐 **数据安全**: 转换过程完全离线，保护您的隐私
- 🗑️ **自动清理**: 转换完成后自动清理临时数据

## 🌟 特色亮点

1. **零服务器依赖** - 纯前端实现，可离线使用
2. **模块化设计** - 易于维护和扩展
3. **现代化界面** - 响应式设计，用户体验优秀
4. **高精度转换** - 保持原文档格式和结构
5. **批量处理** - 支持多文件同时转换
6. **开源免费** - MIT 许可证，完全开源

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🔗 相关链接

- [在线演示](https://gmyifan.github.io/markdownzhuanhuan/)
- [问题反馈](https://github.com/gmyifan/markdownzhuanhuan/issues)
- [更新日志](prd.md)

---

⭐ 如果这个项目对您有帮助，请给个 Star 支持一下！