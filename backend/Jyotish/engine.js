// ─── Aatman Jyotish Engine ───────────────────────────────────────────────────
// Full Vedic birth chart (Kundli) generation using Swiss Ephemeris WASM
// Calculations: Graha positions, Lagna, Nakshatras, Vimshottari Dasha, Yogas, Doshas

const {
  RASHIS, NAKSHATRAS, VIMSHOTTARI_ORDER, VIMSHOTTARI_YEARS,
  GRAHAS, GRAHA_DIGNITY, OWN_SIGNS,
} = require('./data');

let swe = null; // Swiss Ephemeris instance (lazy-loaded)

// ─── Initialize Swiss Ephemeris ──────────────────────────────────────────────
async function initSwissEph() {
  if (swe) return swe;
  try {
    const SwissEPH = require('sweph-wasm');
    swe = await SwissEPH.init();
    console.log('  ✅ Swiss Ephemeris WASM initialized — version:', swe.swe_version());
    return swe;
  } catch (err) {
    console.error('  ❌ Swiss Ephemeris init failed:', err.message);
    throw new Error('Jyotish engine failed to initialize. Please try again.');
  }
}

// ─── Helper: Get Nakshatra from longitude ────────────────────────────────────
function getNakshatra(longitude) {
  const nakshatraSpan = 360 / 27; // 13.3333°
  const padaSpan = nakshatraSpan / 4; // 3.3333°
  const index = Math.floor(longitude / nakshatraSpan) % 27;
  const degInNakshatra = longitude - (index * nakshatraSpan);
  const pada = Math.floor(degInNakshatra / padaSpan) + 1;
  return {
    ...NAKSHATRAS[index],
    pada,
    degInNakshatra: degInNakshatra,
  };
}

// ─── Helper: Get Rashi from longitude ────────────────────────────────────────
function getRashi(longitude) {
  const index = Math.floor(longitude / 30) % 12;
  const deg = longitude % 30;
  return { ...RASHIS[index], degrees: deg };
}

// ─── Helper: Get graha dignity ───────────────────────────────────────────────
function getGrahaDignity(grahaId, rashiIndex) {
  if (grahaId === 'Rahu' || grahaId === 'Ketu') return 'neutral';
  const dignity = GRAHA_DIGNITY[grahaId];
  if (!dignity) return 'neutral';
  if (rashiIndex === dignity.exalted.rashi) return 'exalted';
  if (rashiIndex === dignity.debilitated.rashi) return 'debilitated';
  if (OWN_SIGNS[grahaId]?.includes(rashiIndex)) return 'own_sign';
  // Friendly/enemy signs could be added later
  return 'neutral';
}

// ─── Calculate Graha Positions ───────────────────────────────────────────────
async function calculateGrahaPositions(julday) {
  const ephemeris = await initSwissEph();
  ephemeris.swe_set_sid_mode(ephemeris.SE_SIDM_LAHIRI, 0, 0);
  const flags = ephemeris.SEFLG_MOSEPH | ephemeris.SEFLG_SIDEREAL | ephemeris.SEFLG_SPEED;

  const positions = [];

  for (const graha of GRAHAS) {
    if (graha.id === 'Ketu') continue; // calculated from Rahu

    const result = ephemeris.swe_calc_ut(julday, graha.sweId, flags);
    const longitude = result[0];
    const speed = result[3]; // daily speed
    const isRetrograde = speed < 0;

    const rashi = getRashi(longitude);
    const nakshatra = getNakshatra(longitude);
    const dignity = getGrahaDignity(graha.id, rashi.index);

    positions.push({
      id: graha.id,
      vedic: graha.vedic,
      symbol: graha.symbol,
      longitude,
      rashi,
      nakshatra,
      dignity,
      isRetrograde,
      speed,
    });
  }

  // Calculate Ketu (180° opposite Rahu)
  const rahu = positions.find(p => p.id === 'Rahu');
  if (rahu) {
    const ketuLon = (rahu.longitude + 180) % 360;
    const ketuGraha = GRAHAS.find(g => g.id === 'Ketu');
    positions.push({
      id: 'Ketu',
      vedic: 'Ketu',
      symbol: ketuGraha.symbol,
      longitude: ketuLon,
      rashi: getRashi(ketuLon),
      nakshatra: getNakshatra(ketuLon),
      dignity: 'neutral',
      isRetrograde: true, // Rahu/Ketu always retrograde
      speed: rahu.speed,
    });
  }

  return positions;
}

// ─── Calculate Lagna (Ascendant) & House Cusps ───────────────────────────────
async function calculateHouses(julday, lat, lon) {
  const ephemeris = await initSwissEph();
  ephemeris.swe_set_sid_mode(ephemeris.SE_SIDM_LAHIRI, 0, 0);

  // 'E' = Equal house system (most common in Vedic)
  const result = ephemeris.swe_houses_ex(julday, ephemeris.SEFLG_SIDEREAL, lat, lon, 'E');

  const ascendant = result.ascmc[0]; // Lagna longitude
  const mc = result.ascmc[1]; // Midheaven

  const houses = [];
  for (let i = 1; i <= 12; i++) {
    const cusp = result.cusps[i];
    houses.push({
      number: i,
      cusp,
      rashi: getRashi(cusp),
    });
  }

  return {
    ascendant: {
      longitude: ascendant,
      rashi: getRashi(ascendant),
      nakshatra: getNakshatra(ascendant),
    },
    mc: {
      longitude: mc,
      rashi: getRashi(mc),
    },
    houses,
  };
}

// ─── Vimshottari Dasha Calculation ───────────────────────────────────────────
function calculateVimshottariDasha(moonLongitude, birthDateMs) {
  const moonNakshatra = getNakshatra(moonLongitude);
  const dashaLord = moonNakshatra.lord; // Starting Mahadasha lord

  // How far through the nakshatra is the Moon?
  const nakshatraSpan = 360 / 27;
  const progressInNakshatra = moonNakshatra.degInNakshatra / nakshatraSpan; // 0 to 1

  // Find the starting lord's index in Vimshottari order
  const startIndex = VIMSHOTTARI_ORDER.indexOf(dashaLord);

  // Remaining years in first dasha
  const firstDashaTotalYears = VIMSHOTTARI_YEARS[dashaLord];
  const remainingYears = firstDashaTotalYears * (1 - progressInNakshatra);

  const dashas = [];
  let currentDate = new Date(birthDateMs);

  for (let i = 0; i < 9; i++) {
    const lordIndex = (startIndex + i) % 9;
    const lord = VIMSHOTTARI_ORDER[lordIndex];
    const totalYears = VIMSHOTTARI_YEARS[lord];
    const years = (i === 0) ? remainingYears : totalYears;

    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate.getTime() + years * 365.25 * 24 * 60 * 60 * 1000);

    // Calculate Antardashas (sub-periods)
    const antardashas = [];
    for (let j = 0; j < 9; j++) {
      const adLordIndex = (lordIndex + j) % 9;
      const adLord = VIMSHOTTARI_ORDER[adLordIndex];
      const adYears = (years * VIMSHOTTARI_YEARS[adLord]) / 120;
      const adStart = new Date(antardashas.length > 0
        ? antardashas[antardashas.length - 1].endDate
        : startDate);
      const adEnd = new Date(adStart.getTime() + adYears * 365.25 * 24 * 60 * 60 * 1000);

      antardashas.push({
        lord: adLord,
        years: adYears,
        startDate: adStart.toISOString().split('T')[0],
        endDate: adEnd.toISOString().split('T')[0],
      });
    }

    dashas.push({
      lord,
      totalYears,
      activeYears: parseFloat(years.toFixed(2)),
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      antardashas,
    });

    currentDate = endDate;
  }

  // Find current running dasha
  const now = Date.now();
  let currentDasha = null;
  let currentAntardasha = null;

  for (const d of dashas) {
    if (new Date(d.startDate).getTime() <= now && now <= new Date(d.endDate).getTime()) {
      currentDasha = d;
      for (const ad of d.antardashas) {
        if (new Date(ad.startDate).getTime() <= now && now <= new Date(ad.endDate).getTime()) {
          currentAntardasha = ad;
          break;
        }
      }
      break;
    }
  }

  return {
    moonNakshatra: moonNakshatra.name,
    dashaLord,
    dashas,
    current: {
      mahadasha: currentDasha ? currentDasha.lord : null,
      antardasha: currentAntardasha ? currentAntardasha.lord : null,
      mahadashaEnd: currentDasha ? currentDasha.endDate : null,
      antardashaEnd: currentAntardasha ? currentAntardasha.endDate : null,
    },
  };
}

// ─── Yoga Detection ──────────────────────────────────────────────────────────
function detectYogas(positions, houses) {
  const yogas = [];

  const getGraha = (id) => positions.find(p => p.id === id);
  const lagnaRashi = houses.ascendant.rashi.index;

  // Helper: which house is a planet in (from lagna)?
  const houseOf = (rashiIndex) => ((rashiIndex - lagnaRashi + 12) % 12) + 1;

  const moon = getGraha('Moon');
  const jupiter = getGraha('Jupiter');
  const sun = getGraha('Sun');
  const mars = getGraha('Mars');
  const venus = getGraha('Venus');
  const saturn = getGraha('Saturn');
  const mercury = getGraha('Mercury');

  // Gajakesari Yoga — Jupiter in kendra from Moon
  if (moon && jupiter) {
    const diff = ((jupiter.rashi.index - moon.rashi.index) + 12) % 12;
    if ([0, 3, 6, 9].includes(diff)) {
      yogas.push({
        name: 'Gajakesari Yoga',
        description: 'Jupiter is in a kendra (1st, 4th, 7th, or 10th) from Moon. Bestows wisdom, fame, and prosperity.',
        grahas: ['Jupiter', 'Moon'],
        strength: jupiter.dignity === 'exalted' ? 'strong' : 'moderate',
      });
    }
  }

  // Pancha Mahapurusha Yogas — benefic planets in own/exalted sign in kendra from lagna
  const kendras = [1, 4, 7, 10];
  const mahapurushaCheck = [
    { graha: mars,    yoga: 'Ruchaka Yoga',    desc: 'Mars in own/exalted sign in kendra. Gives courage, command, and strength.' },
    { graha: mercury, yoga: 'Bhadra Yoga',     desc: 'Mercury in own/exalted sign in kendra. Gives intelligence, eloquence, and learning.' },
    { graha: jupiter, yoga: 'Hamsa Yoga',      desc: 'Jupiter in own/exalted sign in kendra. Gives righteousness, spiritual wisdom, and respect.' },
    { graha: venus,   yoga: 'Malavya Yoga',    desc: 'Venus in own/exalted sign in kendra. Gives beauty, comfort, and artistic talent.' },
    { graha: saturn,  yoga: 'Shasha Yoga',     desc: 'Saturn in own/exalted sign in kendra. Gives authority, discipline, and longevity.' },
  ];

  for (const mp of mahapurushaCheck) {
    if (!mp.graha) continue;
    const house = houseOf(mp.graha.rashi.index);
    const isInKendra = kendras.includes(house);
    const isStrong = ['exalted', 'own_sign'].includes(mp.graha.dignity);
    if (isInKendra && isStrong) {
      yogas.push({
        name: mp.yoga,
        description: mp.desc,
        grahas: [mp.graha.id],
        strength: mp.graha.dignity === 'exalted' ? 'strong' : 'moderate',
      });
    }
  }

  // Raja Yoga — lord of kendra + lord of trikona in conjunction or mutual aspect
  // (Simplified: check if kendra lord and trikona lord are in same rashi)
  const kendraHouses = [1, 4, 7, 10];
  const trikonaHouses = [1, 5, 9];

  const rashiLordOf = (houseNum) => {
    const rashiIndex = (lagnaRashi + houseNum - 1) % 12;
    return RASHIS[rashiIndex].lord;
  };

  for (const kh of kendraHouses) {
    for (const th of trikonaHouses) {
      if (kh === th) continue;
      const kendraLord = rashiLordOf(kh);
      const trikonaLord = rashiLordOf(th);
      if (kendraLord === trikonaLord) continue; // same planet

      const kGraha = getGraha(kendraLord);
      const tGraha = getGraha(trikonaLord);
      if (kGraha && tGraha && kGraha.rashi.index === tGraha.rashi.index) {
        yogas.push({
          name: 'Raja Yoga',
          description: `Lord of ${kh}th house (${kendraLord}) conjunct lord of ${th}th house (${trikonaLord}). Indicates power, success, and recognition.`,
          grahas: [kendraLord, trikonaLord],
          strength: 'strong',
        });
        break; // one raja yoga is enough to report
      }
    }
  }

  // Budhaditya Yoga — Sun and Mercury in same sign
  if (sun && mercury && sun.rashi.index === mercury.rashi.index) {
    yogas.push({
      name: 'Budhaditya Yoga',
      description: 'Sun and Mercury together. Gives sharp intellect and communication skills.',
      grahas: ['Sun', 'Mercury'],
      strength: 'moderate',
    });
  }

  // Chandra-Mangal Yoga — Moon and Mars in same sign
  if (moon && mars && moon.rashi.index === mars.rashi.index) {
    yogas.push({
      name: 'Chandra-Mangal Yoga',
      description: 'Moon and Mars together. Indicates wealth through effort and determination.',
      grahas: ['Moon', 'Mars'],
      strength: 'moderate',
    });
  }

  return yogas;
}

// ─── Dosha Detection ─────────────────────────────────────────────────────────
function detectDoshas(positions, houses) {
  const doshas = [];
  const lagnaRashi = houses.ascendant.rashi.index;
  const houseOf = (rashiIndex) => ((rashiIndex - lagnaRashi + 12) % 12) + 1;

  const getGraha = (id) => positions.find(p => p.id === id);
  const mars = getGraha('Mars');
  const rahu = getGraha('Rahu');
  const ketu = getGraha('Ketu');
  const saturn = getGraha('Saturn');
  const moon = getGraha('Moon');

  // Mangal Dosha — Mars in 1, 2, 4, 7, 8, or 12 from Lagna
  if (mars) {
    const marsHouse = houseOf(mars.rashi.index);
    if ([1, 2, 4, 7, 8, 12].includes(marsHouse)) {
      let severity = 'mild';
      if ([7, 8].includes(marsHouse)) severity = 'strong';
      if (mars.dignity === 'own_sign' || mars.dignity === 'exalted') severity = 'mild'; // reduced

      doshas.push({
        name: 'Mangal Dosha (Kuja Dosha)',
        description: `Mars is in the ${marsHouse}th house from Lagna. May cause delays or difficulties in marriage. Severity: ${severity}.`,
        severity,
        remedies: [
          'Recite Hanuman Chalisa on Tuesdays',
          'Wear a coral (Moonga) after consulting a jyotishi',
          'Perform Mangal Shanti puja',
          'Fast on Tuesdays',
          'Donate red lentils (masoor dal) on Tuesdays',
        ],
      });
    }
  }

  // Kaal Sarp Dosha — all planets between Rahu and Ketu
  if (rahu && ketu) {
    const rahuLon = rahu.longitude;
    const ketuLon = ketu.longitude;
    const otherPlanets = positions.filter(p => p.id !== 'Rahu' && p.id !== 'Ketu');

    // Check if all planets are on one side of the Rahu-Ketu axis
    let allOnOneSide = true;
    const normalizedRange = (rahuLon < ketuLon);

    for (const planet of otherPlanets) {
      const lon = planet.longitude;
      let isBetween;
      if (normalizedRange) {
        isBetween = lon >= rahuLon && lon <= ketuLon;
      } else {
        isBetween = lon >= rahuLon || lon <= ketuLon;
      }
      if (!isBetween) {
        allOnOneSide = false;
        break;
      }
    }

    if (allOnOneSide) {
      doshas.push({
        name: 'Kaal Sarp Dosha',
        description: 'All planets are hemmed between Rahu and Ketu. May cause unexpected obstacles, karmic challenges, and delays in life milestones.',
        severity: 'strong',
        remedies: [
          'Perform Kaal Sarp Dosha Nivaran puja at Trimbakeshwar',
          'Recite Rahu mantra: Om Raam Rahave Namah',
          'Donate black sesame seeds on Saturdays',
          'Worship Lord Shiva with Abhishekam',
          'Visit Rameswaram for Kaal Sarp puja',
        ],
      });
    }
  }

  // Sade Sati — Saturn within 1 rashi of Moon
  if (saturn && moon) {
    const diff = ((saturn.rashi.index - moon.rashi.index) + 12) % 12;
    if (diff === 11 || diff === 0 || diff === 1) {
      const phase = diff === 11 ? 'rising (ascending)' : diff === 0 ? 'peak' : 'setting (descending)';
      doshas.push({
        name: 'Sade Sati',
        description: `Saturn is transiting ${phase} phase relative to Moon sign. A 7.5-year period of challenges, transformation, and karmic lessons.`,
        severity: diff === 0 ? 'strong' : 'moderate',
        remedies: [
          'Recite Shani Chalisa or Shani Stotra on Saturdays',
          'Wear a Neelam (Blue Sapphire) ONLY after proper consultation',
          'Light a sesame oil lamp on Saturdays',
          'Donate black clothes and mustard oil on Saturdays',
          'Serve the elderly and disabled',
        ],
      });
    }
  }

  return doshas;
}

// ─── Master Function: Generate Full Kundli ───────────────────────────────────
async function generateKundli({ year, month, day, hour, minute, lat, lon, timezone, place }) {
  // Convert local time to UTC
  const localHourDecimal = hour + (minute / 60);
  const utcHour = localHourDecimal - timezone;

  const ephemeris = await initSwissEph();
  const julday = ephemeris.swe_julday(year, month, day, utcHour, ephemeris.SE_GREG_CAL);
  const ayanamsha = ephemeris.swe_get_ayanamsa_ut(julday);

  // Core calculations
  const positions = await calculateGrahaPositions(julday);
  const houseData = await calculateHouses(julday, lat, lon);

  // Birth date as timestamp for dasha calculation
  const birthDate = new Date(Date.UTC(year, month - 1, day, Math.floor(utcHour), (utcHour % 1) * 60));

  // Moon-based calculations
  const moon = positions.find(p => p.id === 'Moon');
  const dasha = calculateVimshottariDasha(moon.longitude, birthDate.getTime());

  // Yogas and Doshas
  const yogas = detectYogas(positions, houseData);
  const doshas = detectDoshas(positions, houseData);

  // Place planets in houses
  const lagnaRashi = houseData.ascendant.rashi.index;
  const planetsInHouses = {};
  for (let i = 1; i <= 12; i++) planetsInHouses[i] = [];
  for (const p of positions) {
    const house = ((p.rashi.index - lagnaRashi + 12) % 12) + 1;
    planetsInHouses[house].push({
      id: p.id,
      vedic: p.vedic,
      symbol: p.symbol,
      degrees: p.rashi.degrees.toFixed(1),
      nakshatra: p.nakshatra.name,
      pada: p.nakshatra.pada,
      isRetrograde: p.isRetrograde,
      dignity: p.dignity,
    });
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      engine: 'Swiss Ephemeris (WASM)',
      ayanamsha: { system: 'Lahiri (Chitrapaksha)', value: parseFloat(ayanamsha.toFixed(4)) },
      houseSystem: 'Equal',
    },
    birthDetails: {
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      place,
      coordinates: { lat, lon },
      timezone: `UTC${timezone >= 0 ? '+' : ''}${timezone}`,
      julianDay: julday,
    },
    lagna: {
      rashi: houseData.ascendant.rashi,
      nakshatra: houseData.ascendant.nakshatra,
      longitude: parseFloat(houseData.ascendant.longitude.toFixed(4)),
    },
    grahas: positions.map(p => ({
      id: p.id,
      vedic: p.vedic,
      symbol: p.symbol,
      longitude: parseFloat(p.longitude.toFixed(4)),
      rashi: p.rashi.name,
      rashiEn: p.rashi.nameEn,
      rashiIndex: p.rashi.index,
      degrees: parseFloat(p.rashi.degrees.toFixed(2)),
      nakshatra: p.nakshatra.name,
      pada: p.nakshatra.pada,
      nakshatraLord: p.nakshatra.lord,
      deity: p.nakshatra.deity,
      dignity: p.dignity,
      isRetrograde: p.isRetrograde,
    })),
    houses: houseData.houses.map(h => ({
      number: h.number,
      rashi: h.rashi.name,
      rashiLord: h.rashi.lord,
      planets: planetsInHouses[h.number],
    })),
    dasha,
    yogas,
    doshas,
  };
}

module.exports = {
  initSwissEph,
  generateKundli,
  getNakshatra,
  getRashi,
};
