document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    
    // Auto-resize textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Enable/disable send button
        if (this.value.trim().length > 0) {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    // Handle Enter key (Shift+Enter for new line)
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (this.value.trim().length > 0) {
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });

    let conversationId = crypto.randomUUID ? crypto.randomUUID() : 'conv-' + Date.now();
    const API_URL = 'https://crustdata-assistant.onrender.com/chat/';

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const message = userInput.value.trim();
        if (!message) return;

        // Google Analytics: Track user chat message
        if (typeof gtag === 'function') {
            gtag('event', 'chat_message_sent', {
                'message_content': message,
                'conversation_id': conversationId
            });
        }

        // Hide welcome message if it exists
        const welcomeMsg = document.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.style.display = 'none';
        }

        // Add user message to UI
        addMessage(message, 'user');
        
        // Reset input
        userInput.value = '';
        userInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');

        // Show loading state
        const loadingId = showLoading();

        const maxRetries = 3;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                // Send request to API
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message,
                        conversation_id: conversationId
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                // Remove loading
                removeLoading(loadingId);
                
                // Add AI response
                addAIMessage(data);
                break; // Success, exit the loop
                
            } catch (error) {
                retries++;
                console.error(`Error fetching chat response (Attempt ${retries}/${maxRetries}):`, error);
                
                if (retries >= maxRetries) {
                    removeLoading(loadingId);
                    addMessage('Sorry, I encountered an error while processing your request. Make sure the API is running at https://crustdata-assistant.onrender.com/chat/', 'ai', true);
                } else {
                    // Wait for 1 second before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
    });

    function addMessage(text, sender, isError = false) {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${sender}`;
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        if (isError) {
            bubble.style.color = '#ef4444';
        }

        if (sender === 'user') {
            bubble.textContent = text;
        } else {
            // Fallback for simple AI messages (like errors)
            bubble.innerHTML = `<div class="message-content">${text}</div>`;
        }

        wrapper.appendChild(bubble);
        chatContainer.appendChild(wrapper);
        scrollToBottom();
    }

    function addAIMessage(data) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper ai';
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        // Parse markdown content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Use marked to parse markdown if available, else fallback
        let rawHtml = '';
        if (typeof marked !== 'undefined') {
            rawHtml = marked.parse(data.answer);
        } else {
            rawHtml = `<p>${data.answer.replace(/\\n/g, '<br>')}</p>`;
        }
        
        // Purify HTML to prevent XSS (allowing iframe for video embeds)
        if (typeof DOMPurify !== 'undefined') {
            contentDiv.innerHTML = DOMPurify.sanitize(rawHtml, {
                ADD_TAGS: ['iframe'],
                ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'width', 'height', 'title']
            });
        } else {
            contentDiv.innerHTML = rawHtml;
        }

        // Add Copy functionality to code blocks
        const preElements = contentDiv.querySelectorAll('pre');
        preElements.forEach(pre => {
            const preWrapper = document.createElement('div');
            preWrapper.className = 'code-block-wrapper';
            pre.parentNode.insertBefore(preWrapper, pre);
            preWrapper.appendChild(pre);

            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-code-btn';
            copyBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 16H6C4.89543 16 4 15.1046 4 14V6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6V8M18 8H10C8.89543 8 8 8.89543 8 10V18C8 19.1046 8.89543 20 10 20H18C19.1046 20 20 19.1046 20 18V10C20 8.89543 19.1046 8 18 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Copy
            `;
            
            copyBtn.addEventListener('click', async () => {
                const code = pre.querySelector('code');
                const text = code ? code.innerText : pre.innerText;
                try {
                    await navigator.clipboard.writeText(text);
                    copyBtn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Copied!
                    `;
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.innerHTML = `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 16H6C4.89543 16 4 15.1046 4 14V6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6V8M18 8H10C8.89543 8 8 8.89543 8 10V18C8 19.1046 8.89543 20 10 20H18C19.1046 20 20 19.1046 20 18V10C20 8.89543 19.1046 8 18 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Copy
                        `;
                        copyBtn.classList.remove('copied');
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy code: ', err);
                }
            });
            
            preWrapper.appendChild(copyBtn);
        });
        
        bubble.appendChild(contentDiv);
        
        // Render API Endpoints if available
        if (data.endpoints && Array.isArray(data.endpoints) && data.endpoints.length > 0) {
            const endpointsContainer = document.createElement('div');
            endpointsContainer.className = 'endpoints-container';
            
            data.endpoints.forEach(endpoint => {
                const card = document.createElement('div');
                card.className = 'endpoint-card';
                
                const methodClass = (endpoint.method || 'GET').toLowerCase();
                
                card.innerHTML = `
                    <div class="endpoint-header">
                        <span class="method-badge ${methodClass}">${endpoint.method || 'GET'}</span>
                        <span class="endpoint-url">${endpoint.url || 'N/A'}</span>
                    </div>
                    <div class="endpoint-description">${endpoint.description || 'No description provided.'}</div>
                    ${endpoint.curl_example ? `<div class="endpoint-curl">${escapeHtml(endpoint.curl_example)}</div>` : ''}
                `;
                
                endpointsContainer.appendChild(card);
            });
            
            bubble.appendChild(endpointsContainer);
        }
        
        wrapper.appendChild(bubble);
        chatContainer.appendChild(wrapper);
        scrollToBottom();
    }

    function showLoading() {
        const id = 'loading-' + Date.now();
        const loading = document.createElement('div');
        loading.id = id;
        loading.className = 'loading-indicator';
        loading.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;
        chatContainer.appendChild(loading);
        scrollToBottom();
        return id;
    }

    function removeLoading(id) {
        const loading = document.getElementById(id);
        if (loading) {
            loading.remove();
        }
    }

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // Google Analytics: Track all button clicks
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && typeof gtag === 'function') {
            const btnName = btn.id || btn.getAttribute('aria-label') || btn.innerText.trim() || 'unknown_button';
            gtag('event', 'button_click', {
                'button_name': btnName,
                'button_classes': btn.className,
                'button_id': btn.id
            });
        }
    });

    // Demo Video Modal Functionality
    const videoModal = document.getElementById('video-modal');
    const watchDemoBtn = document.getElementById('watch-demo-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const demoVideoIframe = document.getElementById('demo-video-iframe');

    function openDemoModal() {
        if (!videoModal || !demoVideoIframe) return;
        const videoSrc = demoVideoIframe.getAttribute('data-src');
        if (videoSrc && demoVideoIframe.src !== videoSrc) {
            demoVideoIframe.src = videoSrc;
        }
        videoModal.classList.add('active');
        videoModal.removeAttribute('aria-hidden');
    }

    function closeDemoModal() {
        if (!videoModal || !demoVideoIframe) return;
        videoModal.classList.remove('active');
        videoModal.setAttribute('aria-hidden', 'true');
        demoVideoIframe.src = '';
        localStorage.setItem('hasSeenDemoVideo', 'true');
    }

    if (watchDemoBtn) {
        watchDemoBtn.addEventListener('click', openDemoModal);
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeDemoModal);
    }

    if (videoModal) {
        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) {
                closeDemoModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && videoModal.classList.contains('active')) {
                closeDemoModal();
            }
        });
    }

    // Auto-open modal on first website visit
    if (!localStorage.getItem('hasSeenDemoVideo')) {
        setTimeout(() => {
            openDemoModal();
        }, 500);
    }
});
