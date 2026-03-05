/* ════════════════════════════════════════════════════════════════════
   AATMAN · bhakti.js
   Bhajan & Devotional Music Dashboard
   Deity tabs · Category filters · Card grid · YouTube modal
════════════════════════════════════════════════════════════════════ */

'use strict';

(function initBhakti() {

  // ─── Bhajan Data ──────────────────────────────────────────────────
  // ytSearch: opens YouTube search (always works)
  // ytId: optional direct video ID for embedded player

  const BHAJANS = [
    // ── GANESHA ────────────────────────────────────────────────────
    {
      id: 1, deity: 'ganesha', deityName: 'Ganesha', deityIcon: '🐘',
      title: 'Jai Ganesh Deva',
      artist: 'Anuradha Paudwal',
      category: 'morning-aarti', categoryLabel: 'Morning Aarti',
      ytSearch: 'Jai Ganesh Deva Morning Aarti Anuradha Paudwal',
      ytId: '',
      description: 'The beloved morning aarti for Lord Ganesha, remover of all obstacles and the lord of new beginnings.',
      color: '#FF7B00',
    },
    {
      id: 2, deity: 'ganesha', deityName: 'Ganesha', deityIcon: '🐘',
      title: 'Ganesh Vandana',
      artist: 'Pandit Jasraj',
      category: 'bhajan', categoryLabel: 'Bhajan',
      ytSearch: 'Ganesh Vandana Pandit Jasraj classical',
      ytId: '',
      description: 'A classical Ganesh vandana invoking blessings before any sacred endeavour.',
      color: '#FF7B00',
    },
    {
      id: 3, deity: 'ganesha', deityName: 'Ganesha', deityIcon: '🐘',
      title: 'Sukhkarta Dukhharta',
      artist: 'Lata Mangeshkar',
      category: 'morning-aarti', categoryLabel: 'Morning Aarti',
      ytSearch: 'Sukhkarta Dukhharta Ganesh Aarti Lata Mangeshkar',
      ytId: '',
      description: 'The iconic Maharashtrian Ganesh aarti, the giver of joy and remover of sorrow.',
      color: '#FF7B00',
    },
    {
      id: 4, deity: 'ganesha', deityName: 'Ganesha', deityIcon: '🐘',
      title: 'Ganpati Bappa Morya',
      artist: 'Festival Chant',
      category: 'festival', categoryLabel: 'Festival',
      ytSearch: 'Ganpati Bappa Morya festival bhajan chanting',
      ytId: '',
      description: 'The jubilant festival chant resounding through Ganesh Chaturthi celebrations across India.',
      color: '#FF7B00',
    },

    // ── SHIVA ──────────────────────────────────────────────────────
    {
      id: 5, deity: 'shiva', deityName: 'Shiva', deityIcon: '🔱',
      title: 'Om Namah Shivaya',
      artist: 'Shankar Mahadevan',
      category: 'mantra', categoryLabel: 'Mantra',
      ytSearch: 'Om Namah Shivaya Shankar Mahadevan full song',
      ytId: '',
      description: 'The Panchakshara mantra — the five sacred syllables of Lord Shiva, the destroyer of ego and transformer of souls.',
      color: '#3B5BDB',
    },
    {
      id: 6, deity: 'shiva', deityName: 'Shiva', deityIcon: '🔱',
      title: 'Shiv Tandav Stotram',
      artist: 'Ravana (traditional)',
      category: 'bhajan', categoryLabel: 'Bhajan',
      ytSearch: 'Shiv Tandav Stotram Sanskrit devotional',
      ytId: '',
      description: 'The cosmic dance of Shiva — the mighty hymn composed by Ravana in praise of the Mahakala.',
      color: '#3B5BDB',
    },
    {
      id: 7, deity: 'shiva', deityName: 'Shiva', deityIcon: '🔱',
      title: 'Shiva Chalisa',
      artist: 'Anuradha Paudwal',
      category: 'bhajan', categoryLabel: 'Bhajan',
      ytSearch: 'Shiva Chalisa Anuradha Paudwal full',
      ytId: '',
      description: 'The forty verses in praise of Lord Shiva, the auspicious one and lord of Kailash.',
      color: '#3B5BDB',
    },
    {
      id: 8, deity: 'shiva', deityName: 'Shiva', deityIcon: '🔱',
      title: 'Maha Mrityunjaya Mantra',
      artist: 'S.P. Balasubrahmanyam',
      category: 'meditation', categoryLabel: 'Meditation',
      ytSearch: 'Maha Mrityunjaya Mantra meditation 108 times',
      ytId: '',
      description: 'The great death-conquering mantra of Lord Shiva — for healing, longevity and liberation.',
      color: '#3B5BDB',
    },
    {
      id: 9, deity: 'shiva', deityName: 'Shiva', deityIcon: '🔱',
      title: 'Shiv Dhun',
      artist: 'Various Artists',
      category: 'meditation', categoryLabel: 'Meditation',
      ytSearch: 'Shiv Dhun meditation music peaceful',
      ytId: '',
      description: 'A meditative Shiv dhun for deep peace and inner stillness.',
      color: '#3B5BDB',
    },

    // ── VISHNU ─────────────────────────────────────────────────────
    {
      id: 10, deity: 'vishnu', deityName: 'Vishnu', deityIcon: '🪷',
      title: 'Om Namo Bhagavate Vasudevaya',
      artist: 'Pandit Jasraj',
      category: 'mantra', categoryLabel: 'Mantra',
      ytSearch: 'Om Namo Bhagavate Vasudevaya Pandit Jasraj',
      ytId: '',
      description: 'The twelve-syllable Dvadasakshara mantra of Lord Vishnu, the preserver of the universe.',
      color: '#2E7D32',
    },
    {
      id: 11, deity: 'vishnu', deityName: 'Vishnu', deityIcon: '🪷',
      title: 'Vishnu Sahasranama',
      artist: 'M.S. Subbulakshmi',
      category: 'bhajan', categoryLabel: 'Bhajan',
      ytSearch: 'Vishnu Sahasranama MS Subbulakshmi full',
      ytId: '',
      description: 'The thousand names of Lord Vishnu sung in the incomparable voice of M.S. Subbulakshmi.',
      color: '#2E7D32',
    },
    {
      id: 12, deity: 'vishnu', deityName: 'Vishnu', deityIcon: '🪷',
      title: 'Lakshmi Narayan Aarti',
      artist: 'Anuradha Paudwal',
      category: 'evening', categoryLabel: 'Evening Prayer',
      ytSearch: 'Lakshmi Narayan Aarti evening prayer devotional',
      ytId: '',
      description: 'The evening aarti for the divine couple, Lakshmi and Narayan — bringers of abundance and grace.',
      color: '#2E7D32',
    },

    // ── KRISHNA ────────────────────────────────────────────────────
    {
      id: 13, deity: 'krishna', deityName: 'Krishna', deityIcon: '🦚',
      title: 'Hare Krishna Mahamantra',
      artist: 'ISKCON',
      category: 'mantra', categoryLabel: 'Mantra',
      ytSearch: 'Hare Krishna Mahamantra ISKCON kirtan',
      ytId: '',
      description: 'The Maha Mantra — the great chant for deliverance. Sixteen names, chanted for joy, peace and liberation.',
      color: '#6A1B9A',
    },
    {
      id: 14, deity: 'krishna', deityName: 'Krishna', deityIcon: '🦚',
      title: 'Achyutam Keshavam',
      artist: 'Traditional',
      category: 'bhajan', categoryLabel: 'Bhajan',
      ytSearch: 'Achyutam Keshavam Krishna Damodaram devotional',
      ytId: '',
      description: 'A joyful bhajan invoking the beautiful, eternal names of Lord Krishna.',
      color: '#6A1B9A',
    },
    {
      id: 15, deity: 'krishna', deityName: 'Krishna', deityIcon: '🦚',
      title: 'Radhe Radhe',
      artist: 'Hari Om Sharan',
      category: 'bhajan', categoryLabel: 'Bhajan',
      ytSearch: 'Radhe Radhe bhajan Hari Om Sharan devotional',
      ytId: '',
      description: 'A sweet bhajan calling the name of Radha — the very essence of divine love and devotion.',
      color: '#6A1B9A',
    },
    {
      id: 16, deity: 'krishna', deityName: 'Krishna', deityIcon: '🦚',
      title: 'Shyam Teri Bansi',
      artist: 'Lata Mangeshkar',
      category: 'meditation', categoryLabel: 'Meditation',
      ytSearch: 'Shyam Teri Bansi devotional Lata Mangeshkar',
      ytId: '',
      description: 'The enchanting flute of Krishna — a meditative invocation of the blue-throated lord of Vrindavan.',
      color: '#6A1B9A',
    },
    {
      id: 17, deity: 'krishna', deityName: 'Krishna', deityIcon: '🦚',
      title: 'Govinda Bolo Hari Gopal Bolo',
      artist: 'Jagjit Singh',
      category: 'morning-aarti', categoryLabel: 'Morning Aarti',
      ytSearch: 'Govinda Bolo Hari Gopal Bolo Jagjit Singh',
      ytId: '',
      description: 'A soul-stirring morning invocation of Lord Govinda — the cowherd god who sustains the world.',
      color: '#6A1B9A',
    },

    // ── DURGA ──────────────────────────────────────────────────────
    {
      id: 18, deity: 'durga', deityName: 'Durga', deityIcon: '🌙',
      title: 'Jai Mata Di',
      artist: 'Narendra Chanchal',
      category: 'bhajan', categoryLabel: 'Bhajan',
      ytSearch: 'Jai Mata Di Narendra Chanchal popular bhajan',
      ytId: '',
      description: 'The triumphant chant of victory to the Divine Mother — protector of her devotees.',
      color: '#C62828',
    },
    {
      id: 19, deity: 'durga', deityName: 'Durga', deityIcon: '🌙',
      title: 'Durga Chalisa',
      artist: 'Anuradha Paudwal',
      category: 'bhajan', categoryLabel: 'Bhajan',
      ytSearch: 'Durga Chalisa Anuradha Paudwal full',
      ytId: '',
      description: 'Forty devotional verses to the mighty Goddess Durga, the slayer of demons and giver of power.',
      color: '#C62828',
    },
    {
      id: 20, deity: 'durga', deityName: 'Durga', deityIcon: '🌙',
      title: 'Aigiri Nandini (Mahishasura Mardini)',
      artist: 'M.S. Subbulakshmi',
      category: 'festival', categoryLabel: 'Festival',
      ytSearch: 'Aigiri Nandini Mahishasura Mardini MS Subbulakshmi',
      ytId: '',
      description: 'The fierce and beautiful hymn to Goddess Durga — her victory over the buffalo demon, Mahishasura.',
      color: '#C62828',
    },
    {
      id: 21, deity: 'durga', deityName: 'Durga', deityIcon: '🌙',
      title: 'Ambe Tu Hai Jagdambe',
      artist: 'Narendra Chanchal',
      category: 'morning-aarti', categoryLabel: 'Morning Aarti',
      ytSearch: 'Ambe Tu Hai Jagdambe morning aarti Narendra Chanchal',
      ytId: '',
      description: 'The morning aarti to the universal mother — she who is the power behind all creation.',
      color: '#C62828',
    },

    // ── HANUMAN ────────────────────────────────────────────────────
    {
      id: 22, deity: 'hanuman', deityName: 'Hanuman', deityIcon: '🌟',
      title: 'Hanuman Chalisa',
      artist: 'Hari Om Sharan',
      category: 'bhajan', categoryLabel: 'Bhajan',
      ytSearch: 'Hanuman Chalisa Hari Om Sharan full',
      ytId: '',
      description: 'Goswami Tulsidas\'s forty verses of devotion to Hanuman — the fearless servant of Ram.',
      color: '#E65100',
    },
    {
      id: 23, deity: 'hanuman', deityName: 'Hanuman', deityIcon: '🌟',
      title: 'Bajrang Baan',
      artist: 'Traditional',
      category: 'bhajan', categoryLabel: 'Bhajan',
      ytSearch: 'Bajrang Baan traditional Hanuman prayer',
      ytId: '',
      description: 'The powerful prayer to Hanuman — Bajrang, the one with a strong body like a thunderbolt.',
      color: '#E65100',
    },
    {
      id: 24, deity: 'hanuman', deityName: 'Hanuman', deityIcon: '🌟',
      title: 'Shri Ram Jai Ram',
      artist: 'Various',
      category: 'mantra', categoryLabel: 'Mantra',
      ytSearch: 'Shri Ram Jai Ram Jai Jai Ram chanting meditation',
      ytId: '',
      description: 'The Ram naam kirtan that Hanuman himself holds dearest — chanting the name of Ram as a path to liberation.',
      color: '#E65100',
    },
    {
      id: 25, deity: 'hanuman', deityName: 'Hanuman', deityIcon: '🌟',
      title: 'Mangal Murti Maruti',
      artist: 'Traditional Marathi',
      category: 'morning-aarti', categoryLabel: 'Morning Aarti',
      ytSearch: 'Mangal Murti Maruti Hanuman aarti Marathi',
      ytId: '',
      description: 'The auspicious morning aarti of Hanuman in the Marathi tradition — for courage and blessings.',
      color: '#E65100',
    },

    // ── SARASWATI ──────────────────────────────────────────────────
    {
      id: 26, deity: 'saraswati', deityName: 'Saraswati', deityIcon: '🎶',
      title: 'Saraswati Vandana',
      artist: 'Pandit Jasraj',
      category: 'morning-aarti', categoryLabel: 'Morning Aarti',
      ytSearch: 'Saraswati Vandana Pandit Jasraj classical',
      ytId: '',
      description: 'An invocation to Goddess Saraswati — the divine mother of knowledge, music and the arts.',
      color: '#0277BD',
    },
    {
      id: 27, deity: 'saraswati', deityName: 'Saraswati', deityIcon: '🎶',
      title: 'Ya Devi Sarva Bhuteshu',
      artist: 'M.S. Subbulakshmi',
      category: 'bhajan', categoryLabel: 'Bhajan',
      ytSearch: 'Ya Devi Sarva Bhuteshu shloka chanting',
      ytId: '',
      description: 'The great hymn from Devi Mahatmya — saluting the Goddess who dwells in all beings as wisdom and power.',
      color: '#0277BD',
    },
    {
      id: 28, deity: 'saraswati', deityName: 'Saraswati', deityIcon: '🎶',
      title: 'Veena Vadini Vandana',
      artist: 'Lata Mangeshkar',
      category: 'bhajan', categoryLabel: 'Bhajan',
      ytSearch: 'Saraswati Veena Vadan Vandana devotional classical',
      ytId: '',
      description: 'A classical devotional to the veena-playing Saraswati — mother of all learning and creative expression.',
      color: '#0277BD',
    },

    // ── RAM ────────────────────────────────────────────────────────
    {
      id: 29, deity: 'ram', deityName: 'Ram', deityIcon: '🏹',
      title: 'Ram Naam Satya Hai',
      artist: 'Traditional',
      category: 'bhajan', categoryLabel: 'Bhajan',
      ytSearch: 'Ram Naam Satya Hai devotional bhajan peaceful',
      ytId: '',
      description: 'The eternal truth: the name of Ram is truth itself. A profound devotional for the soul\'s surrender.',
      color: '#1565C0',
    },
    {
      id: 30, deity: 'ram', deityName: 'Ram', deityIcon: '🏹',
      title: 'Shri Ram Chandra Kripalu',
      artist: 'Lata Mangeshkar',
      category: 'evening', categoryLabel: 'Evening Prayer',
      ytSearch: 'Shri Ram Chandra Kripalu Bhajman Lata Mangeshkar',
      ytId: '',
      description: 'The beautiful evening prayer to Lord Ram — the compassionate, the gracious, the lord of Ayodhya.',
      color: '#1565C0',
    },
    {
      id: 31, deity: 'ram', deityName: 'Ram', deityIcon: '🏹',
      title: 'Ramayan Sunderkand Path',
      artist: 'Various',
      category: 'meditation', categoryLabel: 'Meditation',
      ytSearch: 'Sunderkand path meditation Hanuman Ramayan',
      ytId: '',
      description: 'The Sunderkand chapter of Valmiki Ramayan — Hanuman\'s journey to Lanka, a path of devotion and courage.',
      color: '#1565C0',
    },
    {
      id: 32, deity: 'ram', deityName: 'Ram', deityIcon: '🏹',
      title: 'Jai Raghunandan Jai Siyaram',
      artist: 'Jagjit Singh',
      category: 'bhajan', categoryLabel: 'Bhajan',
      ytSearch: 'Jai Raghunandan Jai Siyaram Jagjit Singh',
      ytId: '',
      description: 'The joyful bhajan saluting Ram and Sita — the divine couple who embody duty, love and righteousness.',
      color: '#1565C0',
    },

    // ── UNIVERSAL / MEDITATION ─────────────────────────────────────
    {
      id: 33, deity: 'all', deityName: 'Universal', deityIcon: '🌸',
      title: 'Om Shanti Om',
      artist: 'Various',
      category: 'meditation', categoryLabel: 'Meditation',
      ytSearch: 'Om Shanti Om meditation music peaceful 432hz',
      ytId: '',
      description: 'A universal peace mantra — Om, the primordial sound, and Shanti, the boundless peace of the Atman.',
      color: '#FF9933',
    },
    {
      id: 34, deity: 'all', deityName: 'Universal', deityIcon: '🌸',
      title: 'Gayatri Mantra',
      artist: 'Pandit Jasraj',
      category: 'morning-aarti', categoryLabel: 'Morning Aarti',
      ytSearch: 'Gayatri Mantra Pandit Jasraj 108 times',
      ytId: '',
      description: 'The Gayatri — the most sacred Vedic mantra. A prayer to the sun of wisdom to illuminate our minds.',
      color: '#FF9933',
    },
    {
      id: 35, deity: 'all', deityName: 'Universal', deityIcon: '🌸',
      title: 'Evening Aarti Compilation',
      artist: 'Various Artists',
      category: 'evening', categoryLabel: 'Evening Prayer',
      ytSearch: 'Hindu evening aarti compilation peaceful devotional',
      ytId: '',
      description: 'A collection of gentle evening aartis to close the day with gratitude and devotion.',
      color: '#FF9933',
    },
    {
      id: 36, deity: 'all', deityName: 'Universal', deityIcon: '🌸',
      title: '432 Hz Healing Mantra Music',
      artist: 'Spiritual Ambient',
      category: 'meditation', categoryLabel: 'Meditation',
      ytSearch: '432Hz Hindu mantra meditation healing music',
      ytId: '',
      description: 'Deep healing frequencies blended with ancient mantras for meditation, sleep and inner peace.',
      color: '#FF9933',
    },
  ];

  // ─── State ─────────────────────────────────────────────────────────
  let activeDeity    = 'all';
  let activeCategory = 'all';
  let initialized    = false;

  // ─── DOM refs ──────────────────────────────────────────────────────
  const deityTabs    = document.getElementById('deityTabs');
  const categoryTabs = document.getElementById('categoryTabs');
  const grid         = document.getElementById('bhajanGrid');

  const ytModal      = document.getElementById('ytModal');
  const ytOverlay    = document.getElementById('ytModalOverlay');
  const ytCloseBtn   = document.getElementById('ytCloseBtn');
  const ytTitle      = document.getElementById('ytModalTitle');
  const ytArtist     = document.getElementById('ytModalArtist');
  const ytQueryPrev  = document.getElementById('ytQueryPreview');
  const ytSearchLink = document.getElementById('ytSearchLink');
  const ytEmbedBtn   = document.getElementById('ytEmbedBtn');
  const ytEmbedArea  = document.getElementById('ytEmbedArea');
  const ytIframe     = document.getElementById('ytIframe');
  const ytDescription= document.getElementById('ytDescription');

  // ─── Filter & Render ──────────────────────────────────────────────
  function getFiltered() {
    return BHAJANS.filter(b => {
      const deityMatch    = activeDeity    === 'all' || b.deity === activeDeity;
      const categoryMatch = activeCategory === 'all' || b.category === activeCategory;
      return deityMatch && categoryMatch;
    });
  }

  function renderGrid() {
    if (!grid) return;
    grid.innerHTML = '';
    const filtered = getFiltered();

    if (!filtered.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);font-style:italic;">
          🪷 No bhajans found for this combination. Try another filter.
        </div>`;
      return;
    }

    filtered.forEach(b => {
      const card = document.createElement('div');
      card.className = 'bhajan-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Play ${b.title} by ${b.artist}`);
      card.style.setProperty('--deity-color', b.color);

      card.innerHTML = `
        <div class="bhajan-card-header">
          <div class="bhajan-deity-bg" style="background:${b.color}"></div>
          <div class="bhajan-deity-icon">${b.deityIcon}</div>
          <div class="bhajan-play-btn" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
        </div>
        <div class="bhajan-card-body">
          <h3 class="bhajan-title">${Aatman.utils.escapeHtml(b.title)}</h3>
          <p class="bhajan-artist">${Aatman.utils.escapeHtml(b.artist)}</p>
          <div class="bhajan-footer">
            <span class="bhajan-category-badge">${Aatman.utils.escapeHtml(b.categoryLabel)}</span>
            <span class="bhajan-deity-badge">${Aatman.utils.escapeHtml(b.deityName)}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => openModal(b));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(b); }
      });

      grid.appendChild(card);
    });
  }

  // ─── Deity tabs ───────────────────────────────────────────────────
  deityTabs?.addEventListener('click', (e) => {
    const btn = e.target.closest('.deity-tab[data-deity]');
    if (!btn) return;
    activeDeity = btn.dataset.deity;

    deityTabs.querySelectorAll('.deity-tab').forEach(t =>
      t.classList.toggle('active', t === btn)
    );
    renderGrid();
  });

  // ─── Category tabs ────────────────────────────────────────────────
  categoryTabs?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tab[data-category]');
    if (!btn) return;
    activeCategory = btn.dataset.category;

    categoryTabs.querySelectorAll('.filter-tab').forEach(t =>
      t.classList.toggle('active', t === btn)
    );
    renderGrid();
  });

  // ─── YouTube Modal ────────────────────────────────────────────────
  function openModal(bhajan) {
    if (!ytModal) return;

    // Reset state
    ytEmbedArea?.classList.add('hidden');
    if (ytIframe) ytIframe.src = '';
    if (ytEmbedBtn) ytEmbedBtn.textContent = 'Try Embedded Player';

    const searchQuery = bhajan.ytSearch;
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

    if (ytTitle)       ytTitle.textContent   = bhajan.title;
    if (ytArtist)      ytArtist.textContent  = bhajan.artist;
    if (ytQueryPrev)   ytQueryPrev.textContent = searchQuery;
    if (ytSearchLink)  ytSearchLink.href     = ytUrl;
    if (ytDescription) ytDescription.textContent = bhajan.description;

    // If we have a direct video ID, set it up for the embed btn
    if (ytEmbedBtn) {
      ytEmbedBtn.dataset.videoId = bhajan.ytId || '';
      ytEmbedBtn.dataset.query   = searchQuery;
    }

    ytModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';

    // Focus close button for accessibility
    setTimeout(() => ytCloseBtn?.focus(), 100);
  }

  function closeModal() {
    if (!ytModal) return;
    ytModal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    // Stop video
    if (ytIframe) ytIframe.src = '';
    ytEmbedArea?.classList.add('hidden');
  }

  ytCloseBtn?.addEventListener('click', closeModal);
  ytOverlay?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ytModal && !ytModal.hasAttribute('hidden')) {
      closeModal();
    }
  });

  // Embedded player button
  ytEmbedBtn?.addEventListener('click', () => {
    if (!ytEmbedArea) return;
    const isHidden = ytEmbedArea.classList.contains('hidden');

    if (isHidden) {
      const videoId = ytEmbedBtn.dataset.videoId;

      if (videoId) {
        // Direct embed
        if (ytIframe) ytIframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
      } else {
        // Show a manual input for users to paste a YouTube URL
        showEmbedInput();
        return;
      }

      ytEmbedArea.classList.remove('hidden');
      ytEmbedBtn.textContent = 'Hide Player';
    } else {
      ytEmbedArea.classList.add('hidden');
      if (ytIframe) ytIframe.src = '';
      ytEmbedBtn.textContent = 'Try Embedded Player';
    }
  });

  function showEmbedInput() {
    if (!ytEmbedArea) return;
    ytEmbedArea.classList.remove('hidden');
    ytIframe.style.display = 'none';

    // Check if input already exists
    if (ytEmbedArea.querySelector('.yt-url-input-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'yt-url-input-wrapper';
    wrapper.style.cssText = 'padding:1rem;text-align:center;';
    wrapper.innerHTML = `
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.6rem;">
        Paste a YouTube video URL or ID to embed it here:
      </p>
      <div style="display:flex;gap:0.5rem;">
        <input
          type="text"
          class="form-input yt-url-input"
          placeholder="https://youtube.com/watch?v=... or video ID"
          style="flex:1;"
        />
        <button class="btn btn--primary yt-embed-go" style="flex-shrink:0;padding:0.6rem 1rem;">
          Play
        </button>
      </div>
    `;

    const input = wrapper.querySelector('.yt-url-input');
    const goBtn = wrapper.querySelector('.yt-embed-go');

    function embedFromInput() {
      const val = input.value.trim();
      if (!val) return;

      let videoId = val;
      // Extract ID from full URL
      const match = val.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
      if (match) videoId = match[1];

      if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
        ytIframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
        ytIframe.style.display = 'block';
        wrapper.style.display = 'none';
      } else {
        Aatman.toast('Invalid YouTube URL or ID. Please try again.', 'error');
      }
    }

    goBtn.addEventListener('click', embedFromInput);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') embedFromInput(); });

    ytEmbedArea.appendChild(wrapper);
    ytEmbedBtn.textContent = 'Hide Player';
  }

  // ─── onShow hook ──────────────────────────────────────────────────
  Aatman.bhakti = {
    onShow() {
      if (!initialized) {
        renderGrid();
        initialized = true;
      }
    },
  };

  // ─── Init (if section is already visible) ─────────────────────────
  if (!document.getElementById('section-bhakti')?.hasAttribute('hidden')) {
    renderGrid();
    initialized = true;
  }
})();
