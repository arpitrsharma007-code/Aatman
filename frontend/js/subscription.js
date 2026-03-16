/* ════════════════════════════════════════════════════════════════════
   AATMAN · subscription.js
   Razorpay subscription management — checkout, status, cancellation
════════════════════════════════════════════════════════════════════ */

'use strict';

(function initSubscription() {
  // ─── State ────────────────────────────────────────────────────────
  let currentSubscription = { status: 'free', isPremium: false };

  // ─── DOM refs ─────────────────────────────────────────────────────
  const subBadge        = document.getElementById('subBadge');
  const subLimitText    = document.getElementById('subLimitText');
  const subUpgradeArea  = document.getElementById('subUpgradeArea');
  const subActiveArea   = document.getElementById('subActiveArea');
  const subActivePlan   = document.getElementById('subActivePlan');
  const subRenewDate    = document.getElementById('subRenewDate');
  const subMonthlyBtn   = document.getElementById('subMonthlyBtn');
  const subYearlyBtn    = document.getElementById('subYearlyBtn');
  const subCancelBtn    = document.getElementById('subCancelBtn');

  // Upgrade banner
  const upgradeBanner      = document.getElementById('upgradeBanner');
  const upgradeBannerClose = document.getElementById('upgradeBannerClose');
  const upgradeBannerMonthly = document.getElementById('upgradeBannerMonthly');
  const upgradeBannerYearly  = document.getElementById('upgradeBannerYearly');

  // ─── Helpers ──────────────────────────────────────────────────────
  function getToken() {
    return Aatman.auth ? Aatman.auth.getToken() : localStorage.getItem('aatman_token');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  // ─── Update UI based on subscription state ────────────────────────
  function updateUI(sub) {
    currentSubscription = sub || currentSubscription;
    const isPremium = currentSubscription.isPremium || currentSubscription.status === 'active';

    if (!subBadge) return;

    if (isPremium) {
      // Active subscriber
      subBadge.textContent = 'Bhakt (Premium)';
      subBadge.className = 'sub-badge sub-badge--premium';
      subLimitText.textContent = 'Unlimited messages';
      subUpgradeArea.classList.add('hidden');
      subActiveArea.classList.remove('hidden');
      subActivePlan.textContent = currentSubscription.planType === 'yearly'
        ? 'Yearly — ₹999/year'
        : 'Monthly — ₹149/month';
      subRenewDate.textContent = formatDate(currentSubscription.currentPeriodEnd);
    } else if (currentSubscription.status === 'cancelled') {
      subBadge.textContent = 'Cancelled';
      subBadge.className = 'sub-badge sub-badge--cancelled';
      subLimitText.textContent = `Access until ${formatDate(currentSubscription.currentPeriodEnd)}`;
      subUpgradeArea.classList.remove('hidden');
      subActiveArea.classList.add('hidden');
    } else {
      // Free user
      subBadge.textContent = 'Sadhak (Free)';
      subBadge.className = 'sub-badge sub-badge--free';
      subLimitText.textContent = '5 messages per day';
      subUpgradeArea.classList.remove('hidden');
      subActiveArea.classList.add('hidden');
    }
  }

  // ─── Fetch subscription status ────────────────────────────────────
  async function fetchStatus() {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch('/api/subscription/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        updateUI(data.subscription);
      }
    } catch (err) {
      console.warn('Could not fetch subscription status:', err);
    }
  }

  // ─── Handle subscription from login/me response ───────────────────
  function handleAuthSubscription(sub) {
    if (sub) updateUI(sub);
  }

  // ─── Open Razorpay Checkout ───────────────────────────────────────
  async function subscribe(planType) {
    const token = getToken();
    if (!token) {
      Aatman.toast('Please sign in to subscribe.', 'error');
      return;
    }

    try {
      // 1. Create subscription on backend
      const res = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ planType }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        Aatman.toast(data.error || 'Could not create subscription.', 'error');
        return;
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'Aatman',
        description: planType === 'yearly' ? 'Bhakt Yearly Plan' : 'Bhakt Monthly Plan',
        image: '/icon-192.png',
        theme: { color: '#FF9933' },
        handler: async function (response) {
          // 3. Verify payment
          await verifyPayment(response);
        },
        modal: {
          ondismiss: function () {
            Aatman.toast('Payment cancelled. You can try again anytime.', 'info');
          },
        },
        prefill: {
          email: Aatman.auth ? Aatman.auth.getUser()?.email : '',
          name: Aatman.auth ? Aatman.auth.getUser()?.name : '',
        },
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        Aatman.toast('Payment failed: ' + (response.error?.description || 'Please try again.'), 'error');
      });
      rzp.open();

    } catch (err) {
      console.error('Subscribe error:', err);
      Aatman.toast('Something went wrong. Please try again.', 'error');
    }
  }

  // ─── Verify Payment ───────────────────────────────────────────────
  async function verifyPayment(response) {
    const token = getToken();
    try {
      const res = await fetch('/api/subscription/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_subscription_id: response.razorpay_subscription_id,
          razorpay_signature: response.razorpay_signature,
        }),
      });

      const data = await res.json();
      if (data.success) {
        Aatman.toast('Welcome to Bhakt! Your spiritual journey is now unlimited. 🙏', 'success');
        updateUI(data.subscription);
        hideUpgradeBanner();
      } else {
        Aatman.toast(data.error || 'Verification failed. Please contact support.', 'error');
      }
    } catch (err) {
      console.error('Verify error:', err);
      Aatman.toast('Verification failed. If charged, please contact support.', 'error');
    }
  }

  // ─── Cancel Subscription ──────────────────────────────────────────
  async function cancelSubscription() {
    const token = getToken();
    if (!confirm('Are you sure you want to cancel? You\'ll keep access until your current period ends.')) {
      return;
    }

    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        Aatman.toast(data.message, 'info');
        updateUI(data.subscription);
      } else {
        Aatman.toast(data.error || 'Could not cancel. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      Aatman.toast('Cancellation failed. Please try again.', 'error');
    }
  }

  // ─── Upgrade Banner (shown when hitting message limit) ────────────
  function showUpgradeBanner() {
    if (upgradeBanner) upgradeBanner.classList.remove('hidden');
  }

  function hideUpgradeBanner() {
    if (upgradeBanner) upgradeBanner.classList.add('hidden');
  }

  // ─── Event Listeners ──────────────────────────────────────────────
  if (subMonthlyBtn) {
    subMonthlyBtn.addEventListener('click', () => subscribe('monthly'));
  }
  if (subYearlyBtn) {
    subYearlyBtn.addEventListener('click', () => subscribe('yearly'));
  }
  if (subCancelBtn) {
    subCancelBtn.addEventListener('click', cancelSubscription);
  }
  if (upgradeBannerClose) {
    upgradeBannerClose.addEventListener('click', hideUpgradeBanner);
  }
  if (upgradeBannerMonthly) {
    upgradeBannerMonthly.addEventListener('click', () => { hideUpgradeBanner(); subscribe('monthly'); });
  }
  if (upgradeBannerYearly) {
    upgradeBannerYearly.addEventListener('click', () => { hideUpgradeBanner(); subscribe('yearly'); });
  }

  // ─── Expose to global Aatman namespace ────────────────────────────
  window.Aatman = window.Aatman || {};
  Aatman.subscription = {
    fetchStatus,
    handleAuthSubscription,
    subscribe,
    showUpgradeBanner,
    hideUpgradeBanner,
    isPremium: () => currentSubscription.isPremium || currentSubscription.status === 'active',
    getStatus: () => currentSubscription,
    updateUI,
  };
})();
