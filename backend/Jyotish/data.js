// ─── Vedic Astrology Reference Data ──────────────────────────────────────────
// All constants for Jyotish calculations: Rashis, Nakshatras, Dasha, Yogas

const RASHIS = [
  { index: 0, name: 'Mesha',      nameEn: 'Aries',       symbol: '♈', lord: 'Mars',    element: 'Fire',  quality: 'Chara' },
  { index: 1, name: 'Vrishabha',  nameEn: 'Taurus',      symbol: '♉', lord: 'Venus',   element: 'Earth', quality: 'Sthira' },
  { index: 2, name: 'Mithuna',    nameEn: 'Gemini',      symbol: '♊', lord: 'Mercury', element: 'Air',   quality: 'Dvisvabhava' },
  { index: 3, name: 'Karka',      nameEn: 'Cancer',      symbol: '♋', lord: 'Moon',    element: 'Water', quality: 'Chara' },
  { index: 4, name: 'Simha',      nameEn: 'Leo',         symbol: '♌', lord: 'Sun',     element: 'Fire',  quality: 'Sthira' },
  { index: 5, name: 'Kanya',      nameEn: 'Virgo',       symbol: '♍', lord: 'Mercury', element: 'Earth', quality: 'Dvisvabhava' },
  { index: 6, name: 'Tula',       nameEn: 'Libra',       symbol: '♎', lord: 'Venus',   element: 'Air',   quality: 'Chara' },
  { index: 7, name: 'Vrishchika', nameEn: 'Scorpio',     symbol: '♏', lord: 'Mars',    element: 'Water', quality: 'Sthira' },
  { index: 8, name: 'Dhanu',      nameEn: 'Sagittarius', symbol: '♐', lord: 'Jupiter', element: 'Fire',  quality: 'Dvisvabhava' },
  { index: 9, name: 'Makara',     nameEn: 'Capricorn',   symbol: '♑', lord: 'Saturn',  element: 'Earth', quality: 'Chara' },
  { index: 10, name: 'Kumbha',    nameEn: 'Aquarius',    symbol: '♒', lord: 'Saturn',  element: 'Air',   quality: 'Sthira' },
  { index: 11, name: 'Meena',     nameEn: 'Pisces',      symbol: '♓', lord: 'Jupiter', element: 'Water', quality: 'Dvisvabhava' },
];

// 27 Nakshatras — each spans 13°20' (13.3333°)
// Pada = 3°20' (3.3333°) — 4 padas per nakshatra
const NAKSHATRAS = [
  { index: 0,  name: 'Ashwini',       lord: 'Ketu',    deity: 'Ashwini Kumaras', startDeg: 0 },
  { index: 1,  name: 'Bharani',       lord: 'Venus',   deity: 'Yama',            startDeg: 13.3333 },
  { index: 2,  name: 'Krittika',      lord: 'Sun',     deity: 'Agni',            startDeg: 26.6667 },
  { index: 3,  name: 'Rohini',        lord: 'Moon',    deity: 'Brahma',          startDeg: 40 },
  { index: 4,  name: 'Mrigashira',    lord: 'Mars',    deity: 'Soma',            startDeg: 53.3333 },
  { index: 5,  name: 'Ardra',         lord: 'Rahu',    deity: 'Rudra',           startDeg: 66.6667 },
  { index: 6,  name: 'Punarvasu',     lord: 'Jupiter', deity: 'Aditi',           startDeg: 80 },
  { index: 7,  name: 'Pushya',        lord: 'Saturn',  deity: 'Brihaspati',      startDeg: 93.3333 },
  { index: 8,  name: 'Ashlesha',      lord: 'Mercury', deity: 'Sarpa',           startDeg: 106.6667 },
  { index: 9,  name: 'Magha',         lord: 'Ketu',    deity: 'Pitris',          startDeg: 120 },
  { index: 10, name: 'Purva Phalguni',lord: 'Venus',   deity: 'Bhaga',           startDeg: 133.3333 },
  { index: 11, name: 'Uttara Phalguni',lord: 'Sun',    deity: 'Aryaman',         startDeg: 146.6667 },
  { index: 12, name: 'Hasta',         lord: 'Moon',    deity: 'Savitar',         startDeg: 160 },
  { index: 13, name: 'Chitra',        lord: 'Mars',    deity: 'Tvashtar',        startDeg: 173.3333 },
  { index: 14, name: 'Swati',         lord: 'Rahu',    deity: 'Vayu',            startDeg: 186.6667 },
  { index: 15, name: 'Vishakha',      lord: 'Jupiter', deity: 'Indra-Agni',      startDeg: 200 },
  { index: 16, name: 'Anuradha',      lord: 'Saturn',  deity: 'Mitra',           startDeg: 213.3333 },
  { index: 17, name: 'Jyeshtha',      lord: 'Mercury', deity: 'Indra',           startDeg: 226.6667 },
  { index: 18, name: 'Moola',         lord: 'Ketu',    deity: 'Nirriti',         startDeg: 240 },
  { index: 19, name: 'Purva Ashadha', lord: 'Venus',   deity: 'Apas',            startDeg: 253.3333 },
  { index: 20, name: 'Uttara Ashadha',lord: 'Sun',     deity: 'Vishve Devas',    startDeg: 266.6667 },
  { index: 21, name: 'Shravana',      lord: 'Moon',    deity: 'Vishnu',          startDeg: 280 },
  { index: 22, name: 'Dhanishtha',    lord: 'Mars',    deity: 'Vasu',            startDeg: 293.3333 },
  { index: 23, name: 'Shatabhisha',   lord: 'Rahu',    deity: 'Varuna',          startDeg: 306.6667 },
  { index: 24, name: 'Purva Bhadrapada', lord: 'Jupiter', deity: 'Aja Ekapada',  startDeg: 320 },
  { index: 25, name: 'Uttara Bhadrapada', lord: 'Saturn', deity: 'Ahir Budhnya', startDeg: 333.3333 },
  { index: 26, name: 'Revati',        lord: 'Mercury', deity: 'Pushan',          startDeg: 346.6667 },
];

// Vimshottari Dasha — total cycle = 120 years
// Order: Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury
const VIMSHOTTARI_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const VIMSHOTTARI_YEARS = {
  'Ketu': 7, 'Venus': 20, 'Sun': 6, 'Moon': 10, 'Mars': 7,
  'Rahu': 18, 'Jupiter': 16, 'Saturn': 19, 'Mercury': 17,
};

// Graha data
const GRAHAS = [
  { id: 'Sun',     vedic: 'Surya',   symbol: '☉', sweId: 0 },
  { id: 'Moon',    vedic: 'Chandra',  symbol: '☽', sweId: 1 },
  { id: 'Mars',    vedic: 'Mangal',   symbol: '♂', sweId: 4 },
  { id: 'Mercury', vedic: 'Budh',     symbol: '☿', sweId: 2 },
  { id: 'Jupiter', vedic: 'Guru',     symbol: '♃', sweId: 5 },
  { id: 'Venus',   vedic: 'Shukra',   symbol: '♀', sweId: 3 },
  { id: 'Saturn',  vedic: 'Shani',    symbol: '♄', sweId: 6 },
  { id: 'Rahu',    vedic: 'Rahu',     symbol: '☊', sweId: 11 }, // SE_TRUE_NODE
  { id: 'Ketu',    vedic: 'Ketu',     symbol: '☋', sweId: -1 }, // computed from Rahu
];

// Exaltation and debilitation degrees (sidereal)
const GRAHA_DIGNITY = {
  Sun:     { exalted: { rashi: 0, deg: 10 },  debilitated: { rashi: 6, deg: 10 } },  // Mesha 10° / Tula 10°
  Moon:    { exalted: { rashi: 1, deg: 3 },   debilitated: { rashi: 7, deg: 3 } },   // Vrishabha 3° / Vrishchika 3°
  Mars:    { exalted: { rashi: 9, deg: 28 },  debilitated: { rashi: 3, deg: 28 } },  // Makara 28° / Karka 28°
  Mercury: { exalted: { rashi: 5, deg: 15 },  debilitated: { rashi: 11, deg: 15 } }, // Kanya 15° / Meena 15°
  Jupiter: { exalted: { rashi: 3, deg: 5 },   debilitated: { rashi: 9, deg: 5 } },   // Karka 5° / Makara 5°
  Venus:   { exalted: { rashi: 11, deg: 27 }, debilitated: { rashi: 5, deg: 27 } },  // Meena 27° / Kanya 27°
  Saturn:  { exalted: { rashi: 6, deg: 20 },  debilitated: { rashi: 0, deg: 20 } },  // Tula 20° / Mesha 20°
};

// Own signs
const OWN_SIGNS = {
  Sun: [4],           // Simha
  Moon: [3],          // Karka
  Mars: [0, 7],       // Mesha, Vrishchika
  Mercury: [2, 5],    // Mithuna, Kanya
  Jupiter: [8, 11],   // Dhanu, Meena
  Venus: [1, 6],      // Vrishabha, Tula
  Saturn: [9, 10],    // Makara, Kumbha
};

module.exports = {
  RASHIS,
  NAKSHATRAS,
  VIMSHOTTARI_ORDER,
  VIMSHOTTARI_YEARS,
  GRAHAS,
  GRAHA_DIGNITY,
  OWN_SIGNS,
};
