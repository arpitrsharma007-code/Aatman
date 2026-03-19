const mongoose = require('mongoose');

const astrologyWaitlistSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  source: { type: String, enum: ['modal', 'banner', 'chat_nudge'], default: 'modal' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AstrologyWaitlist', astrologyWaitlistSchema);
