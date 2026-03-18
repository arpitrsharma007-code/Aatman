const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  profile: {
    language: { type: String, default: 'english' },
    zodiacSystem: { type: String, default: 'western' },
    zodiacSign: { type: String, default: '' },
    rashi: { type: String, default: '' },
  },
  chatHistory: { type: Array, default: [] },
  subscription: {
    status: { type: String, enum: ['free', 'active', 'cancelled', 'expired', 'past_due'], default: 'free' },
    razorpaySubscriptionId: { type: String, default: null },
    razorpayCustomerId: { type: String, default: null },
    planType: { type: String, enum: ['monthly', 'yearly', null], default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  // ─── Compliance Fields (DPDP Act 2023) ──────────────────────────
  consentGiven: { type: Boolean, default: false },
  consentTimestamp: { type: Date, default: null },
  consentVersion: { type: String, default: null },
  aiDisclosureAccepted: { type: Boolean, default: false },
  ageVerified: { type: Boolean, default: false },
  // ────────────────────────────────────────────────────────────────
  dailyMessageCount: { type: Number, default: 0 },
  lastMessageDate: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
