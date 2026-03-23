// ─── Kundli Section — Frontend Logic ─────────────────────────────────────────
// Handles birth details form, kundli generation, SVG chart, and AI interpretation

(function initKundli() {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────────────
  let currentKundli = null;
  let initialized = false;

  // ─── Indian cities for quick selection ───────────────────────────────────
  const CITIES = [
    // Major metros
    { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
    { name: 'New Delhi', lat: 28.6139, lon: 77.2090 },
    { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
    { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
    { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
    { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
    { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
    { name: 'Pune', lat: 18.5204, lon: 73.8567 },
    { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
    // Rajasthan
    { name: 'Jaipur', lat: 26.9124, lon: 75.7873 },
    { name: 'Jodhpur', lat: 26.2389, lon: 73.0243 },
    { name: 'Udaipur', lat: 24.5854, lon: 73.7125 },
    { name: 'Ajmer', lat: 26.4499, lon: 74.6399 },
    { name: 'Kota', lat: 25.2138, lon: 75.8648 },
    { name: 'Bikaner', lat: 28.0229, lon: 73.3119 },
    { name: 'Pushkar', lat: 26.4897, lon: 74.5511 },
    { name: 'Jaisalmer', lat: 26.9157, lon: 70.9083 },
    { name: 'Sikar', lat: 27.6094, lon: 75.1399 },
    { name: 'Alwar', lat: 27.5530, lon: 76.6346 },
    // North India
    { name: 'Lucknow', lat: 26.8467, lon: 80.9462 },
    { name: 'Varanasi', lat: 25.3176, lon: 82.9739 },
    { name: 'Patna', lat: 25.6093, lon: 85.1376 },
    { name: 'Chandigarh', lat: 30.7333, lon: 76.7794 },
    { name: 'Amritsar', lat: 31.6340, lon: 74.8723 },
    { name: 'Haridwar', lat: 29.9457, lon: 78.1642 },
    { name: 'Rishikesh', lat: 30.0869, lon: 78.2676 },
    { name: 'Dehradun', lat: 30.3165, lon: 78.0322 },
    { name: 'Agra', lat: 27.1767, lon: 78.0081 },
    { name: 'Kanpur', lat: 26.4499, lon: 80.3319 },
    { name: 'Prayagraj', lat: 25.4358, lon: 81.8463 },
    { name: 'Allahabad', lat: 25.4358, lon: 81.8463 },
    { name: 'Mathura', lat: 27.4924, lon: 77.6737 },
    { name: 'Vrindavan', lat: 27.5806, lon: 77.6961 },
    { name: 'Ayodhya', lat: 26.7922, lon: 82.1998 },
    { name: 'Gorakhpur', lat: 26.7606, lon: 83.3732 },
    { name: 'Ranchi', lat: 23.3441, lon: 85.3096 },
    { name: 'Guwahati', lat: 26.1445, lon: 91.7362 },
    // Central India
    { name: 'Bhopal', lat: 23.2599, lon: 77.4126 },
    { name: 'Indore', lat: 22.7196, lon: 75.8577 },
    { name: 'Nagpur', lat: 21.1458, lon: 79.0882 },
    { name: 'Ujjain', lat: 23.1765, lon: 75.7885 },
    { name: 'Raipur', lat: 21.2514, lon: 81.6296 },
    // West India
    { name: 'Surat', lat: 21.1702, lon: 72.8311 },
    { name: 'Vadodara', lat: 22.3072, lon: 73.1812 },
    { name: 'Rajkot', lat: 22.3039, lon: 70.8022 },
    { name: 'Nashik', lat: 19.9975, lon: 73.7898 },
    { name: 'Dwarka', lat: 22.2394, lon: 68.9678 },
    { name: 'Somnath', lat: 20.8880, lon: 70.4013 },
    { name: 'Goa', lat: 15.2993, lon: 74.1240 },
    // South India
    { name: 'Coimbatore', lat: 11.0168, lon: 76.9558 },
    { name: 'Tirupati', lat: 13.6288, lon: 79.4192 },
    { name: 'Madurai', lat: 9.9252, lon: 78.1198 },
    { name: 'Mysore', lat: 12.2958, lon: 76.6394 },
    { name: 'Mysuru', lat: 12.2958, lon: 76.6394 },
    { name: 'Kochi', lat: 9.9312, lon: 76.2673 },
    { name: 'Thiruvananthapuram', lat: 8.5241, lon: 76.9366 },
    { name: 'Visakhapatnam', lat: 17.6868, lon: 83.2185 },
    { name: 'Vijayawada', lat: 16.5062, lon: 80.6480 },
    { name: 'Mangalore', lat: 12.9141, lon: 74.8560 },
    { name: 'Pondicherry', lat: 11.9416, lon: 79.8083 },
    { name: 'Thanjavur', lat: 10.7870, lon: 79.1378 },
    { name: 'Rameshwaram', lat: 9.2881, lon: 79.3174 },
    // East India
    { name: 'Bhubaneswar', lat: 20.2961, lon: 85.8245 },
    { name: 'Puri', lat: 19.8135, lon: 85.8312 },
    // International (Hindu diaspora)
    { name: 'New York', lat: 40.7128, lon: -74.0060 },
    { name: 'London', lat: 51.5074, lon: -0.1278 },
    { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
    { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
    { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
    { name: 'Toronto', lat: 43.6532, lon: -79.3832 },
    { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
    { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
    { name: 'Chicago', lat: 41.8781, lon: -87.6298 },
    { name: 'Houston', lat: 29.7604, lon: -95.3698 },
    { name: 'Kuala Lumpur', lat: 3.1390, lon: 101.6869 },
    { name: 'Kathmandu', lat: 27.7172, lon: 85.3240 },
    { name: 'Colombo', lat: 6.9271, lon: 79.8612 },
    { name: 'Mauritius', lat: -20.1609, lon: 57.5012 },
    { name: 'Fiji', lat: -17.7134, lon: 178.0650 },
    { name: 'Durban', lat: -29.8587, lon: 31.0218 },
    { name: 'Nairobi', lat: -1.2921, lon: 36.8219 },
    { name: 'Berlin', lat: 52.5200, lon: 13.4050 },
    { name: 'Amsterdam', lat: 52.3676, lon: 4.9041 },
    { name: 'Melbourne', lat: -37.8136, lon: 144.9631 },
    { name: 'Auckland', lat: -36.8485, lon: 174.7633 },
    { name: 'Vancouver', lat: 49.2827, lon: -123.1207 },
    { name: 'Sao Paulo', lat: -23.5505, lon: -46.6333 },
  ];

  // Timezone lookup — all Indian cities default to 5.5 via fallback
  const TIMEZONES = {
    'New York': -5, 'London': 0, 'Singapore': 8, 'Dubai': 4,
    'Sydney': 11, 'Toronto': -5, 'San Francisco': -8, 'Los Angeles': -8,
    'Chicago': -6, 'Houston': -6, 'Kuala Lumpur': 8, 'Kathmandu': 5.75,
    'Colombo': 5.5, 'Mauritius': 4, 'Fiji': 12, 'Durban': 2,
    'Nairobi': 3, 'Berlin': 1, 'Amsterdam': 1, 'Melbourne': 11,
    'Auckland': 13, 'Vancouver': -8, 'Sao Paulo': -3,
  };
  // Indian cities all use IST 5.5 — handled by fallback in the lookup

  // ─── Lazy init — called when section becomes visible ────────────────────
  function setup() {
    if (initialized) return;

    const form = document.getElementById('kundliForm');
    const generateBtn = document.getElementById('kundliGenerateBtn');
    const resultArea = document.getElementById('kundliResult');
    const chartSvg = document.getElementById('kundliChartSvg');
    const loadingEl = document.getElementById('kundliLoading');
    const errorEl = document.getElementById('kundliError');
    const interpretBtn = document.getElementById('kundliInterpretBtn');
    const interpretArea = document.getElementById('kundliInterpretation');
    const interpretLoading = document.getElementById('interpretLoading');

    if (!form) {
      console.error('Kundli: #kundliForm not found in DOM');
      return;
    }

    initialized = true;
    console.log('Kundli: initialized');

    // ─── City autocomplete ───────────────────────────────────────────────
    const placeInput = document.getElementById('kundliPlace');
    const cityDropdown = document.getElementById('kundliCityDropdown');
    const latInput = document.getElementById('kundliLat');
    const lonInput = document.getElementById('kundliLon');
    const tzInput = document.getElementById('kundliTz');

    if (placeInput && cityDropdown) {
      placeInput.addEventListener('input', () => {
        const q = placeInput.value.toLowerCase().trim();
        if (q.length < 2) { cityDropdown.classList.add('hidden'); return; }
        const matches = CITIES.filter(c => c.name.toLowerCase().includes(q)).slice(0, 6);
        if (matches.length === 0) { cityDropdown.classList.add('hidden'); return; }
        cityDropdown.innerHTML = matches.map(c =>
          `<button type="button" class="city-option" data-lat="${c.lat}" data-lon="${c.lon}" data-name="${c.name}">${c.name}</button>`
        ).join('');
        cityDropdown.classList.remove('hidden');
      });

      cityDropdown.addEventListener('click', (e) => {
        const btn = e.target.closest('.city-option');
        if (!btn) return;
        placeInput.value = btn.dataset.name;
        latInput.value = btn.dataset.lat;
        lonInput.value = btn.dataset.lon;
        tzInput.value = TIMEZONES[btn.dataset.name] || 5.5;
        cityDropdown.classList.add('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.place-input-wrapper')) cityDropdown.classList.add('hidden');
      });
    }

    // ─── Generate Kundli ─────────────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const date = document.getElementById('kundliDate').value;
      const time = document.getElementById('kundliTime').value;
      const place = placeInput.value;
      const lat = parseFloat(latInput.value);
      const lon = parseFloat(lonInput.value);
      const tz = parseFloat(tzInput.value);

      if (!date || !time || isNaN(lat) || isNaN(lon)) {
        if (!date || !time) {
          showError('Please fill in your date and time of birth.');
        } else {
          showError('Please select a city from the dropdown list. Start typing and tap on a city name.');
        }
        return;
      }

      showLoading(true);
      hideError();
      resultArea.classList.add('hidden');
      interpretArea.classList.add('hidden');

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (Aatman.auth?.getToken()) {
          headers['Authorization'] = `Bearer ${Aatman.auth.getToken()}`;
        }

        const response = await fetch('/api/kundli/generate', {
          method: 'POST',
          headers,
          body: JSON.stringify({ date, time, lat, lon, timezone: tz, place }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to generate kundli');

        currentKundli = data.kundli;
        renderKundli(data.kundli);
        resultArea.classList.remove('hidden');
      } catch (err) {
        showError(err.message);
      } finally {
        showLoading(false);
      }
    });

    // ─── Interpret Kundli ────────────────────────────────────────────────
    if (interpretBtn) {
      interpretBtn.addEventListener('click', async () => {
        if (!currentKundli) return;

        interpretBtn.disabled = true;
        interpretBtn.textContent = 'Consulting the stars...';
        interpretLoading.classList.remove('hidden');
        interpretArea.classList.remove('hidden');
        document.getElementById('interpretContent').innerHTML = '';

        try {
          const headers = { 'Content-Type': 'application/json' };
          if (Aatman.auth?.getToken()) {
            headers['Authorization'] = `Bearer ${Aatman.auth.getToken()}`;
          }

          const response = await fetch('/api/kundli/interpret', {
            method: 'POST',
            headers,
            body: JSON.stringify({ kundli: currentKundli }),
          });

          const data = await response.json();
          if (!data.success) throw new Error(data.error || 'Interpretation failed');

          renderInterpretation(data.interpretation);
        } catch (err) {
          document.getElementById('interpretContent').innerHTML =
            `<p class="kundli-error-text">${err.message}</p>`;
        } finally {
          interpretLoading.classList.add('hidden');
          interpretBtn.disabled = false;
          interpretBtn.textContent = 'Get AI Jyotish Reading';
        }
      });
    }

    // ─── Share Kundli on WhatsApp ────────────────────────────────────────
    const shareBtn = document.getElementById('kundliShareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (!currentKundli) return;
        const lagna = currentKundli.lagna?.rashi?.name || '';
        const moon = currentKundli.grahas?.find(g => g.id === 'Moon');
        const moonSign = moon?.rashi || '';
        const text = `I just generated my Vedic Janam Kundli on Aatman! Lagna: ${lagna}, Moon Sign: ${moonSign}. Try yours for free — it takes 30 seconds.\n\nhttps://aatman-production.up.railway.app?ref=wa-kundli`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      });
    }

    // ─── Helper functions ────────────────────────────────────────────────
    function showLoading(show) {
      if (loadingEl) loadingEl.classList.toggle('hidden', !show);
      if (generateBtn) generateBtn.disabled = show;
    }

    function showError(msg) {
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.classList.remove('hidden');
      }
    }

    function hideError() {
      if (errorEl) errorEl.classList.add('hidden');
    }
  }

  // ─── Render Kundli Chart + Details ───────────────────────────────────────
  function renderKundli(kundli) {
    renderNorthIndianChart(kundli);
    renderGrahaTable(kundli);
    renderDasha(kundli);
    renderYogasDoshas(kundli);
  }

  // ─── North Indian Chart SVG ──────────────────────────────────────────────
  function renderNorthIndianChart(kundli) {
    const chartSvg = document.getElementById('kundliChartSvg');
    if (!chartSvg) return;

    const size = 360;
    const mid = size / 2;
    const pad = 10;
    const outer = mid - pad;

    // House positions in North Indian chart (diamond layout)
    const housePositions = [
      { house: 1,  textX: mid,         textY: mid - outer/2 - 10 },
      { house: 2,  textX: mid - outer/2, textY: mid - outer/2 + 10 },
      { house: 3,  textX: pad + outer/4, textY: mid - outer/4 },
      { house: 4,  textX: mid - outer/2 - 10, textY: mid + 5 },
      { house: 5,  textX: pad + outer/4, textY: mid + outer/4 },
      { house: 6,  textX: mid - outer/2, textY: mid + outer/2 },
      { house: 7,  textX: mid,         textY: mid + outer/2 + 15 },
      { house: 8,  textX: mid + outer/2, textY: mid + outer/2 },
      { house: 9,  textX: pad + outer*2 - outer/4, textY: mid + outer/4 },
      { house: 10, textX: mid + outer/2 + 10, textY: mid + 5 },
      { house: 11, textX: pad + outer*2 - outer/4, textY: mid - outer/4 },
      { house: 12, textX: mid + outer/2, textY: mid - outer/2 + 10 },
    ];

    // Map planets to houses
    const lagnaRashi = kundli.lagna.rashi.index;
    const planetsInHouse = {};
    for (let i = 1; i <= 12; i++) planetsInHouse[i] = [];
    for (const g of kundli.grahas) {
      const house = ((g.rashiIndex - lagnaRashi + 12) % 12) + 1;
      const label = g.id === 'Mercury' ? 'Bu' : g.id === 'Jupiter' ? 'Gu' :
        g.id === 'Venus' ? 'Sk' : g.id === 'Saturn' ? 'Sa' :
        g.id === 'Sun' ? 'Su' : g.id === 'Moon' ? 'Mo' :
        g.id === 'Mars' ? 'Ma' : g.id === 'Rahu' ? 'Ra' : 'Ke';
      planetsInHouse[house].push(label + (g.isRetrograde ? '\u00AE' : ''));
    }

    // Build SVG
    const t = pad;
    const b = pad + outer * 2;
    const l = pad;
    const r = pad + outer * 2;

    let svg = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" class="kundli-chart-svg">`;
    svg += `<rect x="${pad}" y="${pad}" width="${outer*2}" height="${outer*2}" fill="none" stroke="var(--saffron-dark)" stroke-width="2" rx="3"/>`;
    svg += `<line x1="${mid}" y1="${t}" x2="${l}" y2="${mid}" stroke="var(--saffron-dark)" stroke-width="1.5"/>`;
    svg += `<line x1="${l}" y1="${mid}" x2="${mid}" y2="${b}" stroke="var(--saffron-dark)" stroke-width="1.5"/>`;
    svg += `<line x1="${mid}" y1="${b}" x2="${r}" y2="${mid}" stroke="var(--saffron-dark)" stroke-width="1.5"/>`;
    svg += `<line x1="${r}" y1="${mid}" x2="${mid}" y2="${t}" stroke="var(--saffron-dark)" stroke-width="1.5"/>`;
    svg += `<line x1="${l}" y1="${t}" x2="${r}" y2="${b}" stroke="var(--border)" stroke-width="0.8"/>`;
    svg += `<line x1="${r}" y1="${t}" x2="${l}" y2="${b}" stroke="var(--border)" stroke-width="0.8"/>`;

    for (const hp of housePositions) {
      const planets = planetsInHouse[hp.house] || [];
      const rashiIndex = (lagnaRashi + hp.house - 1) % 12;
      svg += `<text x="${hp.textX}" y="${hp.textY - 12}" text-anchor="middle" class="chart-rashi-num">${rashiIndex + 1}</text>`;
      if (planets.length > 0) {
        const planetStr = planets.join(' ');
        svg += `<text x="${hp.textX}" y="${hp.textY + 4}" text-anchor="middle" class="chart-planet-text">${planetStr}</text>`;
      }
    }

    svg += `<text x="${mid}" y="${t + 16}" text-anchor="middle" class="chart-lagna-label">As</text>`;
    svg += '</svg>';
    chartSvg.innerHTML = svg;
  }

  // ─── Graha Table ─────────────────────────────────────────────────────────
  function renderGrahaTable(kundli) {
    const el = document.getElementById('kundliGrahaTable');
    if (!el) return;

    const rows = kundli.grahas.map(g => {
      const dignityClass = g.dignity === 'exalted' ? 'dignity-exalted' :
        g.dignity === 'debilitated' ? 'dignity-debilitated' :
        g.dignity === 'own_sign' ? 'dignity-own' : '';
      return `<tr>
        <td class="graha-name">${g.symbol} ${g.vedic}</td>
        <td>${g.rashi} ${g.degrees.toFixed(1)}\u00B0</td>
        <td>${g.nakshatra} (${g.pada})</td>
        <td class="${dignityClass}">${g.dignity.replace('_', ' ')}${g.isRetrograde ? ' \u21BA' : ''}</td>
      </tr>`;
    }).join('');

    el.innerHTML = `<table class="graha-table">
      <thead><tr><th>Graha</th><th>Rashi</th><th>Nakshatra</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // ─── Dasha Display ───────────────────────────────────────────────────────
  function renderDasha(kundli) {
    const el = document.getElementById('kundliDasha');
    if (!el || !kundli.dasha) return;

    const { current, dashas } = kundli.dasha;
    let html = '';

    if (current.mahadasha) {
      html += `<div class="dasha-current">
        <div class="dasha-current-label">Current Period</div>
        <div class="dasha-current-value">${current.mahadasha} Mahadasha \u2192 ${current.antardasha} Antardasha</div>
        <div class="dasha-current-dates">Until ${current.antardashaEnd || 'N/A'}</div>
      </div>`;
    }

    html += '<div class="dasha-timeline">';
    const now = Date.now();
    for (const d of dashas) {
      const isActive = new Date(d.startDate).getTime() <= now && now <= new Date(d.endDate).getTime();
      const isPast = new Date(d.endDate).getTime() < now;
      html += `<div class="dasha-block ${isActive ? 'dasha-active' : ''} ${isPast ? 'dasha-past' : ''}">
        <div class="dasha-lord">${d.lord}</div>
        <div class="dasha-years">${d.activeYears}y</div>
        <div class="dasha-dates">${d.startDate.slice(0,4)}-${d.endDate.slice(0,4)}</div>
      </div>`;
    }
    html += '</div>';
    el.innerHTML = html;
  }

  // ─── Yogas & Doshas ─────────────────────────────────────────────────────
  function renderYogasDoshas(kundli) {
    const el = document.getElementById('kundliYogasDoshas');
    if (!el) return;

    let html = '';

    if (kundli.yogas.length > 0) {
      html += '<h4 class="yd-heading">Yogas Found</h4>';
      for (const y of kundli.yogas) {
        html += `<div class="yoga-card yoga-${y.strength}">
          <div class="yoga-name">${y.name}</div>
          <div class="yoga-desc">${y.description}</div>
        </div>`;
      }
    }

    if (kundli.doshas.length > 0) {
      html += '<h4 class="yd-heading" style="margin-top:1rem">Doshas Detected</h4>';
      for (const d of kundli.doshas) {
        html += `<div class="dosha-card dosha-${d.severity}">
          <div class="dosha-name">${d.name}</div>
          <div class="dosha-desc">${d.description}</div>
          <div class="dosha-remedies">
            <strong>Remedies:</strong> ${d.remedies.join(' \u00B7 ')}
          </div>
        </div>`;
      }
    }

    if (kundli.yogas.length === 0 && kundli.doshas.length === 0) {
      html = '<p class="yd-empty">No major yogas or doshas detected in this chart.</p>';
    }

    el.innerHTML = html;
  }

  // ─── Render AI Interpretation ────────────────────────────────────────────
  function renderInterpretation(interp) {
    const el = document.getElementById('interpretContent');
    if (!el) return;

    const sections = [
      { key: 'personality', icon: '\uD83E\uDDD8', title: 'Personality' },
      { key: 'strengths', icon: '\uD83D\uDCAA', title: 'Strengths' },
      { key: 'challenges', icon: '\u26A1', title: 'Challenges' },
      { key: 'career', icon: '\uD83D\uDCBC', title: 'Career' },
      { key: 'relationships', icon: '\u2764\uFE0F', title: 'Relationships' },
      { key: 'spirituality', icon: '\uD83D\uDE4F', title: 'Spiritual Path' },
      { key: 'currentPhase', icon: '\uD83D\uDD2E', title: 'Current Phase' },
      { key: 'yogaInterpretation', icon: '\u2728', title: 'Yoga Effects' },
      { key: 'doshaRemedies', icon: '\uD83D\uDE4F', title: 'Remedies' },
      { key: 'overallGuidance', icon: '\uD83D\uDD49\uFE0F', title: 'Overall Guidance' },
    ];

    let html = '';
    for (const s of sections) {
      if (interp[s.key]) {
        html += `<div class="interp-section">
          <div class="interp-title">${s.icon} ${s.title}</div>
          <p class="interp-text">${interp[s.key]}</p>
        </div>`;
      }
    }

    el.innerHTML = html;
  }

  // ─── Expose — onShow triggers lazy init ──────────────────────────────────
  Aatman.kundli = {
    onShow: setup,
  };
})();
