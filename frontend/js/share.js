// ─── Aatman Share Utilities ──────────────────────────────────────────────────
// WhatsApp sharing for wisdom cards, chat conversations, and viral prompts

(function initShare() {
  'use strict';

  const APP_URL = 'https://aatman-production.up.railway.app';
  let sessionMsgCount = 0;
  let sharePromptShown = false;

  // ─── 1. Wisdom Card Share Button ──────────────────────────────────────
  const wisdomShareBtn = document.getElementById('wisdomShareBtn');
  if (wisdomShareBtn) {
    wisdomShareBtn.addEventListener('click', () => {
      const scripture = document.getElementById('wisdomScriptureTag')?.textContent || 'Sacred Scripture';
      const ref = document.getElementById('wisdomRef')?.textContent || '';
      const translation = document.getElementById('verseTranslation')?.textContent || '';

      const preview = translation.length > 120 ? translation.slice(0, 120) + '...' : translation;
      const text = `"${preview}"\n\n— ${scripture} ${ref}\n\nI received this wisdom from Aatman, a Hindu spiritual AI companion. Try it:\n${APP_URL}?ref=wa-wisdom`;

      openWhatsApp(text);
    });
  }

  // ─── 2. Post-Chat Share Prompt ────────────────────────────────────────
  // Show a gentle share CTA after 3+ message exchanges in a session

  // Track messages by observing the messages container
  const messagesContainer = document.getElementById('messagesContainer');
  if (messagesContainer) {
    const observer = new MutationObserver(() => {
      // Count assistant messages (each complete response = 1 exchange)
      const assistantMsgs = messagesContainer.querySelectorAll('.message--assistant');
      // Subtract 1 for the welcome message
      sessionMsgCount = Math.max(0, assistantMsgs.length - 1);

      if (sessionMsgCount >= 3 && !sharePromptShown) {
        sharePromptShown = true;
        showChatSharePrompt();
      }
    });
    observer.observe(messagesContainer, { childList: true, subtree: true });
  }

  function showChatSharePrompt() {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem('aatman_share_dismissed')) return;

    const prompt = document.createElement('div');
    prompt.className = 'chat-share-prompt';
    prompt.innerHTML = `
      <div class="chat-share-inner">
        <span class="chat-share-text">This conversation resonated? Share Aatman with someone who needs it.</span>
        <div class="chat-share-actions">
          <button class="btn btn--small btn--whatsapp" id="chatShareWaBtn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.386 0-4.592-.826-6.325-2.21l-.39-.312-2.647.888.888-2.647-.312-.39A9.935 9.935 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
            </svg>
            Share on WhatsApp
          </button>
          <button class="chat-share-dismiss" id="chatShareDismiss" aria-label="Dismiss">&times;</button>
        </div>
      </div>
    `;

    // Insert above the chat input
    const inputWrapper = document.querySelector('.chat-input-wrapper');
    if (inputWrapper) {
      inputWrapper.parentNode.insertBefore(prompt, inputWrapper);

      // Animate in
      requestAnimationFrame(() => prompt.classList.add('visible'));

      document.getElementById('chatShareWaBtn').addEventListener('click', () => {
        const text = `I just had a meaningful spiritual conversation on Aatman — an AI companion rooted in the Gita, Upanishads, and Vedic wisdom. It responds in Hindi, English, or Hinglish.\n\nWorth trying if you've ever wanted thoughtful spiritual guidance without judgment.\n\n${APP_URL}?ref=wa-chat`;
        openWhatsApp(text);
      });

      document.getElementById('chatShareDismiss').addEventListener('click', () => {
        prompt.classList.remove('visible');
        setTimeout(() => prompt.remove(), 300);
        sessionStorage.setItem('aatman_share_dismissed', '1');
      });
    }
  }

  // ─── 3. Generic Share + Native Share API ──────────────────────────────
  function openWhatsApp(text) {
    // Try native share first (works great on mobile)
    if (navigator.share) {
      navigator.share({
        title: 'Aatman — Hindu Spiritual AI Companion',
        text: text,
        url: APP_URL + '?ref=wa-native',
      }).catch(() => {
        // Fallback to WhatsApp direct
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  }

  // ─── Expose globally ──────────────────────────────────────────────────
  Aatman.share = { openWhatsApp };
})();
