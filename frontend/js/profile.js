/* ════════════════════════════════════════════════════════════════════
   AATMAN · profile.js
   Profile management, zodiac selection, daily horoscope
════════════════════════════════════════════════════════════════════ */

'use strict';

(function initProfile() {
  const HOROSCOPE_CACHE_KEY = 'aatman_horoscope_cache';

  // ─── DOM refs ──────────────────────────────────────────────────────
  const saveProfileBtn    = document.getElementById('saveProfileBtn');
  const profileNameInput  = document.getElementById('profileNameInput');
  const profileLangSelect = document.getElementById('profileLangSelect');
  const saveZodiacBtn     = document.getElementById('saveZodiacBtn');
  const zodiacSelectedDisplay = document.getElementById('zodiacSelectedDisplay');
  const westernBtn        = document.getElementById('westernBtn');
  const vedicBtn          = document.getElementById('vedicBtn');
  const westernGrid       = document.getElementById('westernZodiacGrid');
  const vedicGrid         = document.getElementById('vedicRashiGrid');
  const clearHistoryBtn   = document.getElementById('clearHistoryBtn');
  const exportHistoryBtn  = document.getElementById('exportHistoryBtn');
  const statMessages      = document.getElementById('statMessages');
  const statConversations = document.getElementById('statConversations');

  // Horoscope banner refs
  const horoscopeBanner   = document.getElementById('horoscopeBanner');
  const horoscopeBannerLoading = document.getElementById('horoscopeBannerLoading');
  const horoscopeBannerContent = document.getElementById('horoscopeBannerContent');
  const horoscopeSignBadge = document.getElementById('horoscopeSignBadge');
  const horoscopeSignName  = document.getElementById('horoscopeSignName');
  const horoscopeBannerGuidance = document.getElementById('horoscopeBannerGuidance');
  const horoscopeExpandBtn = document.getElementById('horoscopeExpandBtn');
  const horoscopeDetail    = document.getElementById('horoscopeDetail');
  const horoscopeMantra    = document.getElementById('horoscopeMantra');
  const horoscopeDeity     = document.getElementById('horoscopeDeity');
  const horoscopePractice  = document.getElementById('horoscopePractice');
  const horoscopeColor     = document.getElementById('horoscopeColor');

  // ─── Zodiac state ─────────────────────────────────────────────────
  let selectedSystem = 'western';
  let selectedSign   = '';

  const ZODIAC_GLYPHS = {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
    Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
    Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
    Mesha: '♈', Vrishabha: '♉', Mithuna: '♊', Karka: '♋',
    Simha: '♌', Kanya: '♍', Tula: '♎', Vrishchika: '♏',
    Dhanu: '♐', Makara: '♑', Kumbha: '♒', Meena: '♓',
  };

  // ─── System toggle ────────────────────────────────────────────────
  if (westernBtn) {
    westernBtn.addEventListener('click', () => {
      selectedSystem = 'western';
      westernBtn.classList.add('active');
      vedicBtn.classList.remove('active');
      westernGrid.classList.remove('hidden');
      vedicGrid.classList.add('hidden');
      clearZodiacSelection();
    });
  }

  if (vedicBtn) {
    vedicBtn.addEventListener('click', () => {
      selectedSystem = 'vedic';
      vedicBtn.classList.add('active');
      westernBtn.classList.remove('active');
      vedicGrid.classList.remove('hidden');
      westernGrid.classList.add('hidden');
      clearZodiacSelection();
    });
  }

  function clearZodiacSelection() {
    selectedSign = '';
    document.querySelectorAll('.zodiac-sign-btn').forEach(b => b.classList.remove('selected'));
    if (zodiacSelectedDisplay) {
      zodiacSelectedDisplay.innerHTML = '<p class="zodiac-no-selection">Select your sign above to receive daily spiritual guidance on the chat dashboard.</p>';
    }
  }

  // ─── Sign selection ───────────────────────────────────────────────
  document.querySelectorAll('.zodiac-sign-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sign   = btn.dataset.sign;
      const system = btn.dataset.system;

      // Only allow selection in current system view
      if (system !== selectedSystem) return;

      selectedSign   = sign;
      selectedSystem = system;

      document.querySelectorAll('.zodiac-sign-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      const glyph = ZODIAC_GLYPHS[sign] || '✨';
      if (zodiacSelectedDisplay) {
        zodiacSelectedDisplay.innerHTML = `
          <div class="zodiac-selected-info">
            <span class="zodiac-selected-glyph">${glyph}</span>
            <div>
              <strong>${sign}</strong>
              <span class="zodiac-system-tag">${system === 'vedic' ? 'Vedic Rashi' : 'Western Zodiac'}</span>
            </div>
          </div>
        `;
      }
    });
  });

  // ─── Save zodiac ──────────────────────────────────────────────────
  if (saveZodiacBtn) {
    saveZodiacBtn.addEventListener('click', async () => {
      if (!selectedSign) {
        Aatman.toast('Please select a sign first', 'error');
        return;
      }

      const updates = {
        zodiacSystem: selectedSystem,
        zodiacSign: selectedSystem === 'western' ? selectedSign : '',
        rashi:      selectedSystem === 'vedic'   ? selectedSign : '',
      };

      try {
        if (Aatman.auth && Aatman.auth.isLoggedIn()) {
          await Aatman.auth.updateProfile(updates);
        } else {
          // Save locally for guests
          localStorage.setItem('aatman_zodiac', JSON.stringify(updates));
        }
        Aatman.toast(`${selectedSign} saved! Your daily guidance will appear on the dashboard. 🌟`, 'success');

        // Fetch horoscope immediately
        const cacheKey = `${Aatman.utils.todayKey()}_${selectedSign}`;
        localStorage.removeItem(HOROSCOPE_CACHE_KEY); // clear cache to force refresh
        fetchAndShowHoroscope(selectedSign, selectedSystem);
      } catch (err) {
        Aatman.toast('Could not save sign. Please try again.', 'error');
      }
    });
  }

  // ─── Save profile ─────────────────────────────────────────────────
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
      const name = profileNameInput?.value.trim();
      const lang = profileLangSelect?.value;
      if (!name) { Aatman.toast('Please enter your name', 'error'); return; }

      try {
        if (Aatman.auth && Aatman.auth.isLoggedIn()) {
          const user = await Aatman.auth.updateProfile({ name, language: lang });
          Aatman.auth.updateProfileUI();
        } else {
          localStorage.setItem('aatman_guest_name', name);
        }

        // Update language in chat
        if (lang && window.Aatman?.chat?.setLanguage) {
          Aatman.chat.setLanguage(lang);
        }
        Aatman.toast('Profile saved! 🙏', 'success');
      } catch (err) {
        Aatman.toast(err.message || 'Could not save profile', 'error');
      }
    });
  }

  // ─── Chat History Stats ────────────────────────────────────────────
  function updateHistoryStats() {
    let history = [];
    try {
      const saved = localStorage.getItem('aatman_chat_history');
      if (saved) history = JSON.parse(saved);
    } catch (e) {}

    if (statMessages) statMessages.textContent = history.length;
    if (statConversations) {
      const pairs = history.filter(m => m.role === 'user').length;
      statConversations.textContent = pairs;
    }
  }

  // ─── Clear history button (in profile) ────────────────────────────
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (!confirm('Clear all chat history? This cannot be undone.')) return;
      if (window.Aatman?.chat?.clearHistory) {
        Aatman.chat.clearHistory();
      }
      updateHistoryStats();
      Aatman.toast('Chat history cleared.', 'info');
    });
  }

  // ─── Export history ────────────────────────────────────────────────
  if (exportHistoryBtn) {
    exportHistoryBtn.addEventListener('click', () => {
      let history = [];
      try {
        const saved = localStorage.getItem('aatman_chat_history');
        if (saved) history = JSON.parse(saved);
      } catch (e) {}

      if (!history.length) {
        Aatman.toast('No chat history to export', 'info');
        return;
      }

      const text = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n---\n\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `aatman-chat-${Aatman.utils.todayKey()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ─── Horoscope Banner ─────────────────────────────────────────────
  function getSignFromUser() {
    // Try logged in user profile first
    if (Aatman.auth && Aatman.auth.isLoggedIn()) {
      const user = Aatman.auth.getUser();
      if (user?.profile) {
        if (user.profile.zodiacSystem === 'vedic' && user.profile.rashi) {
          return { sign: user.profile.rashi, system: 'vedic' };
        }
        if (user.profile.zodiacSign) {
          return { sign: user.profile.zodiacSign, system: 'western' };
        }
      }
    }
    // Fallback to localStorage for guests
    try {
      const saved = localStorage.getItem('aatman_zodiac');
      if (saved) {
        const data = JSON.parse(saved);
        const sign = data.zodiacSystem === 'vedic' ? data.rashi : data.zodiacSign;
        if (sign) return { sign, system: data.zodiacSystem || 'western' };
      }
    } catch (e) {}
    return null;
  }

  async function fetchAndShowHoroscope(sign, system) {
    if (!horoscopeBanner) return;

    // Check cache (valid for today)
    const cacheKey = `${Aatman.utils.todayKey()}_${sign}_${system}`;
    try {
      const cached = JSON.parse(localStorage.getItem(HOROSCOPE_CACHE_KEY) || 'null');
      if (cached && cached.key === cacheKey && cached.data) {
        renderHoroscope(cached.data, sign, system);
        return;
      }
    } catch (e) {}

    // Show loading
    horoscopeBanner.classList.remove('hidden');
    horoscopeBannerLoading.classList.remove('hidden');
    horoscopeBannerContent.classList.add('hidden');

    const headers = { 'Content-Type': 'application/json' };
    if (Aatman.auth?.getToken()) headers['Authorization'] = `Bearer ${Aatman.auth.getToken()}`;

    try {
      const res = await fetch('/api/horoscope', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sign, system }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');

      // Cache
      localStorage.setItem(HOROSCOPE_CACHE_KEY, JSON.stringify({ key: cacheKey, data: data.horoscope }));
      renderHoroscope(data.horoscope, sign, system);
    } catch (err) {
      horoscopeBanner.classList.add('hidden');
      console.warn('Horoscope fetch error:', err);
    }
  }

  function renderHoroscope(h, sign, system) {
    if (!horoscopeBanner) return;
    const glyph = ZODIAC_GLYPHS[sign] || '✨';

    horoscopeBannerLoading.classList.add('hidden');
    horoscopeBannerContent.classList.remove('hidden');
    horoscopeBanner.classList.remove('hidden');

    if (horoscopeSignBadge) horoscopeSignBadge.textContent = glyph;
    if (horoscopeSignName) horoscopeSignName.textContent = `${sign} · ${system === 'vedic' ? 'Vedic Rashi' : 'Western'}`;
    if (horoscopeBannerGuidance) horoscopeBannerGuidance.textContent = h.guidance || '';

    if (horoscopeMantra)   horoscopeMantra.textContent   = h.mantra || '';
    if (horoscopeDeity)    horoscopeDeity.textContent    = h.deity  || '';
    if (horoscopePractice) horoscopePractice.textContent = h.practice || '';
    if (horoscopeColor)    horoscopeColor.textContent    = h.auspicious_color || '';
  }

  // ─── Expand/collapse horoscope detail ─────────────────────────────
  if (horoscopeExpandBtn) {
    horoscopeExpandBtn.addEventListener('click', () => {
      const isOpen = !horoscopeDetail.classList.contains('hidden');
      horoscopeDetail.classList.toggle('hidden', isOpen);
      horoscopeExpandBtn.classList.toggle('expanded', !isOpen);
    });
  }

  // ─── Populate profile section when user logs in ───────────────────
  function onUserLogin(user) {
    updateHistoryStats();

    // Pre-fill zodiac selection
    if (user?.profile?.zodiacSystem) {
      selectedSystem = user.profile.zodiacSystem;
      if (selectedSystem === 'vedic') {
        vedicBtn?.classList.add('active');
        westernBtn?.classList.remove('active');
        westernGrid?.classList.add('hidden');
        vedicGrid?.classList.remove('hidden');
        selectedSign = user.profile.rashi || '';
      } else {
        selectedSign = user.profile.zodiacSign || '';
      }

      if (selectedSign) {
        // Highlight the selected sign button
        const btn = document.querySelector(`.zodiac-sign-btn[data-sign="${selectedSign}"][data-system="${selectedSystem}"]`);
        if (btn) {
          btn.classList.add('selected');
          const glyph = ZODIAC_GLYPHS[selectedSign] || '✨';
          if (zodiacSelectedDisplay) {
            zodiacSelectedDisplay.innerHTML = `
              <div class="zodiac-selected-info">
                <span class="zodiac-selected-glyph">${glyph}</span>
                <div>
                  <strong>${selectedSign}</strong>
                  <span class="zodiac-system-tag">${selectedSystem === 'vedic' ? 'Vedic Rashi' : 'Western Zodiac'}</span>
                </div>
              </div>
            `;
          }
        }

        // Fetch today's horoscope
        fetchAndShowHoroscope(selectedSign, selectedSystem);
      }
    }
  }

  // ─── Section onShow hook ───────────────────────────────────────────
  function onShow() {
    updateHistoryStats();
  }

  // ─── Check if user already has a sign (on load) ────────────────────
  function initHoroscope() {
    const signData = getSignFromUser();
    if (signData) {
      fetchAndShowHoroscope(signData.sign, signData.system);
    }
  }

  // ─── Expose ────────────────────────────────────────────────────────
  Aatman.profile = {
    onUserLogin,
    onShow,
    initHoroscope,
  };

  // Run after auth may have set user
  setTimeout(initHoroscope, 500);

})();
