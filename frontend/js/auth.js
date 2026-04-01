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
      if (authOverlay.classList.contains('visible')) {
        authOverlay.classList.add('hiding');
        setTimeout(() => {
          authOverlay.classList.remove('visible', 'hiding');
        }, 400);
      } else {
        // Never shown — just ensure classes are clean, no animation
        authOverlay.classList.remove('visible', 'hiding');
      }
    }
  }

  // ─── Landing Page & App Shell Visibility ────────────────────────
  function hideLanding() {
    const lp = document.getElementById('aatmanLanding');
    if (lp) lp.style.display = 'none';
    // Show the app
    const header = document.querySelector('header.header');
    const main = document.querySelector('main.main');
    if (header) header.style.display = '';
    if (main) main.style.display = '';
  }

  function showLanding() {
    const lp = document.getElementById('aatmanLanding');
    if (lp) lp.style.display = '';
    // Hide the app
    const header = document.querySelector('header.header');
    const main = document.querySelector('main.main');
    if (header) header.style.display = 'none';
    if (main) main.style.display = 'none';
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

      // ─── Compliance: Validate consent checkboxes ───────────────
      const ageOk     = document.getElementById('ageVerify')?.checked;
      const aiOk      = document.getElementById('aiDisclosure')?.checked;
      const privacyOk = document.getElementById('privacyConsent')?.checked;
      const tosOk     = document.getElementById('tosAccept')?.checked;
      const consentErr = document.getElementById('consentError');
      if (!ageOk || !aiOk || !privacyOk || !tosOk) {
        if (consentErr) consentErr.classList.remove('hidden');
        return showError(signupError, 'Please accept all required items.');
      }
      if (consentErr) consentErr.classList.add('hidden');

      setButtonLoading(signupSubmitBtn, true);
      try {
        const res  = await fetch('/api/auth/register', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, email, password, consentGiven: true, aiDisclosureAccepted: true, ageVerified: true }),
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
    hideLanding();

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

    // Sync subscription state
    if (data.subscription && window.Aatman?.subscription) {
      Aatman.subscription.handleAuthSubscription(data.subscription);
    } else if (window.Aatman?.subscription) {
      Aatman.subscription.fetchStatus();
    }

    // ─── Compliance: Show onboarding modal on first login ────────
    const hasSeenOnboarding = localStorage.getItem('aatman_onboarding_seen');
    if (!hasSeenOnboarding) {
      const modal = document.getElementById('onboardingModal');
      if (modal) modal.classList.remove('hidden');
    }

    // ─── Astrology promo: show modal (waits for onboarding to clear) ─
    if (window.Aatman?.astrologyPromo?.maybeShowModal) {
      Aatman.astrologyPromo.maybeShowModal();
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
    // Clear chat UI before reload
    if (window.Aatman?.chat?.clearHistory) {
      Aatman.chat.clearHistory();
    }
    // Reload page — cleanest way to reset all UI state
    window.location.reload();
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
          // Sync subscription state
          if (data.subscription && window.Aatman?.subscription) {
            Aatman.subscription.handleAuthSubscription(data.subscription);
          } else if (window.Aatman?.subscription) {
            Aatman.subscription.fetchStatus();
          }
          hideAuthOverlay();
          hideLanding();
          localStorage.setItem(LANG_SET_KEY, '1');
          // ─── Compliance: Show onboarding if not seen ───────────
          if (!localStorage.getItem('aatman_onboarding_seen')) {
            const modal = document.getElementById('onboardingModal');
            if (modal) modal.classList.remove('hidden');
          }
        } else {
          // Token invalid — show auth overlay so user can sign in again
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          currentToken = null;
          currentUser  = null;
          showAuthOverlay();
        }
      } catch (e) {
        // Network error — allow offline with cached user
        updateProfileUI();
        hideLanding();
      }
    } else {
      // No saved session — show auth overlay
      showAuthOverlay();
    }
  }

  // ─── Onboarding Modal Dismiss ────────────────────────────────────
  const onboardingDismissBtn = document.getElementById('onboardingDismissBtn');
  if (onboardingDismissBtn) {
    onboardingDismissBtn.addEventListener('click', () => {
      const modal = document.getElementById('onboardingModal');
      if (modal) modal.classList.add('hidden');
      localStorage.setItem('aatman_onboarding_seen', 'true');
    });
  }

  // ─── Compliance: Data & Privacy Buttons ─────────────────────────
  const exportDataBtn = document.getElementById('exportDataBtn');
  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', async () => {
      if (!isLoggedIn()) return Aatman.toast('Please sign in first.', 'error');
      try {
        const res = await fetch('/api/account/export-data', { headers: getAuthHeaders() });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'aatman-data-export.json'; a.click();
        URL.revokeObjectURL(url);
        Aatman.toast('Data exported successfully.', 'success');
      } catch (err) {
        Aatman.toast('Export failed. Please try again.', 'error');
      }
    });
  }

  const withdrawConsentBtn = document.getElementById('withdrawConsentBtn');
  if (withdrawConsentBtn) {
    withdrawConsentBtn.addEventListener('click', async () => {
      if (!isLoggedIn()) return;
      if (!confirm('Withdrawing consent will deactivate your account. Continue?')) return;
      try {
        const res = await fetch('/api/account/withdraw-consent', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        });
        const data = await res.json();
        Aatman.toast(data.message || 'Consent withdrawn.', 'info');
        logout();
      } catch (err) {
        Aatman.toast('Failed. Please try again.', 'error');
      }
    });
  }

  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async () => {
      if (!isLoggedIn()) return;
      if (!confirm('This will PERMANENTLY delete your account and ALL data. This cannot be undone. Are you sure?')) return;
      const password = prompt('Enter your password to confirm deletion:');
      if (!password) return;
      try {
        const res = await fetch('/api/account/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ password }),
        });
        const data = await res.json();
        if (res.ok) {
          Aatman.toast('Account deleted. All data will be erased.', 'info');
          logout();
        } else {
          Aatman.toast(data.error || 'Deletion failed.', 'error');
        }
      } catch (err) {
        Aatman.toast('Failed. Please contact support.', 'error');
      }
    });
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
    showAuthOverlay,
  };

  // Run init
  init().catch(console.error);

})();
