// ─── Kundli Section — Frontend Logic ─────────────────────────────────────────
// Handles birth details form, kundli generation, SVG chart, and AI interpretation

(function initKundli() {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────────────
  let currentKundli = null;

  // ─── DOM refs ────────────────────────────────────────────────────────────
  const form = document.getElementById('kundliForm');
  const generateBtn = document.getElementById('kundliGenerateBtn');
  const resultArea = document.getElementById('kundliResult');
  const chartSvg = document.getElementById('kundliChartSvg');
  const loadingEl = document.getElementById('kundliLoading');
  const errorEl = document.getElementById('kundliError');
  const interpretBtn = document.getElementById('kundliInterpretBtn');
  const interpretArea = document.getElementById('kundliInterpretation');
  const interpretLoading = document.getElementById('interpretLoading');

  if (!form) return; // Section not in DOM yet

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

  // ─── City autocomplete ───────────────────────────────────────────────────
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

  // ─── Generate Kundli ─────────────────────────────────────────────────────
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

  // ─── Interpret Kundli ────────────────────────────────────────────────────
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

  // ─── Render Kundli Chart + Details ───────────────────────────────────────
  function renderKundli(kundli) {
    renderNorthIndianChart(kundli);
    renderGrahaTable(kundli);
    renderDasha(kundli);
    renderYogasDoshas(kundli);
  }

  // ─── North Indian Chart SVG ──────────────────────────────────────────────
  function renderNorthIndianChart(kundli) {
    const size = 360;
    const mid = size / 2;
    const pad = 10;
    const outer = mid - pad;

    // House positions in North Indian chart (diamond layout)
    // Each house is a triangular/trapezoidal region
    // Houses 1-12 positioned clockwise from top-center
    const housePositions = [
      // house 1 (Lagna) — top center diamond
      { textX: mid, textY: mid - outer * 0.35, house: 1 },
      // house 2 — top-left triangle
      { textX: mid - outer * 0.45, textY: mid - outer * 0.55, house: 2 },
      // house 3 — left-top triangle
      { textX: mid - outer * 0.7, textY: mid - outer * 0.35, house: 3 },
      // house 4 — left center diamond
      { textX: mid - outer * 0.7, textY: mid, house: 4 },
      // house 5 — left-bottom triangle
      { textX: mid - outer * 0.7, textY: mid + outer * 0.35, house: 5 },
      // house 6 — bottom-left triangle
      { textX: mid - outer * 0.45, textY: mid + outer * 0.55, house: 6 },
      // house 7 — bottom center diamond
      { textX: mid, textY: mid + outer * 0.35, house: 7 },
      // house 8 — bottom-right triangle
      { textX: mid + outer * 0.45, textY: mid + outer * 0.55, house: 8 },
      // house 9 — right-bottom triangle
      { textX: mid + outer * 0.7, textY: mid + outer * 0.35, house: 9 },
      // house 10 — right center diamond
      { textX: mid + outer * 0.7, textY: mid, house: 10 },
      // house 11 — right-top triangle
      { textX: mid + outer * 0.7, textY: mid - outer * 0.35, house: 11 },
      // house 12 — top-right triangle
      { textX: mid + outer * 0.45, textY: mid - outer * 0.55, house: 12 },
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
      planetsInHouse[house].push(label + (g.isRetrograde ? '®' : ''));
    }

    // Build SVG
    let svg = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" class="kundli-chart-svg">`;

    // Outer square
    svg += `<rect x="${pad}" y="${pad}" width="${outer*2}" height="${outer*2}" fill="none" stroke="var(--saffron-dark)" stroke-width="2" rx="3"/>`;

    // Inner diamond (connecting midpoints of outer square)
    const t = pad + 0; // top
    const b = pad + outer * 2; // bottom
    const l = pad + 0; // left
    const r = pad + outer * 2; // right
    svg += `<line x1="${mid}" y1="${t}" x2="${l}" y2="${mid}" stroke="var(--saffron-dark)" stroke-width="1.5"/>`;
    svg += `<line x1="${l}" y1="${mid}" x2="${mid}" y2="${b}" stroke="var(--saffron-dark)" stroke-width="1.5"/>`;
    svg += `<line x1="${mid}" y1="${b}" x2="${r}" y2="${mid}" stroke="var(--saffron-dark)" stroke-width="1.5"/>`;
    svg += `<line x1="${r}" y1="${mid}" x2="${mid}" y2="${t}" stroke="var(--saffron-dark)" stroke-width="1.5"/>`;

    // Cross lines dividing the square into triangles
    svg += `<line x1="${l}" y1="${t}" x2="${r}" y2="${b}" stroke="var(--border)" stroke-width="0.8"/>`;
    svg += `<line x1="${r}" y1="${t}" x2="${l}" y2="${b}" stroke="var(--border)" stroke-width="0.8"/>`;

    // House numbers + planets
    for (const hp of housePositions) {
      const planets = planetsInHouse[hp.house] || [];

      // Rashi number (small, muted)
      const rashiIndex = (lagnaRashi + hp.house - 1) % 12;
      svg += `<text x="${hp.textX}" y="${hp.textY - 12}" text-anchor="middle" class="chart-rashi-num">${rashiIndex + 1}</text>`;

      // Planets
      if (planets.length > 0) {
        const planetStr = planets.join(' ');
        svg += `<text x="${hp.textX}" y="${hp.textY + 4}" text-anchor="middle" class="chart-planet-text">${planetStr}</text>`;
      }
    }

    // Lagna indicator
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
        <td>${g.rashi} ${g.degrees.toFixed(1)}°</td>
        <td>${g.nakshatra} (${g.pada})</td>
        <td class="${dignityClass}">${g.dignity.replace('_', ' ')}${g.isRetrograde ? ' ↺' : ''}</td>
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
        <div class="dasha-current-value">${current.mahadasha} Mahadasha → ${current.antardasha} Antardasha</div>
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
            <strong>Remedies:</strong> ${d.remedies.join(' · ')}
          </div>
        </div>`;
      }
    }

    if (kundli.yogas.length === 0 && kundli.doshas.length === 0) {
      html = '<p class="yd-empty">No major yogas or doshas detected in this chart.</p>';
    }

    el.innerHTML = html;
  }

  // ─── Render AI Interpretation (Limited Preview) ──────────────────────────────
  function renderInterpretation(interp) {
    const el = document.getElementById('interpretContent');
    if (!el) return;

    // Only show 3 sections as a teaser — full reading requires a Jyotishi
    const previewSections = [
      { key: 'personality', icon: '🧘', title: 'Personality' },
      { key: 'currentPhase', icon: '🔮', title: 'Current Life Phase' },
      { key: 'overallGuidance', icon: '🕉️', title: 'Overall Guidance' },
    ];

    let html = '<div class="interp-preview-badge">AI Preview — 3 of 10 sections</div>';
    for (const s of previewSections) {
      if (interp[s.key]) {
        html += `<div class="interp-section">
          <div class="interp-title">${s.icon} ${s.title}</div>
          <p class="interp-text">${interp[s.key]}</p>
        </div>`;
      }
    }

    html += `<div class="interp-locked-notice">
      <div class="interp-locked-icon">🔒</div>
      <p><strong>7 more sections locked:</strong> Strengths, Challenges, Career, Relationships, Spiritual Path, Yoga Effects & Remedies — available with a Jyotish expert consultation.</p>
    </div>`;

    el.innerHTML = html;

    // Reveal expert CTA
    const banner = document.getElementById('expertConsultBanner');
    if (banner) banner.classList.remove('hidden');
  }

  // ─── Expert Consult Button → Open Jyotish Waitlist Modal ────────────────
  const consultBtn = document.getElementById('consultExpertBtn');
  const expertModal = document.getElementById('jyotishExpertModal');
  const expertDismiss = document.getElementById('jyotishExpertDismiss');
  const expertSubmitBtn = document.getElementById('jyotishExpertSubmitBtn');
  const expertEmailInput = document.getElementById('jyotishExpertEmail');
  const expertSuccess = document.getElementById('jyotishExpertSuccess');
  const expertForm = document.getElementById('jyotishExpertForm');

  if (consultBtn && expertModal) {
    consultBtn.addEventListener('click', () => {
      expertModal.classList.remove('hidden');
      // Pre-fill with user's email if logged in
      if (Aatman.auth?.currentUser?.email && expertEmailInput) {
        expertEmailInput.value = Aatman.auth.currentUser.email;
      }
    });
  }

  if (expertDismiss && expertModal) {
    expertDismiss.addEventListener('click', () => expertModal.classList.add('hidden'));
  }

  // Close modal on overlay click
  if (expertModal) {
    expertModal.addEventListener('click', (e) => {
      if (e.target === expertModal) expertModal.classList.add('hidden');
    });
  }

  if (expertSubmitBtn && expertEmailInput) {
    expertSubmitBtn.addEventListener('click', async () => {
      const email = expertEmailInput.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        expertEmailInput.style.borderColor = 'var(--error, #e53935)';
        expertEmailInput.placeholder = 'Please enter a valid email';
        return;
      }
      expertEmailInput.style.borderColor = '';
      expertSubmitBtn.disabled = true;
      expertSubmitBtn.textContent = 'Saving...';

      try {
        const res = await fetch('/api/waitlist/astrology', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'jyotish-expert-kundli' }),
        });
        const data = await res.json();
        if (data.success || res.ok) {
          if (expertForm) expertForm.classList.add('hidden');
          if (expertSuccess) expertSuccess.classList.remove('hidden');
          setTimeout(() => expertModal.classList.add('hidden'), 3000);
        } else {
          throw new Error(data.error || 'Could not save');
        }
      } catch (err) {
        expertSubmitBtn.disabled = false;
        expertSubmitBtn.textContent = 'Reserve My Spot';
        Aatman.showToast?.('Could not save. Please try again.', 'error');
      }
    });
  }

  // ─── Export Kundli as PDF ────────────────────────────────────────────────
  const exportPdfBtn = document.getElementById('kundliExportPdfBtn');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', async () => {
      if (!currentKundli) return;

      exportPdfBtn.disabled = true;
      exportPdfBtn.textContent = 'Generating PDF...';

      try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = 210;
        const margin = 14;
        let y = margin;

        // ── Header ──
        pdf.setFillColor(255, 153, 51); // saffron
        pdf.rect(0, 0, pageW, 28, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.text('Aatman — Janma Kundli', margin, 12);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('aatman.app · Vedic Jyotish Birth Chart', margin, 20);
        y = 36;

        // ── Birth Details ──
        pdf.setTextColor(40, 20, 0);
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Birth Details', margin, y); y += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        const bd = currentKundli.birthDetails;
        pdf.text(`Date: ${bd.date}   Time: ${bd.time}   Place: ${bd.place}`, margin, y); y += 5;
        pdf.text(`Lagna (Ascendant): ${currentKundli.lagna.rashi.name} (${currentKundli.lagna.rashi.nameEn})`, margin, y); y += 5;
        pdf.text(`Nakshatra: ${currentKundli.lagna.nakshatra.name} Pada ${currentKundli.lagna.nakshatra.pada}`, margin, y); y += 5;
        pdf.text(`Ayanamsha: ${currentKundli.meta.ayanamsha.system} (${currentKundli.meta.ayanamsha.value.toFixed(4)}°)`, margin, y); y += 10;

        // ── Graha Table ──
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.text('Planetary Positions (Grahas)', margin, y); y += 6;

        const headers = ['Graha', 'Rashi', 'Nakshatra', 'Pada', 'Status'];
        const colW = [30, 38, 46, 16, 50];
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setFillColor(255, 240, 210);
        pdf.rect(margin, y - 4, pageW - margin * 2, 6, 'F');
        let cx = margin;
        headers.forEach((h, i) => { pdf.text(h, cx + 1, y); cx += colW[i]; });
        y += 3;

        pdf.setFont('helvetica', 'normal');
        for (const g of currentKundli.grahas) {
          if (y > 270) { pdf.addPage(); y = margin; }
          cx = margin;
          const row = [
            `${g.vedic}`,
            `${g.rashi} ${g.degrees.toFixed(1)}°`,
            g.nakshatra,
            String(g.pada),
            `${g.dignity.replace('_', ' ')}${g.isRetrograde ? ' ↺' : ''}`,
          ];
          pdf.setFillColor(y % 8 < 4 ? 255 : 250, y % 8 < 4 ? 255 : 248, y % 8 < 4 ? 255 : 240);
          pdf.rect(margin, y - 3.5, pageW - margin * 2, 5, 'F');
          row.forEach((cell, i) => { pdf.text(String(cell), cx + 1, y); cx += colW[i]; });
          y += 5;
        }
        y += 6;

        // ── Dasha ──
        if (y > 240) { pdf.addPage(); y = margin; }
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.text('Vimshottari Dasha', margin, y); y += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        const cur = currentKundli.dasha.current;
        if (cur.mahadasha) {
          pdf.text(`Current: ${cur.mahadasha} Mahadasha → ${cur.antardasha} Antardasha  (until ${cur.antardashaEnd || 'N/A'})`, margin, y); y += 5;
        }
        pdf.setFontSize(9);
        for (const d of currentKundli.dasha.dashas.slice(0, 9)) {
          if (y > 270) { pdf.addPage(); y = margin; }
          pdf.text(`${d.lord}  ${d.startDate.slice(0,4)}–${d.endDate.slice(0,4)}  (${d.activeYears}y)`, margin + 4, y); y += 4.5;
        }
        y += 6;

        // ── Yogas & Doshas ──
        if (currentKundli.yogas.length > 0 || currentKundli.doshas.length > 0) {
          if (y > 230) { pdf.addPage(); y = margin; }
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(13);
          pdf.text('Yogas & Doshas', margin, y); y += 6;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);

          for (const yg of currentKundli.yogas) {
            if (y > 260) { pdf.addPage(); y = margin; }
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Yoga: ${yg.name} (${yg.strength})`, margin, y); y += 4;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            const descLines = pdf.splitTextToSize(yg.description, pageW - margin * 2 - 4);
            pdf.text(descLines, margin + 4, y); y += descLines.length * 4 + 3;
            pdf.setFontSize(10);
          }
          for (const dsh of currentKundli.doshas) {
            if (y > 250) { pdf.addPage(); y = margin; }
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Dosha: ${dsh.name} (${dsh.severity})`, margin, y); y += 4;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            const dLines = pdf.splitTextToSize(dsh.description, pageW - margin * 2 - 4);
            pdf.text(dLines, margin + 4, y); y += dLines.length * 4 + 2;
            const rText = 'Remedies: ' + dsh.remedies.join(' · ');
            const rLines = pdf.splitTextToSize(rText, pageW - margin * 2 - 4);
            pdf.setTextColor(140, 80, 0);
            pdf.text(rLines, margin + 4, y); y += rLines.length * 4 + 3;
            pdf.setTextColor(40, 20, 0);
            pdf.setFontSize(10);
          }
        }

        // ── Footer ──
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(160, 120, 60);
          pdf.text(
            `Generated by Aatman · aatman.app · AI-assisted Jyotish preview — not a substitute for a trained Jyotishi · Page ${i}/${totalPages}`,
            margin, 292
          );
        }

        const name = bd.place || 'kundli';
        pdf.save(`Aatman-Kundli-${name.replace(/\s+/g, '-')}-${bd.date}.pdf`);
        Aatman.showToast?.('Kundli PDF downloaded!', 'success');
      } catch (err) {
        console.error('PDF export error:', err);
        Aatman.showToast?.('PDF generation failed. Try again.', 'error');
      } finally {
        exportPdfBtn.disabled = false;
        exportPdfBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export Kundli as PDF`;
      }
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
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

  // ─── Expose ──────────────────────────────────────────────────────────────
  Aatman.kundli = { onShow: () => {} };
})();
