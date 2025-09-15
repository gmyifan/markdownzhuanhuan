/**
 * TurndownService 备用版本
 * 当CDN加载失败时使用的简化版本
 */

if (!window.TurndownService && !window.Turndown && !window.turndown) {
  console.log('🔄 使用 TurndownService 备用版本');
  
  class SimpleTurndownService {
    constructor(options = {}) {
      this.options = {
        headingStyle: options.headingStyle || 'atx',
        hr: options.hr || '---',
        bulletListMarker: options.bulletListMarker || '-',
        codeBlockStyle: options.codeBlockStyle || 'fenced',
        emDelimiter: options.emDelimiter || '_',
        strongDelimiter: options.strongDelimiter || '**',
        ...options
      };
      this.rules = [];
    }
    
    addRule(name, rule) {
      this.rules.push({ name, rule });
    }
    
    keep(tags) {
      // 简化实现：保留指定标签
      this.keepTags = Array.isArray(tags) ? tags : [tags];
    }
    
    turndown(html) {
      try {
        // 创建临时DOM元素来解析HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        return this.processNode(tempDiv);
      } catch (error) {
        console.error('简化 Turndown 处理器错误:', error);
        return '转换失败：' + error.message;
      }
    }
    
    processNode(node) {
      let result = '';
      
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          result += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          result += this.processElement(child);
        }
      }
      
      return result;
    }
    
    processElement(element) {
      const tagName = element.tagName.toLowerCase();
      const content = this.processNode(element);
      
      switch (tagName) {
        case 'h1':
          return `# ${content}\n\n`;
        case 'h2':
          return `## ${content}\n\n`;
        case 'h3':
          return `### ${content}\n\n`;
        case 'h4':
          return `#### ${content}\n\n`;
        case 'h5':
          return `##### ${content}\n\n`;
        case 'h6':
          return `###### ${content}\n\n`;
        case 'p':
          return `${content}\n\n`;
        case 'strong':
        case 'b':
          return `${this.options.strongDelimiter}${content}${this.options.strongDelimiter}`;
        case 'em':
        case 'i':
          return `${this.options.emDelimiter}${content}${this.options.emDelimiter}`;
        case 'code':
          return `\`${content}\``;
        case 'pre':
          return `\`\`\`\n${content}\n\`\`\`\n\n`;
        case 'a':
          const href = element.getAttribute('href') || '#';
          return `[${content}](${href})`;
        case 'img':
          const src = element.getAttribute('src') || '';
          const alt = element.getAttribute('alt') || '';
          return `![${alt}](${src})`;
        case 'ul':
          return this.processList(element, false);
        case 'ol':
          return this.processList(element, true);
        case 'li':
          return content;
        case 'br':
          return '\n';
        case 'hr':
          return `${this.options.hr}\n\n`;
        case 'blockquote':
          return content.split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
        case 'table':
        case 'thead':
        case 'tbody':
        case 'tr':
        case 'th':
        case 'td':
          // 保留表格标签（如果在keepTags中）
          if (this.keepTags && this.keepTags.includes(tagName)) {
            return `<${tagName}>${content}</${tagName}>`;
          }
          return content;
        default:
          return content;
      }
    }
    
    processList(listElement, isOrdered) {
      let result = '';
      let index = 1;
      
      for (const li of listElement.children) {
        if (li.tagName.toLowerCase() === 'li') {
          const content = this.processNode(li).trim();
          if (isOrdered) {
            result += `${index}. ${content}\n`;
            index++;
          } else {
            result += `${this.options.bulletListMarker} ${content}\n`;
          }
        }
      }
      
      return result + '\n';
    }
  }
  
  // 导出到全局
  window.TurndownService = SimpleTurndownService;
  window.Turndown = { TurndownService: SimpleTurndownService };
  window.turndown = { TurndownService: SimpleTurndownService };
}