/* ════════════════════════════════════════════════════════════════════
   AATMAN · routes/webhook.js
   Razorpay Webhook Receiver — Source of truth for subscription state
════════════════════════════════════════════════════════════════════ */

const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Payment = require('../models/Payment');

const router = express.Router();

// ─── Webhook Signature Verification ─────────────────────────────────────────
function verifyWebhookSignature(body, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('⚠️  RAZORPAY_WEBHOOK_SECRET not set — skipping verification in dev');
    return true; // Allow in dev/test when secret isn't configured yet
  }
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  return expectedSignature === signature;
}

// ─── Find user by Razorpay subscription ID ──────────────────────────────────
async function findUserBySubscriptionId(subscriptionId) {
  return User.findOne({ 'subscription.razorpaySubscriptionId': subscriptionId });
}

// ─── POST /api/webhooks/razorpay ────────────────────────────────────────────
router.post('/razorpay', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  // Verify signature
  if (!verifyWebhookSignature(req.body, signature)) {
    console.error('❌ Webhook signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body.event;
  const payload = req.body.payload;

  console.log(`📩 Razorpay webhook: ${event}`);

  try {
    switch (event) {
      // ── Subscription activated (first payment successful) ──
      case 'subscription.activated': {
        const subId = payload.subscription?.entity?.id;
        if (!subId) break;
        const user = await findUserBySubscriptionId(subId);
        if (!user) { console.warn('User not found for sub:', subId); break; }

        const now = new Date();
        const periodEnd = new Date(now);
        if (user.subscription.planType === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        user.subscription.status = 'active';
        user.subscription.currentPeriodStart = now;
        user.subscription.currentPeriodEnd = periodEnd;
        user.subscription.cancelledAt = null;
        await user.save();
        console.log(`  ✅ Activated: ${user.email}`);
        break;
      }

      // ── Recurring payment charged ──
      case 'subscription.charged': {
        const subEntity = payload.subscription?.entity;
        const payEntity = payload.payment?.entity;
        if (!subEntity?.id) break;
        const user = await findUserBySubscriptionId(subEntity.id);
        if (!user) break;

        // Extend period
        const now = new Date();
        const periodEnd = new Date(now);
        if (user.subscription.planType === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        user.subscription.status = 'active';
        user.subscription.currentPeriodStart = now;
        user.subscription.currentPeriodEnd = periodEnd;
        await user.save();

        // Log payment
        if (payEntity) {
          await Payment.create({
            userId: user._id,
            razorpayPaymentId: payEntity.id,
            razorpaySubscriptionId: subEntity.id,
            amount: payEntity.amount || 0,
            status: 'captured',
            planType: user.subscription.planType,
          });
        }
        console.log(`  💰 Charged: ${user.email} — ₹${(payEntity?.amount || 0) / 100}`);
        break;
      }

      // ── Subscription cancelled ──
      case 'subscription.cancelled': {
        const subId = payload.subscription?.entity?.id;
        if (!subId) break;
        const user = await findUserBySubscriptionId(subId);
        if (!user) break;

        user.subscription.status = 'cancelled';
        user.subscription.cancelledAt = new Date();
        await user.save();
        console.log(`  🔴 Cancelled: ${user.email}`);
        break;
      }

      // ── Subscription halted (payment failures) ──
      case 'subscription.halted': {
        const subId = payload.subscription?.entity?.id;
        if (!subId) break;
        const user = await findUserBySubscriptionId(subId);
        if (!user) break;

        user.subscription.status = 'past_due';
        await user.save();
        console.log(`  ⚠️  Halted (past_due): ${user.email}`);
        break;
      }

      // ── Subscription completed (all cycles done) ──
      case 'subscription.completed': {
        const subId = payload.subscription?.entity?.id;
        if (!subId) break;
        const user = await findUserBySubscriptionId(subId);
        if (!user) break;

        user.subscription.status = 'expired';
        await user.save();
        console.log(`  ⏹️  Completed/Expired: ${user.email}`);
        break;
      }

      // ── Payment failed ──
      case 'payment.failed': {
        const payEntity = payload.payment?.entity;
        const subId = payEntity?.notes?.userId
          ? null // fallback below
          : null;

        // Try to find user by subscription notes or subscription ID
        let user = null;
        if (payEntity?.notes?.userId) {
          user = await User.findById(payEntity.notes.userId);
        }

        if (user) {
          await Payment.create({
            userId: user._id,
            razorpayPaymentId: payEntity.id,
            razorpaySubscriptionId: payEntity.subscription_id || null,
            amount: payEntity.amount || 0,
            status: 'failed',
            planType: user.subscription?.planType || 'monthly',
          });
          console.log(`  ❌ Payment failed: ${user.email}`);
        } else {
          console.log(`  ❌ Payment failed (user not found): ${payEntity?.id}`);
        }
        break;
      }

      default:
        console.log(`  ℹ️  Unhandled event: ${event}`);
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Still return 200 to prevent Razorpay from retrying
  }

  // Always return 200 to acknowledge receipt
  res.status(200).json({ status: 'ok' });
});

module.exports = router;
