// ─── Kundli API Routes ───────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { generateKundli } = require('../jyotish/engine');

// ─── POST /api/kundli/generate ───────────────────────────────────────────────
// Generates a full Vedic birth chart from birth details
router.post('/generate', async (req, res) => {
  const { date, time, lat, lon, timezone, place } = req.body;

  // Validate inputs
  if (!date || !time || lat === undefined || lon === undefined) {
    return res.status(400).json({
      error: 'Birth date, time, latitude, and longitude are required.',
      example: {
        date: '1997-03-15',
        time: '10:30',
        lat: 26.9124,
        lon: 75.7873,
        timezone: 5.5,
        place: 'Jaipur, Rajasthan',
      },
    });
  }

  // Parse date and time
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const tz = timezone !== undefined ? Number(timezone) : 5.5; // Default IST

  if (!year || !month || !day || isNaN(hour) || isNaN(minute)) {
    return res.status(400).json({ error: 'Invalid date or time format. Use YYYY-MM-DD and HH:MM.' });
  }

  if (year < 1900 || year > 2100) {
    return res.status(400).json({ error: 'Birth year must be between 1900 and 2100.' });
  }

  try {
    console.log(`🔮 Generating kundli: ${date} ${time} at ${place || 'unknown'} (${lat}, ${lon})`);
    const kundli = await generateKundli({
      year, month, day, hour, minute,
      lat: Number(lat),
      lon: Number(lon),
      timezone: tz,
      place: place || '',
    });
    console.log(`✅ Kundli generated — Lagna: ${kundli.lagna.rashi.name}, Moon: ${kundli.grahas.find(g => g.id === 'Moon').nakshatra}`);
    res.json({ success: true, kundli });
  } catch (err) {
    console.error('❌ Kundli generation error:', err.message);
    res.status(500).json({ error: 'Could not generate kundli. Please check birth details and try again.' });
  }
});

// ─── POST /api/kundli/interpret ──────────────────────────────────────────────
// Takes a generated kundli and returns Claude's Jyotish interpretation
// This route is wired in server.js where the Anthropic client is available
router.post('/interpret', async (req, res) => {
  const { kundli } = req.body;
  if (!kundli) {
    return res.status(400).json({ error: 'Kundli data is required.' });
  }

  // The actual Claude call is handled in server.js since it has the anthropic client
  // This route is a placeholder — server.js overrides it with the full implementation
  res.status(501).json({ error: 'Interpretation endpoint not configured.' });
});

module.exports = router;
