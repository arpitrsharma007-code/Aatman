/* ════════════════════════════════════════════════════════════════════
   AATMAN · wisdom.js
   Daily Wisdom Scheduler: settings, API fetch, card render, history,
   browser notifications, scheduler (time-based trigger)
════════════════════════════════════════════════════════════════════ */

'use strict';

(function initWisdom() {
  // ─── DOM refs ──────────────────────────────────────────────────────
  const timeInput       = document.getElementById('wisdomTime');
  const scriptureSelect = document.getElementById('wisdomScripture');
  const themeSelect     = document.getElementById('wisdomTheme');
  const notifCheckbox   = document.getElementById('notifEnabled');
  const saveBtn         = document.getElementById('saveWisdomSettings');
  const fetchNowBtn     = document.getElementById('fetchWisdomNow');

  const statusDot       = document.getElementById('statusIndicator')?.querySelector('.status-dot');
  const statusText      = document.getElementById('statusIndicator')?.querySelector('.status-text');
  const statusDetail    = document.getElementById('statusDetail');

  const wisdomPlaceholder = document.getElementById('wisdomPlaceholder');
  const wisdomCard        = document.getElementById('wisdomCard');
  const wisdomLoading     = document.getElementById('wisdomLoading');

  // Wisdom card fields
  const scriptureTag  = document.getElementById('wisdomScriptureTag');
  const wisdomRef     = document.getElementById('wisdomRef');
  const devanagariEl  = document.getElementById('verseDevanagari');
  const translitEl    = document.getElementById('verseTranslit');
  const translationEl = document.getElementById('verseTranslation');
  const meaningEl     = document.getElementById('verseMeaning');
  const practiceEl    = document.getElementById('versePractice');
  const deityEl       = document.getElementById('verseDeity');
  const dateEl        = document.getElementById('wisdomDate');

  const wisdomShareBtn = document.getElementById('wisdomShareBtn');
  const wisdomSaveBtn  = document.getElementById('wisdomSaveBtn');

  const historyGrid  = document.getElementById('wisdomHistoryGrid');
  const historyEmpty = document.getElementById('historyEmpty');

  // Notification popup
  const notifPopup   = document.getElementById('wisdomNotif');
  const notifClose   = document.getElementById('notifClose');
  const notifViewBtn = document.getElementById('notifViewBtn');
  const notifScriptureEl = document.getElementById('notifScripture');
  const notifVerseEl     = document.getElementById('notifVerse');

  // ─── Storage keys ──────────────────────────────────────────────────
  const SETTINGS_KEY = 'aatman_wisdom_settings';
  const HISTORY_KEY  = 'aatman_wisdom_history';
  const TODAY_KEY    = 'aatman_wisdom_today';

  // ─── State ─────────────────────────────────────────────────────────
  let settings = {
    time:        '07:00',
    scripture:   'Bhagavad Gita',
    theme:       '',
    notifEnabled: false,
    active:      false,
  };

  let wisdomHistory = [];       // array of { date, wisdom } objects
  let schedulerTimer = null;
  let currentWisdom  = null;

  // ─── Load & Save Settings ─────────────────────────────────────────
  function loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) Object.assign(settings, JSON.parse(saved));
    } catch (e) {
      console.warn('Could not load wisdom settings:', e);
    }
    applySettingsToUI();
  }

  function saveSettings() {
    settings.time       = timeInput?.value   || '07:00';
    settings.scripture  = scriptureSelect?.value || 'Bhagavad Gita';
    settings.theme      = themeSelect?.value || '';
    settings.notifEnabled = notifCheckbox?.checked || false;
    settings.active     = true;

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save wisdom settings:', e);
    }

    updateSchedulerStatus();
    startScheduler();

    if (settings.notifEnabled) requestNotifPermission();

    Aatman.toast('Daily wisdom settings saved! 🙏', 'success');
  }

  function applySettingsToUI() {
    if (timeInput)       timeInput.value       = settings.time;
    if (scriptureSelect) scriptureSelect.value = settings.scripture;
    if (themeSelect)     themeSelect.value     = settings.theme || '';
    if (notifCheckbox)   notifCheckbox.checked = settings.notifEnabled;
    updateSchedulerStatus();
  }

  // ─── Load & Save History ──────────────────────────────────────────
  function loadHistory() {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) wisdomHistory = JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load wisdom history:', e);
    }
    renderHistory();

    // Check if we already fetched today
    const todayEntry = getTodayEntry();
    if (todayEntry) {
      currentWisdom = todayEntry.wisdom;
      renderWisdomCard(todayEntry.wisdom);
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(wisdomHistory));
    } catch (e) {
      console.warn('Could not save wisdom history:', e);
    }
  }

  function getTodayEntry() {
    const today = Aatman.utils.todayKey();
    return wisdomHistory.find(e => e.date === today) || null;
  }

  // ─── Scheduler Status UI ─────────────────────────────────────────
  function updateSchedulerStatus() {
    if (!statusDot || !statusText || !statusDetail) return;

    if (settings.active) {
      statusDot.classList.add('active');
      statusText.textContent = 'Scheduler active';
      statusDetail.textContent = `Daily wisdom from ${settings.scripture} will appear at ${settings.time} while the app is open.`;
    } else {
      statusDot.classList.remove('active');
      statusText.textContent = 'Scheduler inactive';
      statusDetail.textContent = 'Save your settings to activate the daily wisdom scheduler.';
    }
  }

  // ─── Browser Notifications ────────────────────────────────────────
  function requestNotifPermission() {
    if (!('Notification' in window)) {
      Aatman.toast('Browser notifications are not supported.', 'error');
      return;
    }
    if (Notification.permission === 'granted') return;
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        Aatman.toast('Notifications enabled! 🌸', 'success');
      } else {
        Aatman.toast('Notifications blocked by browser.', 'info');
        if (notifCheckbox) notifCheckbox.checked = false;
        settings.notifEnabled = false;
      }
    });
  }

  function sendBrowserNotification(wisdom) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    new Notification('🌅 Your Daily Wisdom — Aatman', {
      body: `${wisdom.scripture}: ${wisdom.translation}`,
      icon: '/favicon.ico',
    });
  }

  // ─── Fetch Wisdom from API ────────────────────────────────────────
  async function fetchWisdom(force = false) {
    // Check if already fetched today (unless forced)
    if (!force && getTodayEntry()) {
      Aatman.toast('You already received today\'s wisdom. 🌸', 'info');
      return;
    }

    // Show loading
    showState('loading');

    // Resolve scripture (handle "random")
    let scripture = settings.scripture;
    if (scripture === 'random') {
      const scriptures = [
        'Bhagavad Gita', 'Upanishads', 'Ramayana',
        'Mahabharata', 'Rigveda', 'Yoga Sutras of Patanjali',
      ];
      scripture = scriptures[Math.floor(Math.random() * scriptures.length)];
    }

    try {
      const res = await fetch('/api/wisdom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scripture, theme: settings.theme }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json();
      if (!data.success || !data.wisdom) throw new Error(data.error || 'No wisdom received');

      const wisdom = data.wisdom;
      currentWisdom = wisdom;

      // Save to history
      const today = Aatman.utils.todayKey();
      const existingIdx = wisdomHistory.findIndex(e => e.date === today);
      const entry = { date: today, dateLabel: Aatman.utils.formatDate(), wisdom };

      if (existingIdx >= 0) {
        wisdomHistory[existingIdx] = entry;
      } else {
        wisdomHistory.unshift(entry); // newest first
      }

      // Keep max 60 entries
      if (wisdomHistory.length > 60) wisdomHistory = wisdomHistory.slice(0, 60);

      saveHistory();
      renderHistory();
      renderWisdomCard(wisdom);
      showState('card');

      // Notifications
      if (settings.notifEnabled) sendBrowserNotification(wisdom);
      showNotifPopup(wisdom);

    } catch (err) {
      console.error('Wisdom fetch error:', err);
      showState('placeholder');

      const errMsg = err.message.includes('Failed to fetch')
        ? 'Could not connect to Aatman server. Is it running?'
        : err.message || 'Could not fetch wisdom. Please try again.';

      Aatman.toast(errMsg, 'error', 5000);
    }
  }

  // ─── State toggling ───────────────────────────────────────────────
  function showState(state) {
    wisdomPlaceholder?.classList.toggle('hidden', state !== 'placeholder');
    wisdomCard?.classList.toggle('hidden', state !== 'card');
    wisdomLoading?.classList.toggle('hidden', state !== 'loading');
  }

  // ─── Render Wisdom Card ───────────────────────────────────────────
  function renderWisdomCard(wisdom) {
    if (!wisdomCard) return;

    if (scriptureTag) scriptureTag.textContent  = wisdom.scripture || 'Scripture';
    if (wisdomRef)    wisdomRef.textContent      = wisdom.chapter_reference || '';
    if (devanagariEl) devanagariEl.textContent   = wisdom.sanskrit || '';
    if (translitEl)   translitEl.textContent     = wisdom.transliteration || '';
    if (translationEl) translationEl.textContent = wisdom.translation || '';
    if (meaningEl)    meaningEl.textContent      = wisdom.meaning || '';
    if (practiceEl)   practiceEl.textContent     = wisdom.reflection || '';
    if (deityEl)      deityEl.textContent        = wisdom.deity_connection || '';
    if (dateEl)       dateEl.textContent         = Aatman.utils.formatDate();

    // Show/hide optional blocks
    const deityBlock    = document.getElementById('wisdomDeityBlock');
    const practiceBlock = document.getElementById('wisdomPracticeBlock');
    if (deityBlock)    deityBlock.style.display    = wisdom.deity_connection ? '' : 'none';
    if (practiceBlock) practiceBlock.style.display = wisdom.reflection ? '' : 'none';

    // Reset save button
    if (wisdomSaveBtn) wisdomSaveBtn.classList.remove('saved');

    showState('card');
  }

  // ─── Render History Grid ──────────────────────────────────────────
  function renderHistory() {
    if (!historyGrid) return;

    // Remove old cards (keep #historyEmpty)
    historyGrid.querySelectorAll('.history-card').forEach(c => c.remove());

    if (!wisdomHistory.length) {
      if (historyEmpty) historyEmpty.style.display = '';
      return;
    }

    if (historyEmpty) historyEmpty.style.display = 'none';

    wisdomHistory.forEach((entry, idx) => {
      const { dateLabel, wisdom } = entry;
      const card = document.createElement('div');
      card.className = 'history-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Wisdom from ${wisdom.scripture} on ${dateLabel}`);

      card.innerHTML = `
        <div class="history-card-scripture">${Aatman.utils.escapeHtml(wisdom.scripture || '')}</div>
        <p class="history-card-verse">${Aatman.utils.escapeHtml(wisdom.translation || '')}</p>
        <div class="history-card-date">${Aatman.utils.escapeHtml(dateLabel || entry.date)}</div>
      `;

      card.addEventListener('click', () => {
        currentWisdom = wisdom;
        renderWisdomCard(wisdom);
        if (dateEl) dateEl.textContent = dateLabel || entry.date;
        // Scroll to top of wisdom main
        document.querySelector('.wisdom-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      });

      historyGrid.appendChild(card);
    });
  }

  // ─── Notification popup ───────────────────────────────────────────
  function showNotifPopup(wisdom) {
    if (!notifPopup) return;
    if (notifScriptureEl) notifScriptureEl.textContent = wisdom.scripture || '';
    if (notifVerseEl)     notifVerseEl.textContent     = wisdom.translation || '';

    notifPopup.classList.remove('hidden');

    // Auto-hide after 10 seconds
    setTimeout(() => notifPopup.classList.add('hidden'), 10000);
  }

  notifClose?.addEventListener('click', () => notifPopup?.classList.add('hidden'));
  notifViewBtn?.addEventListener('click', () => {
    notifPopup?.classList.add('hidden');
    Aatman.navigate('wisdom');
  });

  // ─── Share & Save buttons ─────────────────────────────────────────
  wisdomShareBtn?.addEventListener('click', async () => {
    if (!currentWisdom) return;
    const text = `✨ Daily Wisdom from ${currentWisdom.scripture}\n\n"${currentWisdom.translation}"\n\n${currentWisdom.meaning}\n\n— Aatman, Hindu Spiritual AI Companion`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Daily Wisdom from Aatman', text });
      } catch (e) {
        if (e.name !== 'AbortError') Aatman.toast('Could not share.', 'error');
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        Aatman.toast('Wisdom copied to clipboard! 🪷', 'success');
      } catch (e) {
        Aatman.toast('Could not copy to clipboard.', 'error');
      }
    }
  });

  wisdomSaveBtn?.addEventListener('click', () => {
    if (!currentWisdom) return;
    wisdomSaveBtn.classList.add('saved');
    Aatman.toast('Verse saved to your journey! 🌸', 'success');
  });

  // ─── Scheduler ────────────────────────────────────────────────────
  function startScheduler() {
    if (schedulerTimer) clearInterval(schedulerTimer);

    schedulerTimer = setInterval(() => {
      if (!settings.active) return;

      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

      if (hhmm === settings.time) {
        // Check we haven't already served today
        if (!getTodayEntry()) {
          fetchWisdom(false);
        }
      }
    }, 30000); // check every 30 seconds
  }

  // ─── Event Listeners ─────────────────────────────────────────────
  saveBtn?.addEventListener('click', saveSettings);
  fetchNowBtn?.addEventListener('click', () => fetchWisdom(true));

  // ─── onShow hook (called when wisdom section becomes visible) ──────
  Aatman.wisdom = {
    onShow() {
      // If no wisdom shown yet but history has today's, render it
      if (!currentWisdom) {
        const todayEntry = getTodayEntry();
        if (todayEntry) {
          currentWisdom = todayEntry.wisdom;
          renderWisdomCard(todayEntry.wisdom);
        } else {
          showState('placeholder');
        }
      }
    },
  };

  // ─── Init ──────────────────────────────────────────────────────────
  loadSettings();
  loadHistory();
  if (settings.active) startScheduler();
})();
