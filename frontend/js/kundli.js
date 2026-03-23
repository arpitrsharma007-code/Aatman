// ─── Kundli Section — Frontend Logic ─────────────────────────────────────────
// Handles birth details form, kundli generation, SVG chart, and AI interpretation

(function initKundli() {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────────────
  let currentKundli = null;
  let initialized = false;

  // ─── Indian cities for quick selection ───────────────────────────────────
  const CITIES = [
    { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
    { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
    { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
    { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
    { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
    { name: 'Jaipur', lat: 26.9124, lon: 75.7873 },
    { name: 'Pune', lat: 18.5204, lon: 73.8567 },
    { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
    { name: 'Lucknow', lat: 26.8467, lon: 80.9462 },
    { name: 'Varanasi', lat: 25.3176, lon: 82.9739 },
    { name: 'Patna', lat: 25.6093, lon: 85.1376 },
    { name: 'Bhopal', lat: 23.2599, lon: 77.4126 },
    { name: 'Indore', lat: 22.7196, lon: 75.8577 },
    { name: 'Chandigarh', lat: 30.7333, lon: 76.7794 },
    { name: 'Nagpur', lat: 21.1458, lon: 79.0882 },
    { name: 'Coimbatore', lat: 11.0168, lon: 76.9558 },
    { name: 'Surat', lat: 21.1702, lon: 72.8311 },
    { name: 'Amritsar', lat: 31.6340, lon: 74.8723 },
    { name: 'Ujjain', lat: 23.1765, lon: 75.7885 },
    { name: 'Haridwar', lat: 29.9457, lon: 78.1642 },
    { name: 'Rishikesh', lat: 30.0869, lon: 78.2676 },
    { name: 'Tirupati', lat: 13.6288, lon: 79.4192 },
    { name: 'New York', lat: 40.7128, lon: -74.0060 },
    { name: 'London', lat: 51.5074, lon: -0.1278 },
    { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
    { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
    { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
    { name: 'Toronto', lat: 43.6532, lon: -79.3832 },
    { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  ];

  const TIMEZONES = {
    'Delhi': 5.5, 'Mumbai': 5.5, 'Bangalore': 5.5, 'Hyderabad': 5.5,
    'Chennai': 5.5, 'Kolkata': 5.5, 'Jaipur': 5.5, 'Pune': 5.5,
    'Ahmedabad': 5.5, 'Lucknow': 5.5, 'Varanasi': 5.5, 'Patna': 5.5,
    'Bhopal': 5.5, 'Indore': 5.5, 'Chandigarh': 5.5, 'Nagpur': 5.5,
    'Coimbatore': 5.5, 'Surat': 5.5, 'Amritsar': 5.5, 'Ujjain': 5.5,
    'Haridwar': 5.5, 'Rishikesh': 5.5, 'Tirupati': 5.5,
    'New York': -5, 'London': 0, 'Singapore': 8, 'Dubai': 4,
    'Sydney': 11, 'Toronto': -5, 'San Francisco': -8,
  };

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
        showError('Please fill in all birth details and select a city.');
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
