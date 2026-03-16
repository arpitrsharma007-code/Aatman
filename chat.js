/* ════════════════════════════════════════════════════════════════════
   AATMAN · chat.js
   Streaming chat with Claude via SSE, stop button, language support
════════════════════════════════════════════════════════════════════ */

'use strict';

(function initChat() {
  // ─── DOM refs ──────────────────────────────────────────────────────
  const messagesEl  = document.getElementById('messagesContainer');
  const inputEl     = document.getElementById('chatInput');
  const sendBtn     = document.getElementById('sendBtn');
  const stopBtn     = document.getElementById('stopBtn');
  const suggestBox  = document.getElementById('suggestions');
  const suggChips   = document.querySelectorAll('.suggestion-chip');

  if (!messagesEl || !inputEl || !sendBtn) return;

  // ─── State ─────────────────────────────────────────────────────────
  const STORAGE_KEY = 'aatman_chat_history';
  const MAX_HISTORY = 40;

  let conversationHistory = []; // { role, content }[]
  let isStreaming = false;
  let abortController = null;

  // ─── Load history from localStorage ───────────────────────────────
  function loadHistory() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        conversationHistory = JSON.parse(saved);
        renderSavedHistory();
      }
    } catch (e) {
      console.warn('Could not load chat history:', e);
    }
  }

  // Load history from an array directly (called by auth.js after login)
  function loadHistoryFromArray(histArr) {
    if (!histArr || !histArr.length) return;
    conversationHistory = histArr;
    renderSavedHistory();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(histArr));
    } catch (e) {}
  }

  function saveHistory() {
    try {
      const trimmed = conversationHistory.slice(-MAX_HISTORY);
      conversationHistory = trimmed;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Could not save chat history:', e);
    }
    // Also save to server if logged in
    if (Aatman.auth && Aatman.auth.isLoggedIn()) {
      Aatman.auth.saveHistoryToServer(conversationHistory).catch(() => {});
    }
  }

  function clearHistory() {
    conversationHistory = [];
    localStorage.removeItem(STORAGE_KEY);
    const msgs = messagesEl.querySelectorAll('.message:not(#welcomeMsg)');
    msgs.forEach(m => m.remove());
    suggestBox.style.display = '';
    Aatman.toast('Conversation cleared. 🌸', 'info');
    // Clear server history too
    if (Aatman.auth && Aatman.auth.isLoggedIn()) {
      Aatman.auth.saveHistoryToServer([]).catch(() => {});
    }
  }

  // ─── Render saved history on page load ────────────────────────────
  function renderSavedHistory() {
    if (!conversationHistory.length) return;
    suggestBox.style.display = 'none';
    conversationHistory.forEach(msg => {
      if (msg.role === 'user') {
        appendUserMessage(msg.content, false);
      } else {
        appendAssistantMessage(msg.content, false);
      }
    });
    scrollToBottom();
  }

  // ─── UI: Append messages ──────────────────────────────────────────
  function appendUserMessage(text, animate = true) {
    const now = Aatman.utils.formatTime();
    const div = document.createElement('div');
    div.className = 'message message--user';
    div.innerHTML = `
      <div class="msg-avatar">🙏</div>
      <div class="msg-body">
        <div class="msg-bubble">${Aatman.utils.escapeHtml(text).replace(/\n/g, '<br>')}</div>
        <span class="msg-time">${now}</span>
      </div>
    `;
    messagesEl.appendChild(div);
    if (animate) scrollToBottom();
    return div;
  }

  function appendAssistantMessage(text, animate = true) {
    const now = Aatman.utils.formatTime();
    const div = document.createElement('div');
    div.className = 'message message--assistant';
    div.innerHTML = `
      <div class="msg-avatar" aria-hidden="true">ॐ</div>
      <div class="msg-body">
        <div class="msg-bubble">${Aatman.utils.parseMarkdown(text)}</div>
        <span class="msg-time">${now}</span>
      </div>
    `;
    messagesEl.appendChild(div);
    if (animate) scrollToBottom();
    return div;
  }

  function createStreamingBubble() {
    const now = Aatman.utils.formatTime();
    const div = document.createElement('div');
    div.className = 'message message--assistant';
    div.id = 'streaming-msg';
    div.innerHTML = `
      <div class="msg-avatar" aria-hidden="true">ॐ</div>
      <div class="msg-body">
        <div class="msg-bubble" id="streaming-bubble"></div>
        <span class="msg-time">${now}</span>
      </div>
    `;
    messagesEl.appendChild(div);
    scrollToBottom();
    return document.getElementById('streaming-bubble');
  }

  function showTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'typing-indicator';
    div.innerHTML = `
      <div class="msg-avatar" aria-hidden="true">ॐ</div>
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    `;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    document.getElementById('typing-indicator')?.remove();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // ─── Stop Button ──────────────────────────────────────────────────
  function showStopBtn() {
    if (stopBtn) stopBtn.classList.remove('hidden');
    if (sendBtn) sendBtn.classList.add('hidden');
  }

  function hideStopBtn() {
    if (stopBtn) stopBtn.classList.add('hidden');
    if (sendBtn) sendBtn.classList.remove('hidden');
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
    });
  }

  // ─── Language helper ──────────────────────────────────────────────
  function getCurrentLanguage() {
    // User profile takes priority over localStorage
    if (Aatman.auth && Aatman.auth.isLoggedIn()) {
      const user = Aatman.auth.getUser();
      if (user && user.profile && user.profile.language) {
        return user.profile.language;
      }
    }
    return localStorage.getItem('aatman_language') || 'english';
  }

  // ─── Send message ─────────────────────────────────────────────────
  async function sendMessage(userText) {
    userText = userText.trim();
    if (!userText || isStreaming) return;

    isStreaming = true;
    inputEl.disabled = true;
    showStopBtn();

    suggestBox.style.display = 'none';
    appendUserMessage(userText);
    conversationHistory.push({ role: 'user', content: userText });
    showTypingIndicator();

    let fullText = '';
    let streamingBubble = null;
    abortController = new AbortController();

    const language = getCurrentLanguage();

    // Build auth headers
    const headers = { 'Content-Type': 'application/json' };
    if (Aatman.auth && Aatman.auth.getToken()) {
      headers['Authorization'] = `Bearer ${Aatman.auth.getToken()}`;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        signal: abortController.signal,
        body: JSON.stringify({
          message: userText,
          history: conversationHistory.slice(0, -1),
          language,
        }),
      });

      if (!response.ok) {
        // Handle daily message limit (429)
        if (response.status === 429) {
          const limitData = await response.json();
          if (limitData.upgradeRequired && Aatman.subscription) {
            removeTypingIndicator();
            // Remove the user message we just added
            conversationHistory.pop();
            const lastUserBubble = messagesEl.querySelector('.message--user:last-of-type');
            if (lastUserBubble) lastUserBubble.remove();
            // Show upgrade banner
            Aatman.subscription.showUpgradeBanner();
            Aatman.toast(limitData.message || 'Daily message limit reached.', 'info');
            isStreaming = false;
            inputEl.disabled = false;
            hideStopBtn();
            return;
          }
        }
        throw new Error(`Server error: ${response.status}`);
      }
      if (!response.body) throw new Error('No response body');

      const reader  = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer    = '';

      removeTypingIndicator();
      streamingBubble = createStreamingBubble();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;

          // Only catch JSON.parse failures (incomplete chunks) — let all other
          // errors propagate to the outer catch so the bubble shows them.
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            continue; // skip malformed / partial JSON chunks
          }

          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) {
            fullText += parsed.text;
            streamingBubble.innerHTML = Aatman.utils.parseMarkdown(fullText);
            scrollToBottom();
          }
        }
      }

      // Final render — always clean up streaming IDs
      if (streamingBubble) {
        if (fullText) {
          streamingBubble.innerHTML = Aatman.utils.parseMarkdown(fullText);
        }
        document.getElementById('streaming-msg')?.removeAttribute('id');
        document.getElementById('streaming-bubble')?.removeAttribute('id');
      }

      if (fullText) {
        conversationHistory.push({ role: 'assistant', content: fullText });
        saveHistory();
      }

    } catch (err) {
      removeTypingIndicator();

      // User-initiated stop
      if (err.name === 'AbortError') {
        if (streamingBubble && fullText) {
          streamingBubble.innerHTML = Aatman.utils.parseMarkdown(fullText);
          document.getElementById('streaming-msg')?.removeAttribute('id');
          document.getElementById('streaming-bubble')?.removeAttribute('id');
          conversationHistory.push({ role: 'assistant', content: fullText });
          saveHistory();
        } else {
          // Remove empty bubble
          document.getElementById('streaming-msg')?.remove();
          // Remove the user message from history since we stopped before any response
          if (conversationHistory[conversationHistory.length - 1]?.role === 'user') {
            conversationHistory.pop();
          }
        }
        return; // exit cleanly without error toast
      }

      console.error('Chat error:', err);
      const errMsg = err.message.includes('Failed to fetch')
        ? 'Could not connect to Aatman. Please ensure the server is running. 🙏'
        : err.message || 'Something went quiet. Please try again.';

      if (streamingBubble) {
        streamingBubble.innerHTML = `<em style="color:var(--brown-muted)">${Aatman.utils.escapeHtml(errMsg)}</em>`;
        document.getElementById('streaming-msg')?.removeAttribute('id');
        document.getElementById('streaming-bubble')?.removeAttribute('id');
      } else {
        appendAssistantMessage(errMsg);
      }

      Aatman.toast(errMsg, 'error', 5000);
    } finally {
      isStreaming = false;
      abortController = null;
      hideStopBtn();
      inputEl.disabled = false;
      inputEl.focus();
      scrollToBottom();
    }
  }

  // ─── Language Switcher ────────────────────────────────────────────
  const langSwitchBtn  = document.getElementById('langSwitchBtn');
  const langDropdown   = document.getElementById('langDropdown');
  const currentLangDisplay = document.getElementById('currentLangDisplay');

  const LANG_LABELS = {
    english:  'English',
    hindi:    'हिंदी',
    tamil:    'தமிழ்',
    telugu:   'తెలుగు',
    bengali:  'বাংলা',
    marathi:  'मराठी',
    gujarati: 'ગુજરાતી',
  };

  function updateLangDisplay(lang) {
    if (currentLangDisplay) currentLangDisplay.textContent = LANG_LABELS[lang] || 'English';
    // Update active state in dropdown
    document.querySelectorAll('.lang-drop-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  function setLanguage(lang) {
    localStorage.setItem('aatman_language', lang);
    updateLangDisplay(lang);
    // Also save to user profile if logged in
    if (Aatman.auth && Aatman.auth.isLoggedIn()) {
      Aatman.auth.updateProfileLanguage(lang).catch(() => {});
    }
    langDropdown?.classList.add('hidden');
    Aatman.toast(`Language set to ${LANG_LABELS[lang] || lang}`, 'success');
  }

  if (langSwitchBtn) {
    langSwitchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langDropdown?.classList.toggle('hidden');
    });
  }

  document.querySelectorAll('.lang-drop-item').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.lang-switcher-bar')) {
      langDropdown?.classList.add('hidden');
    }
  });

  // Init language display
  updateLangDisplay(getCurrentLanguage());

  // ─── Input handling ───────────────────────────────────────────────
  function autoResize() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
  }

  inputEl.addEventListener('input', autoResize);

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = inputEl.value;
      if (text.trim()) {
        inputEl.value = '';
        autoResize();
        sendMessage(text);
      }
    }
  });

  sendBtn.addEventListener('click', () => {
    const text = inputEl.value;
    if (text.trim()) {
      inputEl.value = '';
      autoResize();
      sendMessage(text);
    }
  });

  suggChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const msg = chip.dataset.msg || chip.textContent.trim();
      sendMessage(msg);
    });
  });

  // ─── Clear chat shortcut ───────────────────────────────────────────
  document.getElementById('welcomeMsg')?.addEventListener('dblclick', () => {
    if (conversationHistory.length > 0 && confirm('Clear this conversation and start fresh?')) {
      clearHistory();
    }
  });

  // ─── Expose for external use ───────────────────────────────────────
  Aatman.chat = {
    sendMessage,
    clearHistory,
    loadHistoryFromArray,
    getHistory: () => conversationHistory,
    setLanguage,
    getCurrentLanguage,
    updateLangDisplay,
  };

  // ─── Init ──────────────────────────────────────────────────────────
  loadHistory();
  inputEl.focus();
})();
