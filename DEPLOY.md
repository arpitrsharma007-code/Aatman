# Aatman Razorpay Update — Deployment Guide

## Files Changed/Added

### New Files
- `backend/models/Payment.js` — Payment history model
- `backend/routes/subscription.js` — Create, verify, cancel, status, history endpoints
- `backend/routes/webhook.js` — Razorpay webhook receiver
- `frontend/js/subscription.js` — Frontend subscription management & Razorpay Checkout

### Modified Files
- `backend/models/User.js` — Added subscription fields + daily message tracking
- `backend/server.js` — Mounted routes, added message limit middleware, subscription in auth responses
- `frontend/index.html` — Added Razorpay script, subscription card, upgrade banner
- `frontend/js/chat.js` — Handles 429 (limit reached) response → shows upgrade banner
- `frontend/js/auth.js` — Passes subscription data on login and /me
- `frontend/css/styles.css` — Subscription card, plan buttons, upgrade banner styles
- `package.json` — Added `razorpay` dependency

## Deployment Steps (PowerShell)

### 1. Copy files into your local Aatman project
Copy the entire folder structure over your existing project files.

### 2. Install the new dependency
```powershell
cd your-aatman-project
npm install razorpay
```

### 3. Add environment variables to Railway
Go to Railway Dashboard → Your Aatman Service → Variables → Add:
```
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_PLAN_MONTHLY=plan_xxxxx
RAZORPAY_PLAN_YEARLY=plan_xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx
```

For the webhook secret: Go to Razorpay Dashboard → Webhooks → Create → 
Set URL to: https://your-railway-url/api/webhooks/razorpay
Copy the generated secret and add it as RAZORPAY_WEBHOOK_SECRET.

### 4. Push to GitHub and deploy
```powershell
git add .
git commit -m "feat: add Razorpay subscription integration (Bhakt plan)"
git push origin main
```
Railway will auto-deploy.

### 5. Configure Razorpay Webhook
In Razorpay Dashboard → Webhooks → Create:
- **URL:** `https://your-railway-url.railway.app/api/webhooks/razorpay`
- **Events:** subscription.activated, subscription.charged, subscription.cancelled, subscription.halted, subscription.completed, payment.failed

### 6. Test the flow
1. Sign in to Aatman
2. Go to Profile → see "Your Plan" card
3. Click Monthly or Yearly → Razorpay Checkout opens
4. Use test card: 4111 1111 1111 1111 (any expiry, any CVV)
5. Verify subscription activates
6. Send 6+ messages to verify limit works for free users
