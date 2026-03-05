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
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
