// UTC Chat Assistant - Popup Script
class ChatAssistant {
    constructor() {
        this.apiUrl = 'http://127.0.0.1:5000/ask';
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('send-btn');
        this.toggleModeBtn = document.getElementById('toggle-mode');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadChatHistory();
    }
    
    setupEventListeners() {
        // Send message on button click
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter key
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Toggle between popup and page mode
        this.toggleModeBtn.addEventListener('click', () => this.toggleMode());
        
        // Auto-focus input
        this.chatInput.focus();
    }
    
    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;
        
        // Disable input and button
        this.chatInput.disabled = true;
        this.sendBtn.disabled = true;
        
        // Add user message to chat
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // Call API
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: message })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.hideTypingIndicator();
            
            // Debug logging
            console.log('API Response data:', data);
            console.log('Referenced paragraphs:', data.referenced_paragraphs);
            
            // Handle response - check for both 'response' and 'answer' fields
            const botResponse = data.response || data.answer || 'Xin lỗi, tôi không thể trả lời câu hỏi này.';
            this.addMessage(botResponse, 'bot', data.referenced_paragraphs, data.referenced_images);
            
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Xin lỗi, có lỗi xảy ra khi kết nối với server. Vui lòng thử lại sau.', 'bot');
        } finally {
            // Re-enable input and button
            this.chatInput.disabled = false;
            this.sendBtn.disabled = false;
            this.chatInput.focus();
        }
    }
    
    addMessage(content, sender, referencedParagraphs = null, referencedImages = null) {
        console.log('addMessage called with:', { content: content.substring(0, 100) + '...', sender, referencedParagraphs });
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Render markdown for bot messages, plain text for user messages
        if (sender === 'bot' && typeof marked !== 'undefined') {
            contentDiv.innerHTML = marked.parse(content);
        } else {
            contentDiv.textContent = content;
        }
        
        messageDiv.appendChild(contentDiv);
        
        // Add referenced paragraph image if available
        if (sender === 'bot' && referencedParagraphs && referencedParagraphs.length > 0) {
            console.log('Adding referenced paragraph:', referencedParagraphs[0]);
            this.addReferencedParagraphImage(messageDiv, referencedParagraphs[0]);
        } else {
            console.log('No referenced paragraphs to add. Conditions:', {
                isBot: sender === 'bot',
                hasReferencedParagraphs: !!referencedParagraphs,
                length: referencedParagraphs ? referencedParagraphs.length : 0
            });
        }
        
        // Add referenced images if available
        if (sender === 'bot' && referencedImages && referencedImages.length > 0) {
            this.addReferencedImages(messageDiv, referencedImages);
        }
        
        this.chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        this.scrollToBottom();
        
        // Save to chat history
        this.saveToHistory(content, sender);
    }
    
    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message';
        typingDiv.id = 'typing-indicator';
        
        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'typing-indicator';
        indicatorDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        
        typingDiv.appendChild(indicatorDiv);
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    formatDate(dateValue) {
        if (!dateValue) return '';
        
        try {
            // Handle different date formats
            let date;
            if (dateValue instanceof Date) {
                date = dateValue;
            } else if (typeof dateValue === 'string') {
                // Try parsing various date formats
                date = new Date(dateValue);
                if (isNaN(date.getTime())) {
                    // If standard parsing fails, return as is
                    return dateValue;
                }
            } else {
                return String(dateValue);
            }
            
            // Format as DD/MM/YYYY (Vietnamese format)
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            
            return `${day}/${month}/${year}`;
        } catch (e) {
            // If formatting fails, return the original value
            return String(dateValue);
        }
    }
    
    addReferencedImages(messageDiv, referencedImages) {
        // Create a container for all referenced images
        const imagesContainer = document.createElement('div');
        imagesContainer.className = 'referenced-images';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'ref-header';
        header.innerHTML = '<i class="fas fa-image"></i> Nguồn tham khảo';
        imagesContainer.appendChild(header);
        
        // Create images wrapper
        const imagesWrapper = document.createElement('div');
        imagesWrapper.className = 'ref-images-wrapper';
        
        // Add each image
        referencedImages.forEach((imageData, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'ref-image-item';
            
            // Create image element
            const img = document.createElement('img');
            const imageUrl = `data:image/${imageData.image_format || 'jpeg'};base64,${imageData.image}`;
            img.src = imageUrl;
            img.alt = `Nguồn tham khảo ${index + 1}`;
            img.className = 'ref-image';
            img.loading = 'lazy';
            
            // Add click to expand functionality
            img.addEventListener('click', () => {
                this.showImageModal(imageUrl, imageData);
            });
            
            // Create metadata
            const metadata = document.createElement('div');
            metadata.className = 'ref-image-metadata';
            const pageInfo = imageData.page_number ? `Trang ${imageData.page_number}` : '';
            const sourceInfo = imageData.pdf_source ? `Nguồn: ${imageData.pdf_source}` : '';
            const dateInfo = imageData.date ? this.formatDate(imageData.date) : '';
            
            const metadataParts = [pageInfo, sourceInfo, dateInfo].filter(part => part);
            metadata.innerHTML = `<small>${metadataParts.join(' • ')}</small>`;
            
            imageItem.appendChild(img);
            imageItem.appendChild(metadata);
            imagesWrapper.appendChild(imageItem);
        });
        
        imagesContainer.appendChild(imagesWrapper);
        messageDiv.appendChild(imagesContainer);
    }
    
    showImageModal(imageUrl, imageData) {
        // Remove existing modal if any
        const existingModal = document.getElementById('utc-image-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'utc-image-modal';
        modal.className = 'utc-image-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'utc-image-modal-content';
        
        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'utc-image-modal-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.addEventListener('click', () => modal.remove());
        
        // Create image
        const img = document.createElement('img');
        img.src = imageUrl;
        img.className = 'utc-image-modal-img';
        img.alt = 'Nguồn tham khảo';
        
        // Create image info
        const imageInfo = document.createElement('div');
        imageInfo.className = 'utc-image-modal-info';
        const pageInfo = imageData.page_number ? `Trang ${imageData.page_number}` : '';
        const sourceInfo = imageData.pdf_source ? imageData.pdf_source : '';
        const dateInfo = imageData.date ? this.formatDate(imageData.date) : '';
        
        const infoParts = [];
        if (sourceInfo) infoParts.push(`<strong>Nguồn:</strong> ${sourceInfo}`);
        if (pageInfo) infoParts.push(pageInfo);
        if (dateInfo) infoParts.push(`<strong>Ngày:</strong> ${dateInfo}`);
        
        imageInfo.innerHTML = infoParts.join(' • ');
        
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(img);
        modalContent.appendChild(imageInfo);
        modal.appendChild(modalContent);
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Close on ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        document.body.appendChild(modal);
    }
    
    toggleMode() {
        // Send message to content script to toggle page mode
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleChat'});
        });
    }
    
    saveToHistory(message, sender) {
        const history = this.getChatHistory();
        history.push({
            message: message,
            sender: sender,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 messages
        if (history.length > 50) {
            history.splice(0, history.length - 50);
        }
        
        chrome.storage.local.set({chatHistory: history});
    }
    
    loadChatHistory() {
        chrome.storage.local.get(['chatHistory'], (result) => {
            if (result.chatHistory && result.chatHistory.length > 0) {
                // Clear default message
                this.chatMessages.innerHTML = '';
                
                // Load history
                result.chatHistory.forEach(item => {
                    this.addMessage(item.message, item.sender);
                });
            }
        });
    }
    
    getChatHistory() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['chatHistory'], (result) => {
                resolve(result.chatHistory || []);
            });
        });
    }
    
    addReferencedParagraphImage(messageDiv, paragraph) {
        console.log('addReferencedParagraphImage called with:', paragraph);
        
        // Create a container for the referenced paragraph
        const refContainer = document.createElement('div');
        refContainer.className = 'referenced-paragraph';
        console.log('Created refContainer:', refContainer);
        
        // Create header
        const header = document.createElement('div');
        header.className = 'ref-header';
        header.innerHTML = '<i class="fas fa-file-alt"></i> Tài liệu tham khảo';
        console.log('Created header:', header);
        
        // Create content
        const content = document.createElement('div');
        content.className = 'ref-content';
        content.textContent = paragraph.content;
        console.log('Created content:', content);
        
        // Create metadata
        const metadata = document.createElement('div');
        metadata.className = 'ref-metadata';
        if (paragraph.metadata) {
            const pageInfo = paragraph.metadata.page_label ? `Trang ${paragraph.metadata.page_label}` : '';
            const sourceInfo = paragraph.metadata.source ? `Nguồn: ${paragraph.metadata.source}` : '';
            const dateInfo = paragraph.metadata.date ? this.formatDate(paragraph.metadata.date) : '';
            
            const metadataParts = [pageInfo, sourceInfo, dateInfo].filter(part => part);
            metadata.innerHTML = `<small>${metadataParts.join(' • ')}</small>`;
        }
        console.log('Created metadata:', metadata);
        
        refContainer.appendChild(header);
        refContainer.appendChild(content);
        refContainer.appendChild(metadata);
        
        console.log('Appending refContainer to messageDiv');
        messageDiv.appendChild(refContainer);
        console.log('Final messageDiv:', messageDiv);
    }
}

// Initialize chat assistant when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const chatAssistant = new ChatAssistant();
    
    // Add test function to window for debugging
    window.testReferencedParagraph = function() {
        console.log('Testing referenced paragraph display...');
        const testData = {
            content: "a) Khối lượng của các học phần phải học lại vượt quá 5% so với tổng số tín chỉ quy định cho toàn chương trình; b) Sinh viên đã bị kỷ luật từ mức cảnh cáo trở lên trong thời gian học. 4. Quy trình, thủ tục xét và công nhận tốt nghiệp, thời gian và số lần xét tốt nghiệp trong năm: a) Nhà trường thực hiện xét công nhận tốt nghiệp 2 lần trong năm ngay sau thời điểm kết thúc học kỳ 1 và học kỳ 2, trường hợp cần thiết có thể thực hiện xét tốt nghiệp bổ sung; b) Sinh viên có trách nhiệm kiểm tra các nội dung về: kết quả học tập, thông tin cá nhân sẽ được in trên bằng tốt nghiệp, các điều kiện Giáo dục thể chất, Giáo dục Quốc phòng - An ninh, Ngoại ngữ trên phần mềm quản lý đào tạo. Nếu có sai sót, sinh viên đề nghị sửa sai thông tin cá nhân hoặc gửi khiếu",
            metadata: {
                page_label: "30",
                source: "STSV.pdf",
                page: 29
            }
        };
        
        chatAssistant.addMessage("Test message with referenced paragraph", "bot", [testData]);
    };
    
    console.log('Chat assistant initialized. Use window.testReferencedParagraph() to test referenced paragraph display.');
});
