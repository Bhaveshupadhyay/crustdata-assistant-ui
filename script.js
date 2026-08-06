document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    
    // Auto-resize textarea dynamically
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
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

    // Prompt Chips Handler
    document.addEventListener('click', (e) => {
        const chip = e.target.closest('.prompt-chip');
        if (chip) {
            const promptText = chip.getAttribute('data-prompt');
            if (promptText) {
                userInput.value = promptText;
                userInput.style.height = 'auto';
                userInput.style.height = (userInput.scrollHeight) + 'px';
                sendBtn.removeAttribute('disabled');
                
                // Submit automatically
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });

    // Clear Chat / New Chat
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            chatContainer.innerHTML = `
                <div class="welcome-message">
                    <div class="hero-badge">
                        <span class="sparkle-icon">✨</span>
                        <span>AI-Powered Data Intelligence</span>
                    </div>
                    <h2>What would you like to query today?</h2>
                    <p>Ask technical questions about Crustdata APIs, endpoint parameters, authentication, cURL examples, or request developer details.</p>
                    
                    <div class="prompt-chips">
                        <button type="button" class="prompt-chip" data-prompt="How do I search for companies by domain name in Crustdata API?">
                            <span class="chip-icon">🔍</span>
                            <span>Search companies by domain</span>
                        </button>
                        <button type="button" class="prompt-chip" data-prompt="Show me a cURL example to query funding data and headcount.">
                            <span class="chip-icon">⚡</span>
                            <span>cURL example for funding data</span>
                        </button>
                        <button type="button" class="prompt-chip" data-prompt="Tell me about the developer of this application and show his resume.">
                            <span class="chip-icon">👨‍💻</span>
                            <span>Developer profile & Resume</span>
                        </button>
                        <button type="button" class="prompt-chip" data-prompt="What endpoints are available in Crustdata API?">
                            <span class="chip-icon">📡</span>
                            <span>Available Crustdata APIs</span>
                        </button>
                    </div>
                </div>
            `;
            conversationId = crypto.randomUUID ? crypto.randomUUID() : 'conv-' + Date.now();
        });
    }

    let conversationId = crypto.randomUUID ? crypto.randomUUID() : 'conv-' + Date.now();
    const API_URL = 'https://crustdata-assistant.onrender.com/chat/';

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const message = userInput.value.trim();
        if (!message) return;

        // Google Analytics
        if (typeof gtag === 'function') {
            gtag('event', 'chat_message_sent', {
                'message_content': message,
                'conversation_id': conversationId
            });
        }

        // Hide welcome message
        const welcomeMsg = document.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.style.display = 'none';
        }

        // Add user message
        addMessage(message, 'user');
        
        // Reset input
        userInput.value = '';
        userInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');

        // Check if message is about resume/developer
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('resume') || lowerMsg.includes('developer') || lowerMsg.includes('bhavesh') || lowerMsg.includes('cv') || lowerMsg.includes('who built')) {
            const loadingId = showLoading();
            setTimeout(() => {
                removeLoading(loadingId);
                addDeveloperResumeMessage();
            }, 600);
            return;
        }

        // Show loading indicator
        const loadingId = showLoading();

        const maxRetries = 3;
        let retries = 0;

        while (retries < maxRetries) {
            try {
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
                
                removeLoading(loadingId);
                addAIMessage(data);
                break;
                
            } catch (error) {
                retries++;
                console.error(`Error fetching chat response (Attempt ${retries}/${maxRetries}):`, error);
                
                if (retries >= maxRetries) {
                    removeLoading(loadingId);
                    addMessage('Sorry, I encountered an error while connecting to the Crustdata assistant backend. Please ensure the service at `https://crustdata-assistant.onrender.com/chat/` is active.', 'ai', true);
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
    });

    function addMessage(text, sender, isError = false) {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? 'U' : 'AI';
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        if (isError) {
            bubble.style.color = '#f87171';
        }

        if (sender === 'user') {
            bubble.textContent = text;
        } else {
            bubble.innerHTML = `<div class="message-content">${text}</div>`;
        }

        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);
        chatContainer.appendChild(wrapper);
        scrollToBottom();
    }

    function addAIMessage(data) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper ai';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'AI';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        let rawHtml = '';
        if (typeof marked !== 'undefined') {
            rawHtml = marked.parse(data.answer);
        } else {
            rawHtml = `<p>${data.answer.replace(/\n/g, '<br>')}</p>`;
        }
        
        if (typeof DOMPurify !== 'undefined') {
            contentDiv.innerHTML = DOMPurify.sanitize(rawHtml, {
                ADD_TAGS: ['iframe'],
                ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'width', 'height', 'title']
            });
        } else {
            contentDiv.innerHTML = rawHtml;
        }

        // Add Copy Code functionality
        const preElements = contentDiv.querySelectorAll('pre');
        preElements.forEach(pre => {
            const preWrapper = document.createElement('div');
            preWrapper.className = 'code-block-wrapper';
            pre.parentNode.insertBefore(preWrapper, pre);
            preWrapper.appendChild(pre);

            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-code-btn';
            copyBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 16H6C4.89543 16 4 15.1046 4 14V6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6V8M18 8H10C8.89543 8 8 8.89543 8 10V18C8 19.1046 8.89543 20 10 20H18C19.1046 20 20 19.1046 20 18V10C20 8.89543 19.1046 8 18 8Z"/>
                </svg>
                Copy
            `;
            
            copyBtn.addEventListener('click', async () => {
                const code = pre.querySelector('code');
                const text = code ? code.innerText : pre.innerText;
                try {
                    await navigator.clipboard.writeText(text);
                    copyBtn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17L4 12"/>
                        </svg>
                        Copied!
                    `;
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.innerHTML = `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M8 16H6C4.89543 16 4 15.1046 4 14V6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6V8M18 8H10C8.89543 8 8 8.89543 8 10V18C8 19.1046 8.89543 20 10 20H18C19.1046 20 20 19.1046 20 18V10C20 8.89543 19.1046 8 18 8Z"/>
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
        
        // Render API Endpoints cards if available
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
        
        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);
        chatContainer.appendChild(wrapper);
        scrollToBottom();
    }

    function addDeveloperResumeMessage() {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper ai';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'AI';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = `
            <p><strong>Bhavesh Upadhyay — Full Stack & AI Engineer</strong></p>
            <p>Here is a summary of the developer's profile and resume details:</p>
            <ul>
                <li><strong>Role:</strong> Full Stack & AI Systems Developer</li>
                <li><strong>Core Skills:</strong> Python, Node.js, React, RAG Systems, Webpack, REST APIs, Fast Execution</li>
                <li><strong>Project:</strong> Built the memory-efficient Crustdata AI Assistant UI & RAG backend.</li>
            </ul>
            <p>You can preview or download the full resume PDF directly in the interactive modal window below:</p>
            <div style="margin-top: 1rem;">
                <button type="button" class="header-link-btn resume-btn" id="inline-open-resume-btn" style="padding: 0.6rem 1.2rem; font-size: 0.9rem;">
                    📄 View & Download Full Resume
                </button>
            </div>
        `;
        
        bubble.appendChild(contentDiv);
        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);
        chatContainer.appendChild(wrapper);
        scrollToBottom();

        const inlineBtn = document.getElementById('inline-open-resume-btn');
        if (inlineBtn) {
            inlineBtn.addEventListener('click', openResumeModal);
        }
    }

    const activeLoadingTimers = {};

    function showLoading() {
        const id = 'loading-' + Date.now();
        const wrapper = document.createElement('div');
        wrapper.id = id;
        wrapper.className = 'message-wrapper ai';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'AI';

        const groupContainer = document.createElement('div');
        groupContainer.className = 'loading-container-group';

        const loading = document.createElement('div');
        loading.className = 'loading-indicator';
        loading.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;
        groupContainer.appendChild(loading);

        wrapper.appendChild(avatar);
        wrapper.appendChild(groupContainer);
        chatContainer.appendChild(wrapper);
        scrollToBottom();

        // 15-second timer for Render free server spin-up notification
        activeLoadingTimers[id] = setTimeout(() => {
            if (document.getElementById(id)) {
                const notice = document.createElement('div');
                notice.className = 'render-warning-notice';
                notice.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>Backend is hosted on a free Render server. Spin-up may take 30-50s on initial load...</span>
                `;
                groupContainer.appendChild(notice);
                scrollToBottom();
            }
        }, 15000);

        return id;
    }

    function removeLoading(id) {
        if (activeLoadingTimers[id]) {
            clearTimeout(activeLoadingTimers[id]);
            delete activeLoadingTimers[id];
        }
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

    // Modal logic: Resume Modal
    const resumeModal = document.getElementById('resume-modal');
    const openResumeBtn = document.getElementById('open-resume-btn');
    const closeResumeBtn = document.getElementById('close-resume-btn');
    const resumeIframe = document.getElementById('resume-iframe');

    function openResumeModal() {
        if (!resumeModal || !resumeIframe) return;
        const src = resumeIframe.getAttribute('data-src');
        if (src && resumeIframe.src !== src) {
            resumeIframe.src = src;
        }
        resumeModal.classList.add('active');
        resumeModal.removeAttribute('aria-hidden');
    }

    function closeResumeModal() {
        if (!resumeModal) return;
        resumeModal.classList.remove('active');
        resumeModal.setAttribute('aria-hidden', 'true');
    }

    if (openResumeBtn) openResumeBtn.addEventListener('click', openResumeModal);
    if (closeResumeBtn) closeResumeBtn.addEventListener('click', closeResumeModal);

    if (resumeModal) {
        resumeModal.addEventListener('click', (e) => {
            if (e.target === resumeModal) closeResumeModal();
        });
    }

    // Modal logic: Demo Video Modal
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

    if (watchDemoBtn) watchDemoBtn.addEventListener('click', openDemoModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeDemoModal);

    if (videoModal) {
        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) closeDemoModal();
        });
    }

    // ESC Key for all modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (resumeModal && resumeModal.classList.contains('active')) closeResumeModal();
            if (videoModal && videoModal.classList.contains('active')) closeDemoModal();
        }
    });

    // Auto-open video modal on first visit
    if (!localStorage.getItem('hasSeenDemoVideo')) {
        setTimeout(() => {
            openDemoModal();
        }, 500);
    }
});
