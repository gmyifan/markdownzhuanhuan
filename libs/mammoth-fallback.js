/**
 * Mammoth.js 备用版本
 * 当CDN加载失败时使用的简化版本
 */

if (!window.mammoth) {
  console.log('🔄 使用 Mammoth.js 备用版本');
  
  window.mammoth = {
    convertToHtml: async function(input, options = {}) {
      // 简化的 DOCX 处理
      console.log('⚠️ 使用简化的 DOCX 处理器');
      
      try {
        // 基本的文本提取（这是一个非常简化的版本）
        const arrayBuffer = input.arrayBuffer || input;
        
        // 模拟处理过程
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 返回基本的HTML结构
        const html = `
          <div>
            <h1>文档内容</h1>
            <p>注意：由于网络问题，使用了简化的文档处理器。</p>
            <p>完整功能需要加载 Mammoth.js 库。</p>
            <p>文件名：${input.name || '未知文件'}</p>
            <p>文件大小：${input.size ? (input.size / 1024).toFixed(2) + ' KB' : '未知大小'}</p>
          </div>
        `;
        
        return {
          value: html,
          messages: []
        };
      } catch (error) {
        console.error('简化 DOCX 处理器错误:', error);
        return {
          value: '<p>文档处理失败，请检查文件格式。</p>',
          messages: [{ type: 'error', message: error.message }]
        };
      }
    },
    
    images: {
      inline: function(callback) {
        return callback || function() { return null; };
      }
    }
  };
}