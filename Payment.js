const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  razorpayPaymentId: { type: String, default: null },
  razorpaySubscriptionId: { type: String, default: null },
  amount: { type: Number, required: true }, // in paise (14900 = ₹149)
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['captured', 'failed', 'refunded', 'created'], default: 'created' },
  planType: { type: String, enum: ['monthly', 'yearly'] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Payment', paymentSchema);
