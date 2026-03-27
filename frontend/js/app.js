/* ════════════════════════════════════════════════════════════════════
   AATMAN · app.js
   Core app: navigation, mobile menu, toast system, shared utilities
════════════════════════════════════════════════════════════════════ */

'use strict';

// ─── Global State ─────────────────────────────────────────────────────────────
window.Aatman = window.Aatman || {};

Aatman.state = {
  currentSection: 'chat',
};

// ─── Navigation ───────────────────────────────────────────────────────────────
(function initNavigation() {
  const allNavBtns = document.querySelectorAll('.nav-btn[data-section]');
  const sections = {
    chat:    document.getElementById('section-chat'),
    wisdom:  document.getElementById('section-wisdom'),
    bhakti:  document.getElementById('section-bhakti'),
    profile: document.getElementById('section-profile'),
  };

  function switchSection(name) {
    if (!sections[name]) return;
    if (Aatman.state.currentSection === name) return;

    // Hide current, show new
    Object.entries(sections).forEach(([key, el]) => {
      if (!el) return; // guard against missing sections
      if (key === name) {
        el.removeAttribute('hidden');
        el.classList.add('active');
      } else {
        el.setAttribute('hidden', '');
        el.classList.remove('active');
      }
    });

    // Update all nav buttons (desktop + mobile)
    allNavBtns.forEach(btn => {
      const isActive = btn.dataset.section === name;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    Aatman.state.currentSection = name;

    // Scroll to top of new section
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Section-specific init hooks
    if (name === 'wisdom' && typeof Aatman.wisdom?.onShow === 'function') {
      Aatman.wisdom.onShow();
    }
    if (name === 'bhakti' && typeof Aatman.bhakti?.onShow === 'function') {
      Aatman.bhakti.onShow();
    }
    if (name === 'profile' && typeof Aatman.profile?.onShow === 'function') {
      Aatman.profile.onShow();
    }
    if (name === 'kundli' && typeof Aatman.kundli?.onShow === 'function') {
      Aatman.kundli.onShow();
    }

    // Close mobile nav
    closeMobileNav();
  }

  allNavBtns.forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });

  // Expose for external use
  Aatman.navigate = switchSection;
})();

// ─── Mobile Menu ──────────────────────────────────────────────────────────────
(function initMobileMenu() {
  const toggleBtn = document.getElementById('mobileMenuBtn');
  const mobileNav = document.getElementById('mobileNav');
  if (!toggleBtn || !mobileNav) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = mobileNav.classList.contains('open');
    if (isOpen) {
      closeMobileNav();
    } else {
      mobileNav.classList.add('open');
      mobileNav.removeAttribute('aria-hidden');
      toggleBtn.classList.add('open');
      toggleBtn.setAttribute('aria-expanded', 'true');
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header-inner') && !e.target.closest('.mobile-nav')) {
      closeMobileNav();
    }
  });
})();

function closeMobileNav() {
  const mobileNav = document.getElementById('mobileNav');
  const toggleBtn = document.getElementById('mobileMenuBtn');
  if (!mobileNav) return;
  mobileNav.classList.remove('open');
  mobileNav.setAttribute('aria-hidden', 'true');
  if (toggleBtn) {
    toggleBtn.classList.remove('open');
    toggleBtn.setAttribute('aria-expanded', 'false');
  }
}

window.closeMobileNav = closeMobileNav;

// ─── Toast Notification System ────────────────────────────────────────────────
(function initToasts() {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  /**
   * Show a toast notification
   * @param {string} message
   * @param {'success'|'error'|'info'|'default'} [type='default']
   * @param {number} [duration=3500]
   */
  function showToast(message, type = 'default', duration = 3500) {
    const icons = {
      success: '✅',
      error:   '⚠️',
      info:    '🪷',
      default: 'ॐ',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.default}</span>
      <span class="toast-msg">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Auto-remove
    const remove = () => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
      // Fallback remove
      setTimeout(() => toast.remove(), 400);
    };

    toast.addEventListener('click', remove);
    setTimeout(remove, duration);
  }

  Aatman.toast = showToast;
})();

// ─── Shared Utilities ─────────────────────────────────────────────────────────

/** Escape HTML to prevent XSS */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Basic Markdown → HTML parser (subset used in chat)
 * Handles: **bold**, *italic*, `code`, > blockquote, \n\n paragraphs
 */
function parseMarkdown(text) {
  let html = escapeHtml(text);

  // Code blocks (```...```)
  html = html.replace(/```[\s\S]*?```/g, match => {
    const code = match.slice(3, -3).trim();
    return `<pre style="background:rgba(200,150,12,0.07);padding:0.75rem;border-radius:8px;font-size:0.85em;overflow-x:auto;margin:0.5rem 0;"><code>${code}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(200,150,12,0.1);padding:0.1em 0.3em;border-radius:3px;font-size:0.9em;">$1</code>');

  // Blockquotes (> lines)
  html = html.replace(/^&gt; ?(.+)$/gm, '<blockquote>$1</blockquote>');

  // Bold+italic ***
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

  // Bold **
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic *
  html = html.replace(/\*([^\s*].*?[^\s*])\*/g, '<em>$1</em>');

  // --- horizontal rule
  html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid var(--border-light);margin:0.75rem 0;">');

  // Line breaks → paragraphs
  html = html
    .split(/\n{2,}/)
    .map(para => para.trim())
    .filter(Boolean)
    .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');

  return html;
}

/** Format date as readable string */
function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

/** Format time as HH:MM */
function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/** Today's date key for localStorage (YYYY-MM-DD) */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Expose utilities
Aatman.utils = { escapeHtml, parseMarkdown, formatDate, formatTime, todayKey };
