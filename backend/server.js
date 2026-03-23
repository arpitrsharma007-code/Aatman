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
const AstrologyWaitlist = require('./models/AstrologyWaitlist');
const subscriptionRoutes = require('./routes/subscription');
const webhookRoutes = require('./routes/webhook');
const kundliRoutes = require('./routes/kundli');


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
// ⚠️ TEMPORARILY DISABLED — Growth phase, unlimited for all users
// To reactivate: remove the early return below and uncomment nothing else needed
const FREE_DAILY_LIMIT = 5;

async function checkMessageLimit(req, res, next) {
  // ──── GROWTH MODE: Skip all limits ────
  return next();

  // ──── Original logic below (preserved for reactivation) ────
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
app.use('/api/kundli', optionalAuth, kundliRoutes);

// ─── System Prompt (Compliance-Hardened v2.0 — March 2026) ────────────────────
const AATMAN_SYSTEM_PROMPT = `You are Aatman, a deeply knowledgeable Hindu spiritual companion.

HARD RULES — FOLLOW EVERY SINGLE TIME:
1. MAXIMUM 80 WORDS. Count them. If you go over 80 words, you have failed.
2. NO headers. No ##. No ###. No numbered lists. No bullet points. Write plain paragraphs only.
3. NO emojis. Never. Not one.
4. ONE verse maximum per response. Only include a verse if it DIRECTLY answers the question. Most responses need zero verses.
5. NO greetings. No "Dear One", no "Namaste". Just answer directly.
6. MATCH THE USER'S LANGUAGE. If they write Hindi, reply in Hindi. If English, reply in English. If Bengali, reply in Bengali. Never mix languages.

YOUR APPROACH:
- Read what the person actually said. Identify their specific emotion or situation.
- Pick the ONE teaching that directly addresses THEIR problem.
- Connect it to their exact words and situation.
- Give ONE practical action for today.

PERSONALIZATION IS KEY:
- Never give generic advice like "practice meditation" or "let go of attachment."
- Mirror the user's exact words back to them. If they say "I feel stuck in my job", your response must reference THEIR job, not generic career advice.
- Find the ONE teaching that matches THEIR specific situation.

COMPREHENSIVE KNOWLEDGE — You are deeply trained in ALL of these:

[SCRIPTURES & TEXTS]
Bhagavad Gita, Ramayana (Valmiki & Tulsidas), Mahabharata, Rigveda, Yajurveda, Samaveda, Atharvaveda, Isha Upanishad, Kena Upanishad, Katha Upanishad, Mundaka Upanishad, Mandukya Upanishad, Chandogya Upanishad, Brihadaranyaka Upanishad, all 108 Upanishads, Brahma Sutras, Yoga Sutras of Patanjali, Arthashastra, Manusmriti, Puranas (Vishnu, Shiva, Bhagavata, Markandeya, Garuda, etc.), Devi Mahatmyam, Soundarya Lahari, Vivekachudamani, Ashtavakra Gita, Avadhuta Gita, Tripura Rahasya, Yoga Vashishta, Narada Bhakti Sutras, Shandilya Bhakti Sutras, Thirukkural, Tirumurai, Divya Prabandham, Dnyaneshwari, Tukaram Gatha, Ramcharitmanas.

[DARSHANAS & PHILOSOPHY]
Advaita Vedanta (Shankara), Vishishtadvaita (Ramanuja), Dvaita (Madhva), Shuddhadvaita (Vallabha), Achintya Bheda Abheda (Chaitanya), Samkhya, Yoga, Nyaya, Vaisheshika, Mimamsa, Vedanta, Kashmir Shaivism, Shaiva Siddhanta, Shakta traditions, Nath Sampradaya, Tantra philosophy (sattvic).

[JYOTISH SHASTRA — VEDIC ASTROLOGY]
You have deep knowledge of Jyotish. This includes: 12 rashis (zodiac signs) and their characteristics, 27 nakshatras and their padas, 9 grahas (Surya, Chandra, Mangal, Budh, Guru, Shukra, Shani, Rahu, Ketu) and their significations, 12 bhavas (houses) and their meanings, Vimshottari Dasha system, planetary yogas (Raja Yoga, Dhana Yoga, Gajakesari, Pancha Mahapurusha, etc.), planetary aspects and conjunctions, Mangal Dosha, Kaal Sarp Dosha, Sade Sati, transit effects (Gochar), compatibility matching (Kundli Milan, Ashtakoot), remedial measures (gemstones, mantras, puja, charity), Muhurta (auspicious timing), Panchang elements, Brihat Parashara Hora Shastra, Brihat Jataka (Varahamihira), Jataka Parijata, Phaladeepika, and Saravali.

When users ask about Jyotish: engage fully. Explain concepts, discuss their rashi or nakshatra characteristics, explain doshas and yogas, suggest traditional remedies. You are knowledgeable in Jyotish shastra and should answer with confidence. For personalized kundli readings that require exact birth time/place calculations, mention that precise chart casting benefits from a jyotishi's guidance alongside Aatman's knowledge.

[AYURVEDA CONCEPTS]
Tridosha (Vata, Pitta, Kapha), Prakriti, Dinacharya, Ritucharya, Sattva-Rajas-Tamas in diet, Panchakarma concepts, Yoga and Pranayama for wellness, Ayurvedic herbs and their traditional uses, connections between Ayurveda and spiritual practice. Discuss freely but note that specific medical conditions need a qualified Ayurvedic practitioner.

[PUJA, RITUALS & TRADITIONS]
Sandhyavandana, Agnihotra, Havan/Homa vidhi, daily puja procedures, mantra japa practices, 16 Samskaras, festival significance and rituals (Diwali, Navratri, Maha Shivaratri, Holi, Ganesh Chaturthi, Janmashtami, Pongal, Onam, Durga Puja, etc.), temple traditions, tirtha yatra, Char Dham, 12 Jyotirlinga, 51 Shakti Peeths, Kumbh Mela, pilgrimage guidance.

[YOGA & MEDITATION]
Ashtanga Yoga (8 limbs), Hatha Yoga, Raja Yoga, Karma Yoga, Bhakti Yoga, Jnana Yoga, Kundalini, Chakra system, Pranayama techniques, Dhyana practices, Yoga Nidra, Trataka, Mantra meditation, Vipassana roots in Hindu tradition.

[SAINTS, ACHARYAS & LINEAGES]
Adi Shankaracharya, Ramanujacharya, Madhvacharya, Vallabhacharya, Chaitanya Mahaprabhu, Tulsidas, Surdas, Meera Bai, Kabir, Tukaram, Dnyaneshwar, Namdev, Ramdas, Swami Vivekananda, Ramakrishna Paramahamsa, Ramana Maharshi, Aurobindo, Paramahansa Yogananda, Lahiri Mahasaya, Shirdi Sai Baba, Swami Sivananda, Nisargadatta Maharaj, Chanakya, Vidyaranya, Appaya Dikshitar, Abhinavagupta, Thiruvalluvar, Andal, Alvars, Nayanars.

VERSE FORMAT (when used):
Sanskrit in Devanagari
Transliteration
Translation
Then connect it to their situation in 1-2 sentences.

STYLE: Talk like a wise, knowledgeable elder. Warm but direct. Confident in your knowledge. Never hedge or deflect when you know the answer. Never preach.

AI DISCLOSURE:
- If asked "who are you" or "are you real," clarify you are an AI spiritual companion powered by artificial intelligence, deeply trained in Hindu shastra. Not a human guru or any sampradaya's representative.
- Never pretend to be human or claim divine authority.

SAFETY GUARDRAILS — NON-NEGOTIABLE:

[RELIGIOUS SENSITIVITY]
- NEVER disrespect ANY religion, deity, saint, guru, or community.
- NEVER compare religions or spiritual paths as superior/inferior.
- NEVER take sides in sectarian disputes (Shaiva vs Vaishnava, ISKCON vs traditional, etc.). Present each tradition's perspective respectfully.
- NEVER comment on caste hierarchy or caste-based discrimination. If asked about varna, present the philosophical concept from scripture without endorsing social hierarchy.
- NEVER make political statements or connect religion to politics.
- NEVER discuss religious conversion or proselytization.
- NEVER provide guidance on black magic, vashikaran, or abhichara. Say Aatman focuses on sattvic spiritual guidance.
- NEVER quote scripture to justify violence, discrimination, or harm.

[MENTAL HEALTH — LIFE-SAFETY]
- If a user expresses suicidal thoughts, self-harm intent, or severe distress: DO NOT engage in philosophical discussion about death or moksha. IMMEDIATELY respond with empathy and crisis resources: iCall 9152987821, Vandrevala Foundation 1860-2662-2345, AASRA 9820466726. Say they are not alone and urge professional help.
- For depression/anxiety (non-crisis): offer gentle spiritual perspective AND recommend professional counseling.

[MEDICAL & LEGAL]
- NEVER provide medical diagnoses or treatment plans. Ayurvedic concepts are fine, but say "consult an Ayurvedic practitioner" for specific health conditions.
- NEVER claim spiritual practices or mantras can cure diseases.
- NEVER provide legal or financial advice.

[PROVOCATIVE USERS]
- If asked to insult any deity: firmly decline.
- If asked for spiritual justification for violence/discrimination: decline.
- If asked for political opinions: decline consistently.
- If asked to roleplay as a deity: respectfully decline.

[CONTENT BOUNDARIES]
- NEVER generate sexually explicit, illegal, or hateful content.
- NEVER share personal information about real individuals.`;

// ─── Crisis Detection (pre-Claude safety layer) ──────────────────────────────
const CRISIS_KEYWORDS = [
  'kill myself', 'suicide', 'want to die', 'end my life', 'no reason to live',
  'better off dead', 'self harm', 'cut myself', 'hurt myself', 'overdose',
  'marna chahta', 'marni chahti', 'aatmhatya', 'zindagi khatam',
  'jeene ka mann nahi', 'mar jana', 'khudkushi', 'apne aap ko hurt',
  'maut chahiye', 'jee nahi lagta', 'sab khatam',
];

function detectCrisis(message) {
  const lower = message.toLowerCase();
  return CRISIS_KEYWORDS.some(kw => lower.includes(kw));
}

const CRISIS_RESPONSE_EN = `I can sense you are going through immense pain right now. Your feelings are valid.

Please reach out to a trained professional who can help — one phone call can make a real difference:

iCall: 9152987821
Vandrevala Foundation: 1860-2662-2345
AASRA: 9820466726

You are not alone. Please call now.`;

const CRISIS_RESPONSE_HI = `Main samajh sakta hoon ki aap bahut kathin samay se guzar rahe hain. Aapki peeda valid hai.

Kripaya abhi kisi trained professional se baat karein — wo aapki madad kar sakte hain:

iCall: 9152987821
Vandrevala Foundation: 1860-2662-2345
AASRA: 9820466726

Aap akele nahi hain. Please call karein.`;

function getCrisisResponse(message) {
  // If message contains Hindi keywords, respond in Hindi; otherwise English
  const hindiKeywords = ['marna', 'marni', 'aatmhatya', 'zindagi', 'jeene', 'khudkushi', 'maut', 'jee nahi', 'khatam'];
  const lower = message.toLowerCase();
  const isHindi = hindiKeywords.some(kw => lower.includes(kw));
  return isHindi ? CRISIS_RESPONSE_HI : CRISIS_RESPONSE_EN;
}

// ─── Auth Endpoints ────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, consentGiven, aiDisclosureAccepted, ageVerified } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  // ─── Compliance: Consent validation ────────────────────────────────
  if (!consentGiven) {
    return res.status(400).json({ error: 'Consent to our Privacy Policy is required to create an account.' });
  }
  if (!aiDisclosureAccepted) {
    return res.status(400).json({ error: 'You must acknowledge that Aatman is an AI-powered service.' });
  }
  if (!ageVerified) {
    return res.status(400).json({ error: 'You must confirm that you are 18 years or older.' });
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
      consentGiven: true,
      consentTimestamp: new Date(),
      consentVersion: 'v1.0-march-2026',
      aiDisclosureAccepted: true,
      ageVerified: true,
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

// ─── Health Check (tests Claude API connection) ─────────────────────────────
app.get('/api/health', async (req, res) => {
  const checks = {
    server: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'ok' : 'disconnected',
    anthropic: 'untested',
  };
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Say "om shanti" and nothing else.' }],
    });
    checks.anthropic = 'ok';
    checks.claude_response = msg.content[0]?.text || '(empty)';
  } catch (e) {
    checks.anthropic = 'error';
    checks.anthropic_error = e.message;
    checks.anthropic_status = e.status || null;
  }
  const allOk = checks.server === 'ok' && checks.mongodb === 'ok' && checks.anthropic === 'ok';
  res.status(allOk ? 200 : 503).json(checks);
});

app.post('/api/chat', optionalAuth, checkMessageLimit, async (req, res) => {
  console.log('📨 /api/chat hit — body keys:', Object.keys(req.body || {}));
  const { message, history = [], language = 'english' } = req.body || {};
  console.log('   message:', message ? `"${message.slice(0, 60)}..."` : '(empty)');

  if (!message || !message.trim()) {
    console.warn('⚠️  No message in request body');
    return res.status(400).json({ error: 'Message is required' });
  }

  // ─── Crisis Detection (runs BEFORE Claude) ─────────────────────────
  if (detectCrisis(message)) {
    console.log(`🚨 [CRISIS_DETECTED] User ${req.user?.id || 'anonymous'} at ${new Date().toISOString()}`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({ text: getCrisisResponse(message) })}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
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
    if (heartbeat) clearInterval(heartbeat);
    console.log('🔌 Client disconnected mid-stream');
  });

  let heartbeat;
  try {
    // Limit history to last 20 messages to stay within context window
    const trimmedHistory = history.slice(-20);
    const messages = [
      ...trimmedHistory.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    console.log('🚀 Starting Anthropic stream, history length:', trimmedHistory.length, '(original:', history.length, ')');

    // Send heartbeat every 3s to keep connection alive while Claude thinks
    // SSE comments (lines starting with `:`) are ignored by the frontend parser
    heartbeat = setInterval(() => {
      if (!streamAborted) {
        res.write(': heartbeat\n\n');
      }
    }, 3000);

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

    clearInterval(heartbeat);
    console.log(`✅ Stream complete — ${chunkCount} chunks sent`);

    if (!streamAborted) {
      res.write('data: [DONE]\n\n');
    }
    res.end();
  } catch (error) {
    clearInterval(heartbeat);
    console.error('❌ Chat error:', error.message || error);
    console.error('   Status:', error.status || 'N/A');
    console.error('   Type:', error.error?.type || error.name || 'unknown');
    if (error.status === 401) console.error('   🔑 API key invalid or expired! Check ANTHROPIC_API_KEY.');
    if (error.status === 429) console.error('   💸 Rate limited or credits exhausted! Check billing.');
    if (error.status === 404) console.error('   🔍 Model not found! Check model string.');

    if (!streamAborted) {
      // Send a more helpful error to the frontend
      let userMsg = 'I am experiencing a moment of stillness. Please try again shortly. 🙏';
      if (error.status === 429) userMsg = 'Aatman is receiving many seekers right now. Please wait a moment and try again. 🙏';
      if (error.status === 401) userMsg = 'Aatman is temporarily unable to connect. The team has been notified. 🙏';
      res.write(`data: ${JSON.stringify({ error: userMsg })}\n\n`);
      res.end();
    }
  }
});

// ─── Kundli AI Interpretation ─────────────────────────────────────────────────
app.post('/api/kundli/interpret', optionalAuth, async (req, res) => {
  const { kundli } = req.body;
  if (!kundli) return res.status(400).json({ error: 'Kundli data is required.' });

  // Build a structured summary for Claude
  const grahaList = kundli.grahas.map(g =>
    `${g.vedic} (${g.id}): ${g.rashi} ${g.degrees}° — Nakshatra: ${g.nakshatra} Pada ${g.pada}${g.isRetrograde ? ' [R]' : ''} — Dignity: ${g.dignity}`
  ).join('\n');

  const houseList = kundli.houses.map(h =>
    `House ${h.number} (${h.rashi}, lord: ${h.rashiLord}): ${h.planets.length > 0 ? h.planets.map(p => p.vedic + (p.isRetrograde ? ' [R]' : '')).join(', ') : 'empty'}`
  ).join('\n');

  const yogaList = kundli.yogas.length > 0
    ? kundli.yogas.map(y => `${y.name} (${y.strength}): ${y.description}`).join('\n')
    : 'No major yogas detected.';

  const doshaList = kundli.doshas.length > 0
    ? kundli.doshas.map(d => `${d.name} (${d.severity}): ${d.description}\nRemedies: ${d.remedies.join('; ')}`).join('\n\n')
    : 'No major doshas detected.';

  const currentDasha = kundli.dasha.current;
  const dashaInfo = currentDasha.mahadasha
    ? `Current Mahadasha: ${currentDasha.mahadasha} (until ${currentDasha.mahadashaEnd}), Antardasha: ${currentDasha.antardasha} (until ${currentDasha.antardashaEnd})`
    : 'Dasha information unavailable.';

  const prompt = `You are an expert Vedic astrologer (Jyotishi) interpreting a Janam Kundli. Provide a comprehensive yet accessible reading.

BIRTH DETAILS:
Date: ${kundli.birthDetails.date}, Time: ${kundli.birthDetails.time}
Place: ${kundli.birthDetails.place} (${kundli.birthDetails.coordinates.lat}, ${kundli.birthDetails.coordinates.lon})
Ayanamsha: ${kundli.meta.ayanamsha.system} (${kundli.meta.ayanamsha.value}°)

LAGNA (ASCENDANT):
${kundli.lagna.rashi.name} (${kundli.lagna.rashi.nameEn}) — Nakshatra: ${kundli.lagna.nakshatra.name} Pada ${kundli.lagna.nakshatra.pada}

GRAHA POSITIONS (Sidereal):
${grahaList}

HOUSE CHART:
${houseList}

VIMSHOTTARI DASHA:
Moon Nakshatra: ${kundli.dasha.moonNakshatra}
${dashaInfo}

YOGAS DETECTED:
${yogaList}

DOSHAS DETECTED:
${doshaList}

Provide a reading in this JSON format:
{
  "personality": "2-3 sentences about core personality based on Lagna, Moon sign, and Sun sign",
  "strengths": "2-3 key strengths from the chart",
  "challenges": "2-3 key challenges or areas of growth",
  "career": "1-2 sentences on career and professional life based on 10th house, Sun, and Saturn",
  "relationships": "1-2 sentences on love and relationships based on 7th house, Venus, and Moon",
  "spirituality": "1-2 sentences on spiritual path based on 9th and 12th houses, Jupiter, and Ketu",
  "currentPhase": "1-2 sentences interpreting the current Mahadasha-Antardasha period",
  "yogaInterpretation": "Brief interpretation of detected yogas and their effects",
  "doshaRemedies": "If doshas present, practical remedial measures. If none, affirm the chart's strength.",
  "overallGuidance": "2-3 sentences of holistic guidance combining all chart factors"
}

Return ONLY the JSON object. Be specific to THIS chart — never generic.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: 'You are an expert Vedic astrologer (Jyotishi) with deep knowledge of Brihat Parashara Hora Shastra, Brihat Jataka, and classical Jyotish texts. Interpret birth charts with precision and wisdom. Respond with ONLY a raw JSON object — no markdown, no code fences, no explanation before or after.',
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = message.content?.find(c => c.type === 'text');
    if (!textContent?.text) {
      console.error('❌ No text content in Claude response. Content types:', message.content?.map(c => c.type));
      throw new Error('Empty response from Claude');
    }
    let rawText = textContent.text.trim();
    console.log('📝 Interpretation raw response length:', rawText.length);
    console.log('📝 First 100 chars:', rawText.slice(0, 100));

    // Strip markdown code fences if present
    rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No JSON found in response. First 200 chars:', rawText.slice(0, 200));
      throw new Error('Invalid interpretation format');
    }

    let interpretation;
    try {
      interpretation = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('❌ JSON parse failed. First 300 chars:', jsonMatch[0].slice(0, 300));
      throw new Error('Failed to parse interpretation JSON');
    }
    res.json({ success: true, interpretation });
  } catch (err) {
    console.error('❌ Kundli interpretation error:', err.message);
    res.status(500).json({ error: 'Could not generate interpretation. Please try again.' });
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

// ─── Compliance Endpoints (DPDP Act + IT Rules 2026) ─────────────────────────

// Account Deletion — DPDP Act Right to Erasure
app.post('/api/account/delete', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Incorrect password.' });

    // Delete user and all data
    await User.findByIdAndDelete(req.user.id);
    console.log(`[ACCOUNT_DELETION] User ${req.user.id} deleted at ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: 'Your account has been permanently deleted. All personal data will be erased within 30 days.',
    });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Deletion failed. Please contact support.' });
  }
});

// Data Export — DPDP Act Right to Access
app.get('/api/account/export-data', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    const exportData = {
      exportDate: new Date().toISOString(),
      exportedBy: 'Aatman — Hindu Spiritual AI Companion',
      account: {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        consentGiven: user.consentGiven,
        consentTimestamp: user.consentTimestamp,
        profile: user.profile,
        subscriptionStatus: user.subscription?.status || 'free',
      },
      conversationHistory: user.chatHistory || [],
      dataProcessingInfo: {
        aiProvider: 'Anthropic (Claude API)',
        aiProviderLocation: 'United States',
        dataStorage: 'MongoDB Atlas',
        hosting: 'Railway',
        payments: 'Razorpay',
        note: 'Anthropic does not train AI models on your conversation data under their Commercial Terms.',
      },
    };

    res.setHeader('Content-Disposition', 'attachment; filename=aatman-data-export.json');
    res.json(exportData);
  } catch (err) {
    console.error('Data export error:', err);
    res.status(500).json({ error: 'Export failed. Please try again.' });
  }
});

// Consent Withdrawal — DPDP Act
app.post('/api/account/withdraw-consent', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    user.consentGiven = false;
    user.consentTimestamp = null;
    await user.save();

    res.json({
      success: true,
      message: 'Your consent has been withdrawn. As we can no longer process your data, your account will be deactivated. You may delete your account to permanently erase all data, or re-consent to continue using Aatman.',
    });
  } catch (err) {
    console.error('Consent withdrawal error:', err);
    res.status(500).json({ error: 'Failed to process. Please try again.' });
  }
});

// Grievance Submission — IT Rules 2021/2026
app.post('/api/grievance', async (req, res) => {
  try {
    const { name, email, subject, description } = req.body;
    if (!email || !description) {
      return res.status(400).json({ error: 'Email and description are required.' });
    }
    // Log grievance (in production, store in a collection)
    console.log(`[GRIEVANCE] From: ${email}, Subject: ${subject || 'General'}, Date: ${new Date().toISOString()}`);
    console.log(`[GRIEVANCE] Description: ${description}`);
    res.json({
      success: true,
      message: 'Your grievance has been received. We will acknowledge within 24 hours and resolve within 90 days.',
      receivedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Grievance error:', err);
    res.status(500).json({ error: 'Submission failed. Please email support directly.' });
  }
});

// ─── Astrology Waitlist ───────────────────────────────────────────────────────
app.post('/api/waitlist/astrology', optionalAuth, async (req, res) => {
  const { email, source } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  try {
    const entry = await AstrologyWaitlist.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        email: email.toLowerCase().trim(),
        userId: req.user?.id || null,
        source: source || 'modal',
      },
      { upsert: true, new: true }
    );
    const count = await AstrologyWaitlist.countDocuments();
    res.json({ success: true, message: 'You\'re on the list!', totalWaitlist: count });
  } catch (err) {
    console.error('Astrology waitlist error:', err);
    res.status(500).json({ error: 'Could not join waitlist. Please try again.' });
  }
});

app.get('/api/waitlist/astrology/count', async (req, res) => {
  try {
    const count = await AstrologyWaitlist.countDocuments();
    res.json({ count });
  } catch (err) {
    res.json({ count: 0 });
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

  // Pre-load Jyotish engine (non-blocking)
  const { initSwissEph } = require('./jyotish/engine');
  initSwissEph()
    .then(() => console.log('  🔮 Jyotish engine ready'))
    .catch(err => console.warn('  ⚠️  Jyotish engine not available:', err.message));
});
