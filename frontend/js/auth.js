/* ════════════════════════════════════════════════════════════════════
   AATMAN · auth.js
   Authentication: login, signup, JWT, session, language modal
════════════════════════════════════════════════════════════════════ */

'use strict';

(function initAuth() {
  const TOKEN_KEY   = 'aatman_token';
  const USER_KEY    = 'aatman_user';
  const LANG_KEY    = 'aatman_language';
  const LANG_SET_KEY = 'aatman_lang_set';

  // ─── State ──────────────────────────────────────────────────────────
  let currentUser  = null;
  let currentToken = null;

  // ─── DOM refs ────────────────────────────────────────────────────────
  const authOverlay    = document.getElementById('authOverlay');
  const loginForm      = document.getElementById('loginForm');
  const signupForm     = document.getElementById('signupForm');
  const loginTabBtn    = document.getElementById('loginTabBtn');
  const signupTabBtn   = document.getElementById('signupTabBtn');
  const loginError     = document.getElementById('loginError');
  const signupError    = document.getElementById('signupError');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const signupSubmitBtn = document.getElementById('signupSubmitBtn');
  const guestBtn       = document.getElementById('guestBtn');

  const langModal      = document.getElementById('langModal');
  const langOptionsGrid = document.getElementById('langOptionsGrid');
  const langConfirmBtn = document.getElementById('langConfirmBtn');

  // ─── Token helpers ───────────────────────────────────────────────────
  function getToken() {
    return currentToken || localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    return currentUser;
  }

  function isLoggedIn() {
    return !!(currentToken && currentUser);
  }

  function getAuthHeaders() {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // ─── Auth Overlay ────────────────────────────────────────────────────
  function showAuthOverlay() {
    if (authOverlay) authOverlay.classList.add('visible');
  }

  function hideAuthOverlay() {
    if (authOverlay) {
      authOverlay.classList.add('hiding');
      setTimeout(() => {
        authOverlay.classList.remove('visible', 'hiding');
      }, 400);
    }
  }

  // ─── Tab switching ────────────────────────────────────────────────────
  if (loginTabBtn) {
    loginTabBtn.addEventListener('click', () => {
      loginTabBtn.classList.add('active');
      signupTabBtn.classList.remove('active');
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      clearErrors();
    });
  }

  if (signupTabBtn) {
    signupTabBtn.addEventListener('click', () => {
      signupTabBtn.classList.add('active');
      loginTabBtn.classList.remove('active');
      signupForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
      clearErrors();
    });
  }

  function clearErrors() {
    if (loginError) { loginError.textContent = ''; loginError.classList.add('hidden'); }
    if (signupError) { signupError.textContent = ''; signupError.classList.add('hidden'); }
  }

  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function setButtonLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.style.opacity = loading ? '0.7' : '1';
  }

  // ─── Login ────────────────────────────────────────────────────────────
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      const email    = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      if (!email || !password) return showError(loginError, 'Please fill in all fields');

      setButtonLoading(loginSubmitBtn, true);
      try {
        const res  = await fetch('/api/auth/login', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) return showError(loginError, data.error || 'Login failed');

        onLoginSuccess(data);
      } catch (err) {
        showError(loginError, 'Connection error. Please try again.');
      } finally {
        setButtonLoading(loginSubmitBtn, false);
      }
    });
  }

  // ─── Signup ───────────────────────────────────────────────────────────
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      const name     = document.getElementById('signupName').value.trim();
      const email    = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      if (!name || !email || !password) return showError(signupError, 'Please fill in all fields');
      if (password.length < 6) return showError(signupError, 'Password must be at least 6 characters');

      setButtonLoading(signupSubmitBtn, true);
      try {
        const res  = await fetch('/api/auth/register', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) return showError(signupError, data.error || 'Registration failed');

        onLoginSuccess(data);
      } catch (err) {
        showError(signupError, 'Connection error. Please try again.');
      } finally {
        setButtonLoading(signupSubmitBtn, false);
      }
    });
  }

  // ─── Guest mode ───────────────────────────────────────────────────────
  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      hideAuthOverlay();
      checkLanguageModal();
    });
  }

  // ─── On successful auth ───────────────────────────────────────────────
  function onLoginSuccess(data) {
    currentToken = data.token;
    currentUser  = data.user;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    // Sync language from profile
    if (data.user.profile?.language) {
      localStorage.setItem(LANG_KEY, data.user.profile.language);
      if (window.Aatman?.chat?.updateLangDisplay) {
        Aatman.chat.updateLangDisplay(data.user.profile.language);
      }
    }

    hideAuthOverlay();

    // Load server chat history
    if (data.chatHistory && data.chatHistory.length) {
      if (window.Aatman?.chat?.loadHistoryFromArray) {
        Aatman.chat.loadHistoryFromArray(data.chatHistory);
      } else {
        // chat.js not loaded yet — store and let it pick up
        localStorage.setItem('aatman_chat_history', JSON.stringify(data.chatHistory));
      }
    }

    // Update profile UI
    updateProfileUI();

    // Check if language needs to be set
    const langSet = localStorage.getItem(LANG_SET_KEY);
    if (!langSet && !data.user.profile?.language) {
      checkLanguageModal();
    } else {
      localStorage.setItem(LANG_SET_KEY, '1');
    }

    // Notify profile module
    if (window.Aatman?.profile?.onUserLogin) {
      Aatman.profile.onUserLogin(currentUser);
    }
  }

  // ─── Language Modal ────────────────────────────────────────────────────
  let selectedLang = localStorage.getItem(LANG_KEY) || 'english';

  function checkLanguageModal() {
    const langSet = localStorage.getItem(LANG_SET_KEY);
    if (!langSet) {
      showLangModal();
    }
  }

  function showLangModal() {
    if (langModal) langModal.classList.remove('hidden');
    // Highlight current selection
    document.querySelectorAll('.lang-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === selectedLang);
    });
  }

  function hideLangModal() {
    if (langModal) {
      langModal.classList.add('hiding');
      setTimeout(() => {
        langModal.classList.add('hidden');
        langModal.classList.remove('hiding');
      }, 300);
    }
  }

  // Language option selection
  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedLang = btn.dataset.lang;
      document.querySelectorAll('.lang-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  if (langConfirmBtn) {
    langConfirmBtn.addEventListener('click', () => {
      localStorage.setItem(LANG_KEY, selectedLang);
      localStorage.setItem(LANG_SET_KEY, '1');

      // Update chat module
      if (window.Aatman?.chat?.updateLangDisplay) {
        Aatman.chat.updateLangDisplay(selectedLang);
      }

      // Save to server profile if logged in
      if (isLoggedIn()) {
        updateProfileLanguage(selectedLang).catch(() => {});
      }

      hideLangModal();
      Aatman.toast(`Language set to ${selectedLang}`, 'success');
    });
  }

  // ─── Profile UI update ─────────────────────────────────────────────────
  function updateProfileUI() {
    if (!currentUser) return;
    const nameEl      = document.getElementById('profileDisplayName');
    const emailEl     = document.getElementById('profileEmail');
    const sinceEl     = document.getElementById('profileMemberSince');
    const navLabelEl  = document.getElementById('profileNavLabel');
    const nameInputEl = document.getElementById('profileNameInput');
    const langSelectEl = document.getElementById('profileLangSelect');

    if (nameEl) nameEl.textContent = currentUser.name || 'Seeker';
    if (emailEl) emailEl.textContent = currentUser.email || '';
    if (navLabelEl) navLabelEl.textContent = currentUser.name ? currentUser.name.split(' ')[0] : 'Profile';
    if (nameInputEl) nameInputEl.value = currentUser.name || '';
    if (langSelectEl) langSelectEl.value = currentUser.profile?.language || 'english';

    if (sinceEl && currentUser.createdAt) {
      const date = new Date(currentUser.createdAt);
      sinceEl.textContent = `Member since ${date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
    }
  }

  // ─── Logout ────────────────────────────────────────────────────────────
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (!confirm('Sign out of Aatman?')) return;
      logout();
    });
  }

  function logout() {
    currentToken = null;
    currentUser  = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Keep language preference
    // Clear chat history from localStorage
    localStorage.removeItem('aatman_chat_history');
    // Show auth overlay
    showAuthOverlay();
    // Clear chat UI
    if (window.Aatman?.chat?.clearHistory) {
      Aatman.chat.clearHistory();
    }
  }

  // ─── Server profile update ─────────────────────────────────────────────
  async function updateProfileLanguage(lang) {
    if (!isLoggedIn()) return;
    const res = await fetch('/api/auth/profile', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body:    JSON.stringify({ language: lang }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        currentUser = data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        hideAuthOverlay();
      }
    }
  }

  async function updateProfile(updates) {
    if (!isLoggedIn()) return null;
    const res = await fetch('/api/auth/profile', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body:    JSON.stringify(updates),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
    const data = await res.json();
    if (data.user) {
      currentUser = data.user;
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    }
    return data.user;
  }

  async function saveHistoryToServer(history) {
    if (!isLoggedIn()) return;
    return fetch('/api/auth/save-history', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body:    JSON.stringify({ history }),
    });
  }

  // ─── Initialize ────────────────────────────────────────────────────────
  async function init() {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser  = localStorage.getItem(USER_KEY);

    if (savedToken && savedUser) {
      currentToken = savedToken;
      currentUser  = JSON.parse(savedUser);

      // Verify token with server
      try {
        const res  = await fetch('/api/auth/me', {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          currentUser = data.user;
          localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
          // Load fresh server history
          if (data.chatHistory && data.chatHistory.length) {
            localStorage.setItem('aatman_chat_history', JSON.stringify(data.chatHistory));
          }
          // Sync language
          if (currentUser.profile?.language) {
            localStorage.setItem(LANG_KEY, currentUser.profile.language);
          }
          updateProfileUI();
          if (window.Aatman?.profile?.onUserLogin) {
            Aatman.profile.onUserLogin(currentUser);
          }
          hideAuthOverlay();
          localStorage.setItem(LANG_SET_KEY, '1');
        } else {
          // Token invalid
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          currentToken = null;
          currentUser  = null;
          showAuthOverlay();
        }
      } catch (e) {
        // Network error — allow offline with cached user
        updateProfileUI();
      }
    } else {
      // No saved session — show auth
      showAuthOverlay();
    }
  }

  // ─── Expose ────────────────────────────────────────────────────────────
  Aatman.auth = {
    isLoggedIn,
    getToken,
    getUser,
    getAuthHeaders,
    logout,
    updateProfile,
    updateProfileLanguage,
    saveHistoryToServer,
    updateProfileUI,
  };

  // Run init
  init().catch(console.error);

})();
