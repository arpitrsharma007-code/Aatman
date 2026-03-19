/* ════════════════════════════════════════════════════════════════════
   AATMAN · astrology-promo.js
   Astrology waitlist: one-time modal, persistent banner, chat nudge
════════════════════════════════════════════════════════════════════ */

'use strict';

(function initAstrologyPromo() {
  const PROMO_SEEN_KEY  = 'aatman_astrology_promo_seen';
  const WAITLIST_KEY    = 'aatman_astrology_joined';
  const BANNER_CLOSED   = 'aatman_astrology_banner_closed';
  const NUDGE_SHOWN_KEY = 'aatman_astrology_nudge_shown';

  // ─── DOM refs ──────────────────────────────────────────────────────
  const modal         = document.getElementById('astrologyPromoModal');
  const modalForm     = document.getElementById('astrologyModalForm');
  const modalEmail    = document.getElementById('astrologyModalEmail');
  const modalSubmit   = document.getElementById('astrologyModalSubmit');
  const modalSuccess  = document.getElementById('astrologyModalSuccess');
  const modalDismiss  = document.getElementById('astrologyModalDismiss');
  const banner        = document.getElementById('astrologyBanner');
  const bannerCta     = document.getElementById('astrologyBannerCta');
  const bannerClose   = document.getElementById('astrologyBannerClose');

  // ─── Helper: submit email to waitlist ─────────────────────────────
  async function joinWaitlist(email, source) {
    const headers = { 'Content-Type': 'application/json' };
    if (Aatman.auth && Aatman.auth.getToken()) {
      headers['Authorization'] = `Bearer ${Aatman.auth.getToken()}`;
    }
    const res = await fetch('/api/waitlist/astrology', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, source }),
    });
    return res.json();
  }

  // ─── Helper: get user email if logged in ──────────────────────────
  function getUserEmail() {
    if (Aatman.auth && Aatman.auth.isLoggedIn()) {
      const user = Aatman.auth.getUser();
      return user?.email || '';
    }
    return '';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 1. ONE-TIME MODAL — show once after login (after onboarding clears)
  // ═══════════════════════════════════════════════════════════════════
  function maybeShowModal() {
    if (!modal) return;
    const alreadySeen = localStorage.getItem(PROMO_SEEN_KEY);
    const alreadyJoined = localStorage.getItem(WAITLIST_KEY);
    if (alreadySeen || alreadyJoined) {
      // Skip modal, but maybe show banner
      maybeShowBanner();
      return;
    }

    // Delay modal slightly so it doesn't clash with onboarding
    setTimeout(() => {
      // Don't show if onboarding is still visible
      const onboarding = document.getElementById('onboardingModal');
      if (onboarding && !onboarding.classList.contains('hidden')) {
        // Wait for onboarding to close, then show
        const observer = new MutationObserver(() => {
          if (onboarding.classList.contains('hidden')) {
            observer.disconnect();
            setTimeout(() => showModal(), 500);
          }
        });
        observer.observe(onboarding, { attributes: true, attributeFilter: ['class'] });
        return;
      }
      showModal();
    }, 800);
  }

  function showModal() {
    if (!modal) return;
    // Pre-fill email if logged in
    const email = getUserEmail();
    if (email && modalEmail) modalEmail.value = email;

    modal.classList.remove('hidden');
    localStorage.setItem(PROMO_SEEN_KEY, '1');
  }

  function hideModal() {
    if (!modal) return;
    modal.classList.add('hiding');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('hiding');
      // After modal closes, show banner if they didn't join
      if (!localStorage.getItem(WAITLIST_KEY)) {
        maybeShowBanner();
      }
    }, 300);
  }

  // Modal submit
  if (modalSubmit) {
    modalSubmit.addEventListener('click', async () => {
      const email = modalEmail?.value?.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Aatman.toast('Please enter a valid email', 'error');
        return;
      }
      modalSubmit.disabled = true;
      modalSubmit.textContent = 'Joining...';
      try {
        const data = await joinWaitlist(email, 'modal');
        if (data.success) {
          localStorage.setItem(WAITLIST_KEY, '1');
          if (modalForm) modalForm.classList.add('hidden');
          if (modalSuccess) modalSuccess.classList.remove('hidden');
          if (modalDismiss) modalDismiss.textContent = 'Close';
          Aatman.toast('You\'re on the Jyotish waitlist!', 'success');
          // Hide banner since they joined
          if (banner) banner.classList.add('hidden');
        } else {
          Aatman.toast(data.error || 'Something went wrong', 'error');
        }
      } catch (err) {
        Aatman.toast('Could not join waitlist. Try again.', 'error');
      }
      modalSubmit.disabled = false;
      modalSubmit.textContent = 'Notify me when it launches';
    });
  }

  // Modal dismiss
  if (modalDismiss) {
    modalDismiss.addEventListener('click', hideModal);
  }

  // Close on overlay click
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal();
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. PERSISTENT BANNER — shown after modal dismissed (if not joined)
  // ═══════════════════════════════════════════════════════════════════
  function maybeShowBanner() {
    if (!banner) return;
    const joined = localStorage.getItem(WAITLIST_KEY);
    const closed = localStorage.getItem(BANNER_CLOSED);
    if (joined || closed) return;
    banner.classList.remove('hidden');
  }

  // Banner CTA — open modal for email input
  if (bannerCta) {
    bannerCta.addEventListener('click', () => {
      // Reset modal form state
      if (modalForm) modalForm.classList.remove('hidden');
      if (modalSuccess) modalSuccess.classList.add('hidden');
      if (modalSubmit) {
        modalSubmit.disabled = false;
        modalSubmit.textContent = 'Notify me when it launches';
      }
      const email = getUserEmail();
      if (email && modalEmail) modalEmail.value = email;
      if (modal) modal.classList.remove('hidden');
    });
  }

  // Banner close
  if (bannerClose) {
    bannerClose.addEventListener('click', () => {
      localStorage.setItem(BANNER_CLOSED, '1');
      banner.classList.add('hidden');
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. CHAT NUDGE — after conversations about life/relationships/career
  // ═══════════════════════════════════════════════════════════════════
  const NUDGE_TOPICS = [
    'career', 'job', 'naukri', 'kaam', 'promotion', 'salary', 'business',
    'marriage', 'shaadi', 'relationship', 'rishta', 'partner', 'husband', 'wife', 'pyaar', 'love',
    'future', 'bhavishya', 'destiny', 'kismat', 'luck', 'fate',
    'health', 'sehat', 'illness', 'bimari',
    'money', 'paisa', 'wealth', 'dhan', 'finance', 'investment',
    'child', 'bachcha', 'baby', 'santan', 'fertility',
    'travel', 'move', 'abroad', 'videsh',
    'education', 'exam', 'padhai', 'study',
    'decision', 'confused', 'choice', 'faisla',
  ];

  function shouldShowNudge(userMessage) {
    // Don't show if already joined or nudge was already shown this session
    if (localStorage.getItem(WAITLIST_KEY)) return false;
    if (sessionStorage.getItem(NUDGE_SHOWN_KEY)) return false;

    const lower = userMessage.toLowerCase();
    return NUDGE_TOPICS.some(topic => lower.includes(topic));
  }

  function showChatNudge() {
    const messagesEl = document.getElementById('messagesContainer');
    if (!messagesEl) return;

    // Remove any existing nudge
    document.querySelector('.astrology-chat-nudge')?.remove();

    sessionStorage.setItem(NUDGE_SHOWN_KEY, '1');

    const div = document.createElement('div');
    div.className = 'astrology-chat-nudge';
    div.innerHTML = `
      <span class="astrology-nudge-text">Want deeper guidance? Vedic astrology is coming to Aatman — get personalized jyotish insights.</span>
      <button class="astrology-nudge-btn">Join waitlist</button>
      <button class="astrology-nudge-dismiss" aria-label="Dismiss">&#x2715;</button>
    `;

    messagesEl.appendChild(div);
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });

    // Join handler — open the modal
    div.querySelector('.astrology-nudge-btn').addEventListener('click', () => {
      if (modalForm) modalForm.classList.remove('hidden');
      if (modalSuccess) modalSuccess.classList.add('hidden');
      if (modalSubmit) {
        modalSubmit.disabled = false;
        modalSubmit.textContent = 'Notify me when it launches';
      }
      const email = getUserEmail();
      if (email && modalEmail) modalEmail.value = email;
      if (modal) modal.classList.remove('hidden');
      div.remove();
    });

    // Dismiss
    div.querySelector('.astrology-nudge-dismiss').addEventListener('click', () => {
      div.style.opacity = '0';
      setTimeout(() => div.remove(), 300);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXPOSE for other modules
  // ═══════════════════════════════════════════════════════════════════
  Aatman.astrologyPromo = {
    maybeShowModal,
    maybeShowBanner,
    shouldShowNudge,
    showChatNudge,
  };
})();
