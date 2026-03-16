/* ════════════════════════════════════════════════════════════════════
   AATMAN · routes/subscription.js
   Razorpay Subscription Management — Create, Verify, Cancel, Webhook
════════════════════════════════════════════════════════════════════ */

const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const User = require('../models/User');
const Payment = require('../models/Payment');

const router = express.Router();

// ─── Razorpay Instance ──────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── Helper: Check if user is premium ───────────────────────────────────────
function isPremium(user) {
  return user.subscription && user.subscription.status === 'active';
}

// ─── GET /api/subscription/status ───────────────────────────────────────────
// Returns current subscription status for logged-in user
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const sub = user.subscription || {};
    res.json({
      success: true,
      subscription: {
        status: sub.status || 'free',
        planType: sub.planType || null,
        currentPeriodEnd: sub.currentPeriodEnd || null,
        cancelledAt: sub.cancelledAt || null,
        isPremium: isPremium(user),
      },
    });
  } catch (err) {
    console.error('Subscription status error:', err);
    res.status(500).json({ error: 'Could not fetch subscription status.' });
  }
});

// ─── POST /api/subscription/create ──────────────────────────────────────────
// Creates a Razorpay subscription and returns details for Checkout
router.post('/create', async (req, res) => {
  const { planType } = req.body; // 'monthly' or 'yearly'

  if (!planType || !['monthly', 'yearly'].includes(planType)) {
    return res.status(400).json({ error: 'Invalid plan type. Must be "monthly" or "yearly".' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Don't allow if already active
    if (isPremium(user)) {
      return res.status(400).json({ error: 'You already have an active subscription.' });
    }

    // Select plan ID
    const planId = planType === 'yearly'
      ? process.env.RAZORPAY_PLAN_YEARLY
      : process.env.RAZORPAY_PLAN_MONTHLY;

    // Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: planType === 'yearly' ? 10 : 120,
      notes: {
        userId: user._id.toString(),
        userName: user.name,
        userEmail: user.email,
        planType,
      },
    });

    // Store subscription ID on user (pending state)
    user.subscription.razorpaySubscriptionId = subscription.id;
    user.subscription.planType = planType;
    await user.save();

    res.json({
      success: true,
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      planType,
      amount: planType === 'yearly' ? 999 : 149,
    });
  } catch (err) {
    console.error('Subscription create error:', err);
    res.status(500).json({ error: 'Could not create subscription. Please try again.' });
  }
});

// ─── POST /api/subscription/verify ──────────────────────────────────────────
// Verifies Razorpay payment signature after successful checkout
router.post('/verify', async (req, res) => {
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification details.' });
  }

  try {
    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_payment_id + '|' + razorpay_subscription_id)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.error('Signature mismatch:', { razorpay_payment_id, razorpay_subscription_id });
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // Update user subscription
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    const periodEnd = new Date(now);
    if (user.subscription.planType === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    user.subscription.status = 'active';
    user.subscription.razorpaySubscriptionId = razorpay_subscription_id;
    user.subscription.currentPeriodStart = now;
    user.subscription.currentPeriodEnd = periodEnd;
    user.subscription.cancelledAt = null;
    await user.save();

    // Log payment
    await Payment.create({
      userId: user._id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySubscriptionId: razorpay_subscription_id,
      amount: user.subscription.planType === 'yearly' ? 99900 : 14900,
      status: 'captured',
      planType: user.subscription.planType,
    });

    console.log(`✅ Subscription activated for ${user.email} — ${user.subscription.planType}`);

    res.json({
      success: true,
      message: 'Subscription activated successfully!',
      subscription: {
        status: 'active',
        planType: user.subscription.planType,
        currentPeriodEnd: periodEnd,
        isPremium: true,
      },
    });
  } catch (err) {
    console.error('Subscription verify error:', err);
    res.status(500).json({ error: 'Verification failed. Please contact support.' });
  }
});

// ─── POST /api/subscription/cancel ──────────────────────────────────────────
// Cancels the active subscription (user keeps access until period end)
router.post('/cancel', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!isPremium(user) || !user.subscription.razorpaySubscriptionId) {
      return res.status(400).json({ error: 'No active subscription to cancel.' });
    }

    // Cancel on Razorpay (cancel_at_cycle_end = true means access until period ends)
    await razorpay.subscriptions.cancel(user.subscription.razorpaySubscriptionId, {
      cancel_at_cycle_end: 1,
    });

    user.subscription.status = 'cancelled';
    user.subscription.cancelledAt = new Date();
    await user.save();

    console.log(`🔴 Subscription cancelled for ${user.email}`);

    res.json({
      success: true,
      message: 'Subscription cancelled. You\'ll keep access until ' +
        new Date(user.subscription.currentPeriodEnd).toLocaleDateString('en-IN'),
      subscription: {
        status: 'cancelled',
        planType: user.subscription.planType,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
        cancelledAt: user.subscription.cancelledAt,
        isPremium: false,
      },
    });
  } catch (err) {
    console.error('Subscription cancel error:', err);
    res.status(500).json({ error: 'Could not cancel subscription. Please try again.' });
  }
});

// ─── GET /api/subscription/history ──────────────────────────────────────────
// Returns payment history for logged-in user
router.get('/history', async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      payments: payments.map(p => ({
        id: p.razorpayPaymentId,
        amount: p.amount / 100, // convert paise to rupees
        currency: p.currency,
        status: p.status,
        planType: p.planType,
        date: p.createdAt,
      })),
    });
  } catch (err) {
    console.error('Payment history error:', err);
    res.status(500).json({ error: 'Could not fetch payment history.' });
  }
});

// ─── Export helpers for use in server.js ─────────────────────────────────────
router.isPremium = isPremium;

module.exports = router;
