// UTC Chat Assistant - Content Script
class PageChatAssistant {
    constructor() {
        this.apiUrl = 'http://127.0.0.1:5000/ask';
        this.isVisible = false;
        this.chatContainer = null;
        this.mutationObserver = null;
        this.injectedElements = new WeakSet();
        this.presetQA = [
            { matcher: (el) => /thông tin/i.test(el.textContent || ''), question: 'Làm gì trong mục Thông tin?', answer: 'Mục Thông tin hiển thị hồ sơ, lớp, Khoa, MSSV, email, và các dữ liệu cá nhân của bạn trong hệ thống.' },
            { matcher: (el) => /(khảo sát|khao sat)/i.test(el.textContent || ''), question: 'Khảo sát dùng để làm gì?', answer: 'Mục Khảo sát chứa các phiếu khảo sát học phần, giảng viên, và các biểu mẫu cần hoàn thành theo từng kỳ.' },
            { matcher: (el) => /(giấy x?nsv|giấy xác nhận)/i.test(el.textContent || ''), question: 'Cách xin giấy XNSV?', answer: 'Vào Giấy XNSV để tạo đơn xác nhận sinh viên, chọn mẫu, điền thông tin và gửi yêu cầu. Theo dõi trạng thái tại mục này.' },
            { matcher: (el) => /(nội trú|noi tru)/i.test(el.textContent || ''), question: 'Đăng ký nội trú thế nào?', answer: 'Chọn Nội trú để xem thông báo, tiêu chí và thực hiện đăng ký/ gia hạn chỗ ở ký túc xá khi có đợt mở.' },
            { matcher: (el) => /(đk vé xe buýt|xe buýt|bus)/i.test(el.textContent || ''), question: 'Đăng ký vé xe buýt sinh viên?', answer: 'Mục ĐK vé xe buýt cho phép đăng ký/ gia hạn vé ưu đãi; chuẩn bị ảnh thẻ, MSSV và thông tin tuyến trước khi thực hiện.' },
            { matcher: (el) => /(thẻ sinh viên|the sinh vien)/i.test(el.textContent || ''), question: 'Về thẻ sinh viên?', answer: 'Tại Thẻ sinh viên bạn có thể xem mã QR, tình trạng thẻ, và hướng dẫn cấp/đổi thẻ nếu bị hỏng hoặc mất.' },
            { matcher: (el) => /(thanh toán|payment|qr)/i.test(el.textContent || ''), question: 'Thanh toán học phí ở đâu?', answer: 'Mục Thanh toán hỗ trợ tra cứu công nợ và thanh toán học phí qua mã QR/ ngân hàng liên kết. Đảm bảo nội dung chuyển khoản đúng MSSV.' }
        ];
        
        this.init();
    }
    
    init() {
        this.createChatWidget();
        this.setupMessageListener();
        this.setupOverlays();
    }
    
    createChatWidget() {
        // Create chat container
        this.chatContainer = document.createElement('div');
        this.chatContainer.id = 'utc-chat-widget';
        this.chatContainer.innerHTML = `
            <div class="chat-toggle" id="chat-toggle">
                <i class="fas fa-comments"></i>
            </div>
            <div class="chat-window" id="chat-window" style="display: none;">
                <div class="chat-header">
                    <div class="header-content">
                        <i class="fas fa-robot"></i>
                        <h4>Trợ lý chat UTC</h4>
                    </div>
                    <button class="close-btn" id="close-chat">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="chat-messages" id="page-chat-messages">
                    <div class="message bot-message">
                        <div class="message-content">
                            Xin chào! Tôi có thể giúp gì cho bạn về hệ thống thông tin sinh viên UTC?
                        </div>
                    </div>
                </div>
                <div class="chat-input-container">
                    <div class="input-wrapper">
                        <input type="text" id="page-chat-input" placeholder="Nhập câu hỏi của bạn..." autocomplete="off">
                        <button id="page-send-btn" class="send-btn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.chatContainer);
        
        // Add event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const toggleBtn = document.getElementById('chat-toggle');
        const closeBtn = document.getElementById('close-chat');
        const sendBtn = document.getElementById('page-send-btn');
        const chatInput = document.getElementById('page-chat-input');
        
        toggleBtn.addEventListener('click', () => this.toggleChat());
        closeBtn.addEventListener('click', () => this.toggleChat());
        sendBtn.addEventListener('click', () => this.sendMessage());
        
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }
    
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'toggleChat') {
                this.toggleChat();
            }
        });
    }
    
    // Preset Q&A helpers and overlays
    ensureChatOpen() {
        if (!this.isVisible) {
            this.toggleChat();
        }
    }
    
    askPreset(question, answer) {
        this.ensureChatOpen();
        this.addMessage(question, 'user');
        this.addMessage(answer, 'bot');
        this.scrollToBottom();
    }
    
    setupOverlays() {
        try { window.__utcPageChat__ = this; } catch (e) {}
        this.injectOverlays();
        this.mutationObserver = new MutationObserver(() => {
            this.injectOverlays();
        });
        this.mutationObserver.observe(document.body, { childList: true, subtree: true });
    }
    
    injectOverlays() {
        const candidates = Array.from(document.querySelectorAll('a, button, [role="button"], .btn'));
        candidates.forEach((el) => {
            if (this.injectedElements.has(el)) return;
            const rect = el.getBoundingClientRect();
            if (!rect || rect.width < 80 || rect.height < 40) return;
            const qa = this.presetQA.find(p => p.matcher(el));
            if (!qa) return;
            const prevPosition = getComputedStyle(el).position;
            if (prevPosition === 'static') {
                el.style.position = 'relative';
                el.dataset.utcPrevPosition = 'static';
            }
            const badge = document.createElement('div');
            badge.className = 'utc-help-overlay';
            badge.title = 'Trợ lý: bấm để xem giải thích nhanh';
            badge.textContent = '?';
            badge.setAttribute('role', 'button');
            badge.setAttribute('tabindex', '0');
            badge.addEventListener('click', (evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                this.askPreset(qa.question, qa.answer);
            });
            badge.addEventListener('mousedown', (evt) => { evt.preventDefault(); evt.stopPropagation(); });
            badge.addEventListener('touchstart', (evt) => { evt.preventDefault(); evt.stopPropagation(); }, { passive: false });
            badge.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter' || evt.key === ' ') {
                    evt.preventDefault();
                    evt.stopPropagation();
                    this.askPreset(qa.question, qa.answer);
                }
            });
            el.appendChild(badge);
            this.injectedElements.add(el);
        });
    }
    
    toggleChat() {
        const chatWindow = document.getElementById('chat-window');
        const chatToggle = document.getElementById('chat-toggle');
        
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            chatWindow.style.display = 'flex';
            chatToggle.style.display = 'none';
            document.getElementById('page-chat-input').focus();
        } else {
            chatWindow.style.display = 'none';
            chatToggle.style.display = 'flex';
        }
    }
    
    async sendMessage() {
        const input = document.getElementById('page-chat-input');
        const message = input.value.trim();
        if (!message) return;
        
        // Disable input and button
        input.disabled = true;
        document.getElementById('page-send-btn').disabled = true;
        
        // Add user message
        this.addMessage(message, 'user');
        input.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
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
            
            const botResponse = data.response || data.answer || 'Xin lỗi, tôi không thể trả lời câu hỏi này.';
            this.addMessage(botResponse, 'bot', data.referenced_paragraphs, data.referenced_images);
            
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Xin lỗi, có lỗi xảy ra khi kết nối với server. Vui lòng thử lại sau.', 'bot');
        } finally {
            input.disabled = false;
            document.getElementById('page-send-btn').disabled = false;
            input.focus();
        }
    }
    
    addMessage(content, sender, referencedParagraphs = null, referencedImages = null) {
        const messagesContainer = document.getElementById('page-chat-messages');
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
            this.addReferencedParagraphImage(messageDiv, referencedParagraphs[0]);
        }
        
        // Add referenced images if available
        if (sender === 'bot' && referencedImages && referencedImages.length > 0) {
            this.addReferencedImages(messageDiv, referencedImages);
        }
        
        messagesContainer.appendChild(messageDiv);
        
        this.scrollToBottom();
    }
    
    showTypingIndicator() {
        const messagesContainer = document.getElementById('page-chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message';
        typingDiv.id = 'page-typing-indicator';
        
        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'typing-indicator';
        indicatorDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        
        typingDiv.appendChild(indicatorDiv);
        messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('page-typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('page-chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
    
    addReferencedParagraphImage(messageDiv, paragraph) {
        // Create a container for the referenced paragraph
        const refContainer = document.createElement('div');
        refContainer.className = 'referenced-paragraph';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'ref-header';
        header.innerHTML = '<i class="fas fa-file-alt"></i> Tài liệu tham khảo';
        
        // Create content
        const content = document.createElement('div');
        content.className = 'ref-content';
        content.textContent = paragraph.content;
        
        // Create metadata
        const metadata = document.createElement('div');
        metadata.className = 'ref-metadata';
        if (paragraph.metadata) {
            const pageInfo = paragraph.metadata.page_label ? `Trang ${paragraph.metadata.page_label}` : '';
            const sourceInfo = paragraph.metadata.source ? `Nguồn: ${paragraph.metadata.source}` : '';
            metadata.innerHTML = `<small>${pageInfo} ${sourceInfo}</small>`;
        }
        
        refContainer.appendChild(header);
        refContainer.appendChild(content);
        refContainer.appendChild(metadata);
        
        messageDiv.appendChild(refContainer);
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
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PageChatAssistant();
    });
} else {
    new PageChatAssistant();
}
