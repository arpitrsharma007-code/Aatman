# 🕉️ Aatman — Hindu Spiritual AI Companion

**Your personal spiritual guide powered by AI. Wisdom from the Bhagavad Gita, Vedas, Upanishads & more.**

[Try Aatman Live →]aatman-production.up.railway.app

---

## What is Aatman?

Aatman (आत्मन् — "the universal soul") is an AI-powered Hindu spiritual companion that provides personalized guidance from ancient Hindu scripture. Ask about anxiety, grief, relationships, career, purpose — and receive relevant shlokas, practical wisdom, and actionable advice rooted in thousands of years of tradition.

Built in 2 days with zero coding background using AI-assisted "vibe coding."

## Features

🔮 **AI Spiritual Chat** — Streaming conversations powered by Claude. Ask anything about life — get wisdom from the Gita, Vedas, Upanishads, Ramayana, and Yoga Sutras. Responses include relevant Sanskrit verses with transliteration and translation.

🌅 **Daily Wisdom Scheduler** — Choose your preferred scripture and time. Receive a daily verse with meaning, reflection, and practice.

🎵 **Bhakti Dashboard** — 36 curated bhajans organized by deity (Ganesha, Shiva, Krishna, Durga, Hanuman, Ram, Saraswati, Vishnu) with YouTube integration.

🔮 **Horoscope & Rashi** — Western zodiac and Vedic Rashi support with daily spiritual guidance based on Jyotisha (Hindu astrology).

🌐 **7 Languages** — English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati.

📱 **PWA** — Install on your phone like a native app. Works offline.

🔐 **User Accounts** — JWT authentication, persistent chat history, personalized profiles.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript (Single Page App) |
| Backend | Node.js + Express |
| AI | Anthropic Claude API (Sonnet) with streaming (SSE) |
| Database | MongoDB Atlas |
| Auth | JWT + bcryptjs |
| Hosting | Railway.app |
| PWA | Service Worker + Web App Manifest |

## Architecture

```
Client (Browser/PWA)
  ↓ HTTPS
Express Server (Railway)
  ├── /api/chat → Claude API (SSE streaming)
  ├── /api/wisdom → Claude API (JSON)
  ├── /api/horoscope → Claude API (JSON)
  ├── /api/auth/* → JWT + MongoDB
  └── Static files (frontend/)
```

## Run Locally

```bash
# Clone
git clone https://github.com/arpitrsharma007-code/Aatman.git
cd Aatman

# Install dependencies
npm install

# Create .env file
echo ANTHROPIC_API_KEY=your_key_here > .env
echo MONGODB_URI=your_mongodb_uri >> .env
echo JWT_SECRET=your_secret >> .env
echo PORT=3001 >> .env

# Start
npm start
```

Open `http://localhost:3001`

## Screenshots

Coming soon — the app features a luxury spiritual aesthetic with saffron, gold, and cream colors, animated mandala backgrounds, and Devanagari typography.

## Roadmap

- [ ] Razorpay payment integration (freemium model)
- [ ] WhatsApp bot integration
- [ ] Push notifications
- [ ] Multi-religion support (Islam, Christianity, Sikhism, Buddhism)
- [ ] Birth chart (Kundali) generation
- [ ] Community features
- [ ] Native mobile app

## Business Model

**Freemium:**
- Free: 10 conversations/day, basic features
- Aatman Plus (₹99/month): Unlimited chat, all languages, full horoscope
- Aatman Premium (₹299/month): Everything + weekly spiritual report, birth chart

## About the Builder

Built by [Arpit Sharma](https://github.com/arpitrsharma007-code) — a 26-year-old aspiring entrepreneur with 6 years of technical support experience, building AI products through vibe coding with Claude as co-pilot.

**Other projects:**
- [PawSeva](https://github.com/arpitrsharma007-code/PawSeva) — Uber-style pet services marketplace for India
- [Aria AI Assistant](https://github.com/arpitrsharma007-code/aria-ai-assistant) — WhatsApp AI assistant powered by Claude

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*🕉️ Jai Shri Ram*
