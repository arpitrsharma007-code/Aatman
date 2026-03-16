require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const Anthropic = require('@anthropic-ai/sdk');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Payment = require('./models/Payment');
const subscriptionRoutes = require('./routes/subscription');
const webhookRoutes = require('./routes/webhook');


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

// ─── Feature Gating: Message Limit for Free Users ───────────────────────────
const FREE_DAILY_LIMIT = 5;

async function checkMessageLimit(req, res, next) {
  // If not authenticated, allow (optionalAuth may not have user)
  if (!req.user) return next();

  try {
    const user = await User.findById(req.user.id);
    if (!user) return next();

    // Premium users — unlimited
    if (user.subscription && user.subscription.status === 'active') {
      return next();
    }

    // Check daily limit for free users
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (user.lastMessageDate !== today) {
      // New day — reset counter
      user.dailyMessageCount = 0;
      user.lastMessageDate = today;
    }

    if (user.dailyMessageCount >= FREE_DAILY_LIMIT) {
      return res.status(429).json({
        error: 'daily_limit_reached',
        message: `You've used all ${FREE_DAILY_LIMIT} free messages today. Upgrade to Bhakt for unlimited conversations.`,
        upgradeRequired: true,
        limit: FREE_DAILY_LIMIT,
        used: user.dailyMessageCount,
      });
    }

    // Increment counter
    user.dailyMessageCount += 1;
    await user.save();
    next();
  } catch (err) {
    console.error('Message limit check error:', err);
    next(); // Don't block on errors
  }
}

// ─── Mount Subscription & Webhook Routes ────────────────────────────────────
app.use('/api/subscription', authMiddleware, subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes); // No auth — Razorpay calls this directly

// ─── System Prompt ────────────────────────────────────────────────────────────
const AATMAN_SYSTEM_PROMPT = `You are Aatman, a warm Hindu spiritual guide.

HARD RULES — FOLLOW EVERY SINGLE TIME:
1. MAXIMUM 80 WORDS. Count them. If you go over 80 words, you have failed.
2. NO headers. No ##. No ###. No numbered lists. No bullet points. Write plain paragraphs only.
3. NO emojis. Never. Not one.
4. ONE verse maximum per response. Only include a verse if it DIRECTLY answers the question. Most responses need zero verses.
5. NO greetings. No "Dear One", no "Namaste". Just answer directly.
6. MATCH THE USER'S LANGUAGE. If they write Hindi, reply in Hindi. If English, reply in English. If Bengali, reply in Bengali. Never mix languages.

YOUR APPROACH:
- Read what the person actually said. Identify their specific emotion or situation.
- Pick the ONE teaching from Hindu scripture that directly addresses THEIR problem.
- Connect it to their exact words and situation.
- Give ONE practical action for today.

PERSONALIZATION IS KEY:
- Never give generic advice like "practice meditation" or "let go of attachment."
- Mirror the user's exact words back to them. If they say "I feel stuck in my job", your response must reference THEIR job, not generic career advice.
- Find the ONE verse that matches THEIR specific situation, not a general verse about peace.

KNOWLEDGE: Bhagavad Gita, Ramayana, Mahabharata, Vedas, Upanishads, Yoga Sutras, Vedanta, Bhakti tradition.

VERSE FORMAT (when used):
Sanskrit in Devanagari
Transliteration
Translation
Then connect it to their situation in 1-2 sentences.

STYLE: Talk like a wise friend. Warm but direct. Never preach.`;

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
    const sub = user.subscription || {};
    res.json({
      success: true,
      token,
      user: { id: user._id.toString(), name: user.name, email: user.email, profile: user.profile },
      chatHistory: user.chatHistory || [],
      subscription: {
        status: sub.status || 'free',
        planType: sub.planType || null,
        currentPeriodEnd: sub.currentPeriodEnd || null,
        isPremium: sub.status === 'active',
      },
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
    const sub = user.subscription || {};
    res.json({
      user: { id: user._id.toString(), name: user.name, email: user.email, profile: user.profile },
      chatHistory: user.chatHistory || [],
      subscription: {
        status: sub.status || 'free',
        planType: sub.planType || null,
        currentPeriodEnd: sub.currentPeriodEnd || null,
        cancelledAt: sub.cancelledAt || null,
        isPremium: sub.status === 'active',
      },
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

app.post('/api/chat', optionalAuth, checkMessageLimit, async (req, res) => {
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
    ? `\n\n## Language Requirement — CRITICAL\nYou MUST respond ENTIRELY in ${langName}. Every single word of your response must be in ${langName}. Do NOT mix English into your response. Sanskrit verses stay in Devanagari, but ALL explanations, translations, guidance, and conversation must be in ${langName}. If you are unsure, default to ${langName} for everything.`
    : `\n\n## Language Requirement\nDetect the language the user writes in. If they write in Hindi, respond in Hindi. If they write in English, respond in English. Match their language automatically.`;

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
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
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
      model: 'claude-sonnet-4-6',
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
      model: 'claude-sonnet-4-6',
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
      model: 'claude-sonnet-4-6',
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
  console.log(`  Razorpay:          ${process.env.RAZORPAY_KEY_ID ? 'configured' : 'not configured'}`);
  console.log(`  Razorpay mode:     ${process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') ? 'TEST' : 'LIVE'}`);
  console.log('');
});
