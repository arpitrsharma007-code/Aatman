require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const Anthropic = require('@anthropic-ai/sdk');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('./models/User');


const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'aatman-sacred-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── MongoDB Connection ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
}).then(() => {
  console.log('  MongoDB connected successfully');
}).catch((err) => {
  console.error('  MongoDB connection error:', err.message);
  process.exit(1);
});

// Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── JWT Middleware ────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch (e) {}
  }
  next();
}

// ─── System Prompt ────────────────────────────────────────────────────────────
const AATMAN_SYSTEM_PROMPT = `Be concise. Maximum 150 words per response. 
Get straight to the point immediately. 
Give one relevant verse, brief meaning, 
one practical takeaway. No long introductions. You are Aatman (आत्मन्), a wise, warm, and deeply compassionate Hindu spiritual guide. Your name means "the universal soul" — the eternal, unchanging self within all beings.

## Your Sacred Knowledge
You carry the living wisdom of:
- **Bhagavad Gita** — Lord Krishna's divine counsel to Arjuna on the battlefield of Kurukshetra
- **Ramayana** — The sacred journey of Lord Ram, Sita, Lakshman, and Hanuman
- **Mahabharata** — The great epic of the Kuru dynasty
- **The Four Vedas** — Rigveda, Samaveda, Yajurveda, Atharvaveda
- **The Upanishads** — Mandukya, Brihadaranyaka, Chandogya, Kena, Isha, Mundaka, and others
- **Yoga Sutras of Patanjali** — The eight limbs of yoga and path to liberation
- **Vedanta Philosophy** — Advaita, Dvaita, Vishishtadvaita
- **Bhakti tradition** — Mirabai, Tukaram, Kabir, Chaitanya Mahaprabhu
- **Tantra and Shakti traditions** — Devi Mahatmya and the power of Shakti

## Your Personality
- Warm and grandmotherly/grandfatherly — like a beloved spiritual elder who holds you in complete acceptance
- Never preachy or judgmental — you guide, you don't lecture
- Practical and grounded — connect ancient wisdom to the reality of modern life
- Emotionally intelligent — always acknowledge feelings BEFORE offering wisdom
- Inclusive — honor all paths to the divine

## Response Length & Style — CRITICAL RULES
- **Maximum 3-4 paragraphs** per response. Be concise and focused.
- **No salutations after the first message**: Do NOT use "Dear One", "Dear Seeker", "Namaste", "Beloved", or ANY greeting in your responses EXCEPT for the very first message of a brand new conversation. After that, respond directly to what the person said without any opening salutation.
- **Get to the point quickly**: No lengthy preambles or introductions. Start with the heart of your response.
- **One verse maximum**: Include at most one Sanskrit verse per response, and only when it is directly relevant — not by default.
- Format with clear paragraphs. Use **bold** for key Sanskrit terms on first use.

## How You Respond
1. Acknowledge feelings briefly and genuinely (1-2 sentences)
2. Offer the key wisdom from scripture, introduced naturally
3. Include ONE verse only when truly relevant (Sanskrit → transliteration → translation)
4. One practical suggestion for applying this today
5. A brief, warm close (one sentence maximum)

## Format for Verses
> *Sanskrit original*
> *IAST transliteration*
> *"English translation"*

## Special Topics
- **Anxiety** → nishkama karma, present moment, Gita Chapter 2
- **Grief** → eternal Atman ("na jayate mriyate va kadacin"), cycle of existence
- **Purpose** → svadharma, finding one's rasa
- **Relationships** → Ram-Sita, Radha-Krishna, Shiva-Parvati
- **Career** → karma yoga, lokasangraha
- **Fear** → Virat Rupa, Hanuman's fearless service, indestructible Atman
- **Depression** → three gunas (tamas, rajas, sattva), path to sattva
- **Forgiveness** → Valmiki's transformation, Ram's compassion

## Language & Style
- Use Sanskrit terms naturally but always explain them briefly
- Treat each seeker as a beloved soul who already carries all wisdom within
- Responses should feel like a conversation with a wise friend, not a Wikipedia entry

You are not here to convert or convince anyone — you are here to reflect their own inner light back to them.`;

// ─── Auth Endpoints ────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });
    const token = jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      success: true,
      token,
      user: { id: user._id.toString(), name: user.name, email: user.email, profile: user.profile },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      success: true,
      token,
      user: { id: user._id.toString(), name: user.name, email: user.email, profile: user.profile },
      chatHistory: user.chatHistory || [],
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      user: { id: user._id.toString(), name: user.name, email: user.email, profile: user.profile },
      chatHistory: user.chatHistory || [],
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Could not fetch user data.' });
  }
});

app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  const { name, language, zodiacSystem, zodiacSign, rashi } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (name) user.name = name.trim();
    if (language) user.profile.language = language;
    if (zodiacSystem) user.profile.zodiacSystem = zodiacSystem;
    if (zodiacSign !== undefined) user.profile.zodiacSign = zodiacSign;
    if (rashi !== undefined) user.profile.rashi = rashi;
    await user.save();
    res.json({
      success: true,
      user: { id: user._id.toString(), name: user.name, email: user.email, profile: user.profile },
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Profile update failed.' });
  }
});

app.post('/api/auth/save-history', authMiddleware, async (req, res) => {
  const { history } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.chatHistory = (history || []).slice(-40);
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Save history error:', err);
    res.status(500).json({ error: 'Could not save chat history.' });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ॐ Aatman server is running' });
});

// ─── Streaming Chat ────────────────────────────────────────────────────────────
const LANGUAGE_MAP = {
  english: 'English',
  hindi: 'Hindi (हिंदी)',
  tamil: 'Tamil (தமிழ்)',
  telugu: 'Telugu (తెలుగు)',
  bengali: 'Bengali (বাংলা)',
  marathi: 'Marathi (मराठी)',
  gujarati: 'Gujarati (ગુજરાતી)',
};

app.post('/api/chat', optionalAuth, async (req, res) => {
  console.log('📨 /api/chat hit — body keys:', Object.keys(req.body || {}));
  const { message, history = [], language = 'english' } = req.body || {};
  console.log('   message:', message ? `"${message.slice(0, 60)}..."` : '(empty)');

  if (!message || !message.trim()) {
    console.warn('⚠️  No message in request body');
    return res.status(400).json({ error: 'Message is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const langName = LANGUAGE_MAP[language] || 'English';
  const languageInstruction = language !== 'english'
    ? `\n\n## Language Requirement\nYou MUST respond entirely in ${langName}. All your explanations, reflections, and guidance must be written in ${langName}. Sanskrit verses remain in Devanagari/Sanskrit script, but their transliterations and ALL explanations/translations should be in ${langName}.`
    : '';

  // Handle client disconnect — use res, not req.
  // In Node 18+, req auto-destroys after body is consumed, firing req.on('close')
  // prematurely and setting streamAborted=true before the stream even starts.
  let streamAborted = false;
  res.on('close', () => {
    if (streamAborted) return;
    streamAborted = true;
    console.log('🔌 Client disconnected mid-stream');
  });

  try {
    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    console.log('🚀 Starting Anthropic stream, history length:', history.length);

    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: AATMAN_SYSTEM_PROMPT + languageInstruction,
      messages,
    });

    let chunkCount = 0;
    for await (const event of stream) {
      if (streamAborted) break;
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        chunkCount++;
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    console.log(`✅ Stream complete — ${chunkCount} chunks sent`);

    if (!streamAborted) {
      res.write('data: [DONE]\n\n');
    }
    res.end();
  } catch (error) {
    console.error('❌ Chat error:', error.message || error);
    if (!streamAborted) {
      res.write(`data: ${JSON.stringify({ error: 'I am experiencing a moment of stillness. Please try again shortly. 🙏' })}\n\n`);
      res.end();
    }
  }
});

// ─── Daily Wisdom ──────────────────────────────────────────────────────────────
app.post('/api/wisdom', async (req, res) => {
  const { scripture = 'Bhagavad Gita', theme } = req.body;
  const themePrompt = theme
    ? `The wisdom should relate to the theme of: ${theme}.`
    : 'Choose a verse that offers universal wisdom and peace.';

  const prompt = `Please share today's daily wisdom from the ${scripture}. ${themePrompt}

Provide your response in the following JSON format exactly:
{
  "scripture": "${scripture}",
  "chapter_reference": "e.g., Bhagavad Gita 2.47 or Isha Upanishad 1",
  "sanskrit": "The verse in Devanagari script",
  "transliteration": "IAST transliteration",
  "translation": "Beautiful English translation",
  "meaning": "2-3 sentences of warm, practical meaning for modern life",
  "reflection": "One gentle question or practice for the day",
  "deity_connection": "Which deity or sage this teaching is associated with (optional)"
}

Only return the JSON object, nothing else.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 400,
      system: AATMAN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });
    const rawText = message.content[0].text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid response format');
    const wisdom = JSON.parse(jsonMatch[0]);
    res.json({ success: true, wisdom });
  } catch (error) {
    console.error('Wisdom error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch wisdom at this time. Please try again.' });
  }
});

// ─── Horoscope / Spiritual Guidance ───────────────────────────────────────────
app.post('/api/horoscope', async (req, res) => {
  const { sign, system = 'western' } = req.body;
  if (!sign) return res.status(400).json({ error: 'Sign is required' });

  const signType = system === 'vedic' ? 'Vedic Rashi' : 'Western zodiac sign';
  const prompt = `Generate a brief daily spiritual suggestion for someone with ${signType}: ${sign}.

Draw from Hindu astrological wisdom (Jyotisha), the qualities of this sign, and relevant Hindu scripture teachings.

Respond ONLY with this JSON:
{
  "sign": "${sign}",
  "system": "${system}",
  "mantra": "A short Sanskrit mantra or affirmation (with translation)",
  "guidance": "2-3 sentences of spiritual guidance for today based on their sign's energy",
  "deity": "The deity most aligned with this sign today and why (1 sentence)",
  "practice": "One simple spiritual practice for today (1 sentence)",
  "auspicious_color": "An auspicious color for today with brief reason",
  "element": "The element associated with this sign"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system: AATMAN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });
    const rawText = message.content[0].text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid response format');
    const horoscope = JSON.parse(jsonMatch[0]);
    res.json({ success: true, horoscope });
  } catch (error) {
    console.error('Horoscope error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch spiritual guidance at this time.' });
  }
});

// ─── Reflect ───────────────────────────────────────────────────────────────────
app.post('/api/reflect', async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 768,
      system: AATMAN_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Please share a brief spiritual reflection on the topic of "${topic}" from Hindu wisdom. Keep it concise — 2-3 paragraphs with one relevant verse.`,
      }],
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Reflect error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Could not generate reflection.' })}\n\n`);
    res.end();
  }
});

// ─── Catch-all ─────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ॐ  Aatman — Hindu Spiritual AI Companion');
  console.log('  ─────────────────────────────────────────');
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log(`  Environment:       ${process.env.NODE_ENV || 'development'}`);
  console.log(`  API key present:   ${!!process.env.ANTHROPIC_API_KEY}`);
  console.log('');
});
