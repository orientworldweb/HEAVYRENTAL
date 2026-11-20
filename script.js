/* ==========================================================================
   ORIENT WORLD — site behavior
   1. Mobile menu toggle
   2. Scroll-reveal animation for .reveal elements
   3. Quote form submit handler (currently just shows an alert —
      replace this with a real email/backend call when ready, see notes below)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- 0. Slim the header once the page is scrolled ---------- */
  const siteHeader = document.querySelector('header');
  const toTopBtn = document.getElementById('toTop');
  // Two different trigger points (shrink at 80px, grow back below 20px) so the
  // header can never flip back and forth around a single line.
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    if (!siteHeader.classList.contains('scrolled') && y > 80) siteHeader.classList.add('scrolled');
    else if (siteHeader.classList.contains('scrolled') && y < 20) siteHeader.classList.remove('scrolled');
    if (toTopBtn) toTopBtn.classList.toggle('visible', y > 500);
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // Back-to-top: smooth scroll unless the visitor prefers reduced motion
  if (toTopBtn) {
    toTopBtn.addEventListener('click', () => {
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Popup photo frames: blurred backdrop so any photo shape fits ----------
     (used only inside the fleet popup). Copies each photo's address into the CSS variable --img (used by style.css
     section 22). Waits for the photo to load so lazy-loading still works. */
  function setBackdrop(frame) {
    const img = frame.querySelector('img');
    if (!img) return;
    const apply = () => frame.style.setProperty('--img', `url("${img.src}")`);
    if (img.complete && img.naturalWidth) apply();
    else img.addEventListener('load', apply, { once: true });
  }

  /* ---------- Equipment strip: repeat the items so it never shows a gap ----------
     Your HTML lists the items twice. On very wide screens that is not enough to
     fill the width, so each half is repeated 3 times here (the speed is kept the same). */
  (function fillMarquee() {
    const track = document.querySelector('.marquee-track');
    if (!track || track.children.length < 2 || track.children.length % 2) return;
    const one = Array.from(track.children).slice(0, track.children.length / 2).map(n => n.cloneNode(true));
    const SETS = 3;
    track.innerHTML = '';
    for (let half = 0; half < 2; half++) {
      for (let s = 0; s < SETS; s++) one.forEach(n => track.appendChild(n.cloneNode(true)));
    }
    track.style.animationDuration = (32 * SETS) + 's';
  })();

  /* ==========================================================================
     LANGUAGE: English (default) and العربية
     - English text stays in index.html. The Arabic lives in translations.js.
     - T("English text") returns the Arabic when Arabic is on, else the English.
     - The language button swaps all text, flips the page right-to-left,
       remembers the choice, and also updates the WhatsApp message and the map.
     ========================================================================== */
  const AR = window.OW_AR || { text: {}, whatsappMessage: '' };
  const WA_MESSAGE_EN = 'Hello Orient World, I would like to know more about your company and your equipment. I also want to book an order.';
  let lang = 'en';
  try { if (localStorage.getItem('ow_lang') === 'ar') lang = 'ar'; } catch (e) {}
  const isAr = () => lang === 'ar';

  function T(s) {
    if (!isAr() || typeof s !== 'string') return s;
    if (AR.text[s]) return AR.text[s];
    if (s.indexOf(' — ') > -1) {                       // sizes like "Mini Excavator — up to 3 Ton"
      const parts = s.split(' — ').map(p => AR.text[p]);
      if (parts.every(Boolean)) return parts.join(' — ');
    }
    return s;                                          // not translated yet: stay in English
  }

  // Remember every piece of fixed page text (and attribute text) that has an Arabic version
  const textRecords = [];
  const attrRecords = [];
  (function collectTranslatable() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || p.closest('script, style, svg, #equipmentExplorer, #detailModalBody')) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let n;
    while ((n = walker.nextNode())) {
      const ar = AR.text[n.nodeValue.replace(/\s+/g, ' ').trim()];
      if (ar) {
        const pad = n.nodeValue.match(/^(\s*)[\s\S]*?(\s*)$/);
        textRecords.push({ node: n, en: n.nodeValue, ar: pad[1] + ar + pad[2] });
      }
    }
    document.querySelectorAll('[placeholder], [aria-label], [title], img[alt]').forEach(el => {
      ['placeholder', 'aria-label', 'title', 'alt'].forEach(attr => {
        const v = el.getAttribute(attr);
        if (v && AR.text[v]) attrRecords.push({ el, attr, en: v, ar: AR.text[v] });
      });
    });
  })();
  const pageTitleEn = document.title;

  function updateWhatsAppLinks() {
    const msg = isAr() ? AR.whatsappMessage : WA_MESSAGE_EN;
    document.querySelectorAll('a[href^="https://wa.me/"]').forEach(a => {
      a.setAttribute('href', a.getAttribute('href').split('?')[0] + '?text=' + encodeURIComponent(msg));
    });
  }

  function applyLanguage(next, save, initial) {
    lang = next;
    const root = document.documentElement;
    root.lang = lang;
    root.dir = isAr() ? 'rtl' : 'ltr';

    textRecords.forEach(r => { r.node.nodeValue = isAr() ? r.ar : r.en; });
    attrRecords.forEach(r => r.el.setAttribute(r.attr, isAr() ? r.ar : r.en));
    document.title = isAr() ? (AR.text[pageTitleEn] || pageTitleEn) : pageTitleEn;

    const toggle = document.getElementById('langToggle');
    if (toggle) {                                      // the button always offers the OTHER language
      toggle.textContent = isAr() ? 'English' : 'العربية';
      toggle.lang = isAr() ? 'en' : 'ar';
      toggle.setAttribute('aria-label', isAr() ? T('Switch language to English') : 'Switch language to Arabic');
    }
    const formLang = document.getElementById('formLang');   // so you can see which language a quote request came from
    if (formLang) formLang.value = isAr() ? 'Arabic' : 'English';

    if (!initial || isAr()) updateWhatsAppLinks();
    const mapFrame = document.querySelector('iframe.find-map');
    if (mapFrame) {                                    // Google Maps labels in Arabic / English
      const cur = mapFrame.getAttribute('src') || '';
      const want = isAr() ? cur.replace(/!1sen!2sae/g, '!1sar!2sae') : cur.replace(/!1sar!2sae/g, '!1sen!2sae');
      if (want !== cur) mapFrame.setAttribute('src', want);
    }

    buildExplorer();                                   // tabs + tags built by this script
    renderConfigOptions();                             // quote form size / configuration list
    refreshModal();                                    // popup, if it is open
    if (save) { try { localStorage.setItem('ow_lang', lang); } catch (e) {} }
  }

  /* ---------- 1. Mobile menu toggle ---------- */
  const burger = document.getElementById('burgerBtn');
  const navLinks = document.getElementById('navLinks');
  const navQuoteBtn = document.getElementById('navQuoteBtn');
  const quoteSection = document.getElementById('quote');

  if (navQuoteBtn && quoteSection) {
    navQuoteBtn.addEventListener('click', () => {
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      quoteSection.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
    });
  }

  burger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
  });

  // Close the mobile menu whenever a link or button inside it is clicked
  navLinks.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('click', () => {
      navLinks.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- 2. Scroll-reveal animation ---------- */
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('in'), i * 60);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => io.observe(el));
  } else {
    // Fallback for old browsers with no IntersectionObserver support
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ---------- 3. Quote form ---------- */

  /* Fills the "Size / configuration" dropdown based on which equipment
     type is chosen above it. Each entry is a plain descriptive string —
     edit these to match your actual fleet's real tonnage/reach/attachments
     whenever you have exact numbers to swap in. */
  const EQUIPMENT_CONFIGS = {
    excavators: [
      'Mini Excavator — up to 3 Ton — Standard Bucket — Tracked',
      'Mini Excavator — up to 3 Ton — Breaker Attachment — Tracked',
      'Standard Excavator — 8–20 Ton — Bucket',
      'Standard Excavator — 8–20 Ton — Breaker & Bucket',
      'Long Boom Excavator — 20 Ton / 18m Reach — Bucket',
      'Long Boom Excavator — 35 Ton / 24m Reach — Bucket'
    ],
    jcb: [
      'JCB — Standard Bucket — Wheeled',
      'JCB — with Bucket Attachment — Wheeled',
      'JCB — with Breaker Attachment — Wheeled'
    ],
    wheelloaders: [
      'Wheel Loader — Small (under 1.5m³ bucket) — Wheeled',
      'Wheel Loader — Medium (1.5–3m³ bucket) — Wheeled',
      'Wheel Loader — Large (3m³+ bucket) — Wheeled',
      'Boom Loader — Boom & Forks'
    ],
    bobcats: [
      'Bobcat — Standard Bucket — Wheeled',
      'Bobcat Brush — Brush Cutter Attachment',
      'Skid Steer — Forks Attachment',
      'Skid Steer — Auger Attachment'
    ],
    cranes: [
      'Mobile Crane — Standard — Wheeled',
      'Mobile Crane 4x4 — Off-Road Capable',
      'Mobile Crane 6x6 — Heavy-Duty Chassis',
      'Mobile Crane — 25 Ton Capacity',
      'Mobile Crane — 50 Ton Capacity',
      'Mobile Crane — 100 Ton Capacity'
    ],
    crawlercranes: [
      'Crawler Crane — 30 Ton — Tracked',
      'Crawler Crane — 50 Ton — Tracked',
      'Crawler Crane — 80 Ton+ — Tracked'
    ],
    towercranes: [
      'Tower Crane — Small (up to 40m jib)',
      'Tower Crane — Medium (40–60m jib)',
      'Tower Crane — Large (60m+ jib)'
    ],
    hiab: [
      'Hiab Truck — 5 Ton Truck with 2 Ton Crane',
      'Hiab Truck — 10 Ton Truck with 3 Ton Crane',
      'Hiab Truck — 15 Ton Truck with 5 Ton Crane'
    ],
    forklifts: [
      'Mini Forklift — Compact, Light Loads — 1–1.5 Ton',
      'Forklift — Standard, Paved/Yard Use — 2.5–3.5 Ton',
      'Forklift — Standard, Paved/Yard Use — 5 Ton',
      'Forklift 4x4 — Rough Terrain'
    ],
    telehandlers: [
      'Telehandler — 6m Reach',
      'Telehandler — 10m Reach',
      'Telehandler — 14m Reach'
    ],
    earthmoving: [
      'Dozer — Small Class — Standard Blade — Tracked',
      'Dozer — Medium/Large Class — Standard Blade — Tracked',
      'Grader — Fine Grading Blade — Wheeled',
      'Roller — Smooth Drum — Road/Large-Area Compaction',
      'Roller — Pneumatic Tyre — Asphalt Compaction',
      'Mini Roller — Compact Spaces'
    ],
    pickups: [
      '3 Ton Pickup — Open Flatbed',
      '3 Ton Tipper — Hydraulic Tipping Bed'
    ],
    accessequipment: [
      'Scissor Lift — up to 8m',
      'Scissor Lift — up to 12m',
      'Boom Lift — up to 16m',
      'Boom Lift — 20m+'
    ]
  };

  const equipSelect = document.getElementById('equip');
  const configSelect = document.getElementById('equipConfig');

  /* Display labels for each category — kept in one place so the accordion
     below and the "Equipment type" dropdown always say the same thing. */
  const CATEGORY_LABELS = {
    excavators: 'Excavators (mini to long-boom)',
    jcb: 'JCB & Backhoe Loaders',
    wheelloaders: 'Wheel Loaders / Boom Loaders',
    bobcats: 'Bobcats & Skid Steers',
    cranes: 'Mobile Cranes',
    crawlercranes: 'Crawler Cranes',
    towercranes: 'Tower Cranes',
    hiab: 'Hiab / Crane Trucks',
    forklifts: 'Forklifts (mini to 4x4)',
    telehandlers: 'Telehandlers',
    earthmoving: 'Dozers, Graders & Rollers',
    pickups: 'Pickups & Tippers',
    accessequipment: 'Boom Lifts & Scissor Lifts'
  };

  /* ---------- Build the compact "Full equipment list" (tabs + tags) ----------
     One scrolling row of category tabs; the panel below shows that category's
     items as small tags. "All" shows everything at once, grouped by category.
     Built by a function so it can be rebuilt when the language changes. */
  const explorerRoot = document.getElementById('equipmentExplorer');
  let explorerKey = 'all';
  let tabsEl = null, arrowL = null, arrowR = null, eqPanel = null;
  const scrollBehavior = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  const shortLabel = key => T(CATEGORY_LABELS[key].replace(/\s*\(.*?\)/, ''));
  const chipsHtml = list => list.map(c => `<span class="eq-chip">${T(c)}</span>`).join('');

  function renderEqPanel() {
    if (!eqPanel) return;
    eqPanel.innerHTML = explorerKey === 'all'
      ? Object.keys(CATEGORY_LABELS).map(k =>
          `<span class="eq-group">${shortLabel(k)}</span>${chipsHtml(EQUIPMENT_CONFIGS[k] || [])}`).join('')
      : chipsHtml(EQUIPMENT_CONFIGS[explorerKey] || []);
    eqPanel.scrollTop = 0;
  }

  // Show each arrow only when there is more to scroll in that direction.
  // (In right-to-left pages browsers count scrollLeft backwards: 0 at the start
  // on the right, and negative as you move towards the left.)
  function updateArrows() {
    if (!tabsEl) return;
    const max = tabsEl.scrollWidth - tabsEl.clientWidth;
    const s = tabsEl.scrollLeft;
    const rtl = document.documentElement.dir === 'rtl';
    arrowL.classList.toggle('show', rtl ? s > -max + 4 : s > 4);
    arrowR.classList.toggle('show', rtl ? s < -4 : s < max - 4);
  }

  // Auto-scroll: the clicked tab slides to the middle, so the next one is always revealed
  function centerTab(tab, behavior) {
    tabsEl.scrollTo({
      left: tab.offsetLeft - (tabsEl.clientWidth - tab.offsetWidth) / 2,
      behavior: behavior || scrollBehavior()
    });
  }

  function buildExplorer() {
    if (!explorerRoot) return;
    const tabs = [{ key: 'all', label: T('All equipment') }]
      .concat(Object.keys(CATEGORY_LABELS).map(k => ({ key: k, label: shortLabel(k) })));

    explorerRoot.innerHTML = `
      <div class="eq-tabs-wrap">
        <button class="eq-arrow eq-arrow-left" type="button" aria-label="${T('Scroll categories left')}">
          <span class="eq-arrow-btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
        <div class="eq-tabs" role="tablist">
          ${tabs.map(t => `<button class="eq-tab${t.key === explorerKey ? ' active' : ''}" type="button" role="tab"
              aria-selected="${t.key === explorerKey}" data-key="${t.key}">${t.label}</button>`).join('')}
        </div>
        <button class="eq-arrow eq-arrow-right" type="button" aria-label="${T('Scroll categories right')}">
          <span class="eq-arrow-btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
      </div>
      <div class="eq-panel" id="eqPanel" role="tabpanel"></div>
      <div class="eq-hint">${T('Scroll inside the box to see everything, or pick a category above.')}</div>`;

    eqPanel = document.getElementById('eqPanel');
    tabsEl = explorerRoot.querySelector('.eq-tabs');
    arrowL = explorerRoot.querySelector('.eq-arrow-left');
    arrowR = explorerRoot.querySelector('.eq-arrow-right');

    tabsEl.addEventListener('scroll', updateArrows, { passive: true });
    // Manual arrows: move the row by about 60% of its visible width
    arrowL.addEventListener('click', () => tabsEl.scrollBy({ left: -Math.round(tabsEl.clientWidth * 0.6), behavior: scrollBehavior() }));
    arrowR.addEventListener('click', () => tabsEl.scrollBy({ left: Math.round(tabsEl.clientWidth * 0.6), behavior: scrollBehavior() }));

    explorerRoot.querySelectorAll('.eq-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        centerTab(tab);
        explorerKey = tab.dataset.key;
        explorerRoot.querySelectorAll('.eq-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        renderEqPanel();
      });
    });

    renderEqPanel();
    const active = tabsEl.querySelector('.eq-tab.active');
    if (active && explorerKey !== 'all') centerTab(active, 'auto');
    updateArrows();
    setTimeout(updateArrows, 300);                     // widths settle once fonts finish loading
  }
  window.addEventListener('resize', updateArrows);
  window.addEventListener('load', updateArrows);
  buildExplorer();


  // The visitor sees the label in their language; the value sent to you is always English
  function renderConfigOptions() {
    if (!equipSelect || !configSelect) return;
    const previous = configSelect.value;
    const options = EQUIPMENT_CONFIGS[equipSelect.value];
    configSelect.innerHTML = '';
    const add = (label, value) => configSelect.appendChild(new Option(label, value || ''));

    if (options && options.length) {
      add(T('Select a configuration'));
      options.forEach(o => add(T(o), o));
      configSelect.disabled = false;
      if (options.indexOf(previous) > -1) configSelect.value = previous;
    } else if (equipSelect.value === 'other') {
      add(T('Describe it in Project Details below'));
      configSelect.disabled = true;
    } else {
      add(T('Select an equipment type above first'));
      configSelect.disabled = true;
    }
  }
  if (equipSelect && configSelect) equipSelect.addEventListener('change', renderConfigOptions);

  const quoteForm = document.getElementById('quoteForm');
  const submitBtn = document.getElementById('quoteSubmitBtn');
  const successBox = document.getElementById('formSuccess');
  const errorBox = document.getElementById('formError');

  if (quoteForm) {
    quoteForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Hide any previous status message before trying again
      if (successBox) successBox.classList.remove('visible');
      if (errorBox) errorBox.classList.remove('visible');

      // Catches the case where YOUR_FORM_ID hasn't been swapped in yet,
      // so it fails clearly instead of silently posting to a fake URL.
      if (quoteForm.action.includes('YOUR_FORM_ID')) {
        if (errorBox) errorBox.classList.add('visible');
        console.warn('Quote form: replace YOUR_FORM_ID in index.html with your real Formspree endpoint.');
        return;
      }

      const formLangEl = document.getElementById('formLang');
      if (formLangEl) formLangEl.value = isAr() ? 'Arabic' : 'English';

      submitBtn.disabled = true;
      submitBtn.textContent = T('Sending…');

      fetch(quoteForm.action, {
        method: 'POST',
        body: new FormData(quoteForm),
        headers: { 'Accept': 'application/json' }
      })
        .then(response => {
          if (response.ok) {
            quoteForm.reset();
            // Re-collapse the dependent "Size / configuration" dropdown
            renderConfigOptions();
            if (successBox) successBox.classList.add('visible');
          } else {
            if (errorBox) errorBox.classList.add('visible');
          }
        })
        .catch(() => {
          if (errorBox) errorBox.classList.add('visible');
        })
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = T('Send Request');
        });
    });
  }

  /* ==========================================================================
     4. EQUIPMENT DETAIL MODAL
     Click a fleet card -> opens a panel with a photo gallery + spec table.

     TO EDIT THE CONTENT: change the text below in EQUIPMENT_DATA.
     TO ADD PHOTOS: drop files into /images named exactly as listed in each
     category's "images" array (e.g. excavators-1.jpg, excavators-2.jpg...).
     Until those files exist, that slot just shows a plain gray box.
     ========================================================================== */

  const EQUIPMENT_DATA = {
    excavators: {
      title: 'Excavators',
      intro: 'From mini excavators for tight sites to long-boom units reaching 24 metres, matched with the right bucket or breaker for the job.',
      images: ['excavators-1.jpg', 'excavators-2.jpg', 'excavators-3.jpg', 'excavators-4.jpg'],
      specs: [
        { name: 'Mini Excavator', detail: 'Compact machine for tight sites, landscaping and small trenching jobs.', attachments: 'Standard bucket' },
        { name: 'Standard Excavator', detail: 'General excavation, trenching and site clearance.', attachments: 'Bucket, or breaker & bucket' },
        { name: 'Long Boom — 20T / 18m', detail: 'Extended reach for deep trenching, canal and drain work.', attachments: 'Bucket' },
        { name: 'Long Boom — 35T / 24m', detail: 'Maximum reach for large-scale earthworks and deep excavation.', attachments: 'Bucket' }
      ]
    },
    jcb: {
      title: 'JCB & Backhoe',
      intro: 'Backhoe loaders for excavation, trenching and demolition, fitted with the attachment your job needs.',
      images: ['jcb-1.jpg', 'jcb-2.jpg', 'jcb-3.jpg', 'jcb-4.jpg'],
      specs: [
        { name: 'JCB (Standard)', detail: 'General-purpose digging and material handling.', attachments: 'Standard bucket' },
        { name: 'JCB with Bucket', detail: 'Trenching and loose-material handling.', attachments: 'Bucket attachment' },
        { name: 'JCB with Breaker', detail: 'Demolition and breaking through concrete or rock.', attachments: 'Hydraulic breaker' }
      ]
    },
    cranes: {
      title: 'Cranes',
      intro: 'Standard, 4x4 and 6x6 cranes for site lifting, plus Hiab truck-mounted units for material delivery and placement.',
      images: ['cranes-1.jpg', 'cranes-2.jpg', 'cranes-3.jpg', 'cranes-4.jpg'],
      specs: [
        { name: 'Crane (Standard)', detail: 'General site lifting on stable, flat ground.', attachments: 'Standard hook & sling' },
        { name: 'Crane 4x4', detail: 'Off-road capable lifting for rougher site conditions.', attachments: 'Standard hook & sling' },
        { name: 'Crane 6x6', detail: 'Heavier-duty chassis for larger loads and longer transport runs.', attachments: 'Standard hook & sling' },
        { name: 'Hiab 10 Ton w/ 3 Ton Crane', detail: 'Delivery truck with a built-in crane for load-and-place jobs.', attachments: '3-tonne mounted crane' }
      ]
    },
    bobcats: {
      title: 'Bobcats & Loaders',
      intro: 'Compact, agile machines for tight sites, landscaping and material movement where a full-size excavator won\'t fit.',
      images: ['bobcats-1.jpg', 'bobcats-2.jpg', 'bobcats-3.jpg', 'bobcats-4.jpg'],
      specs: [
        { name: 'Bobcat', detail: 'Compact-site earthworks, grading and material handling.', attachments: 'Standard bucket' },
        { name: 'Bobcat Brush', detail: 'Clearing vegetation and light debris.', attachments: 'Brush cutter attachment' },
        { name: 'Boom Loader', detail: 'Lifting and placing materials at height or over obstacles.', attachments: 'Boom & forks' }
      ]
    },
    forklifts: {
      title: 'Forklifts',
      intro: 'Material handling for paved yards and rougher site terrain alike.',
      images: ['forklifts-1.jpg', 'forklifts-2.jpg', 'forklifts-3.jpg', 'forklifts-4.jpg'],
      specs: [
        { name: 'Forklift (Standard)', detail: 'Yard and warehouse-style material handling on paved ground.', attachments: 'Standard forks' },
        { name: 'Forklift 4x4', detail: 'Rough-terrain handling on active construction sites.', attachments: 'Standard forks' }
      ]
    },
    earthmoving: {
      title: 'Earthmoving & Compaction',
      intro: 'Grading, compaction and road-prep machines for everything from large sites to tight finishing work.',
      images: ['earthmoving-1.jpg', 'earthmoving-2.jpg', 'earthmoving-3.jpg', 'earthmoving-4.jpg'],
      specs: [
        { name: 'Dozer', detail: 'Bulk earthmoving, grading and pushing large volumes of material.', attachments: 'Standard blade' },
        { name: 'Grader', detail: 'Fine grading for roads and level surfaces.', attachments: 'Standard blade' },
        { name: 'Roller', detail: 'Compaction on roads, sub-base and large graded areas.', attachments: 'Smooth drum' },
        { name: 'Mini Roller', detail: 'Compaction in tighter spaces such as paths and small yards.', attachments: 'Smooth drum' }
      ]
    },
    pickups: {
      title: 'Pickups & Tippers',
      intro: 'Site transport and material haulage to keep your crews and materials moving.',
      images: ['pickups-1.jpg', 'pickups-2.jpg', 'pickups-3.jpg', 'pickups-4.jpg'],
      specs: [
        { name: '3 Ton Pickup', detail: 'General site transport for crew, tools and small loads.', attachments: 'Open flatbed' },
        { name: '3 Ton Tipper', detail: 'Hauling and dumping loose material such as soil or debris.', attachments: 'Hydraulic tipping bed' }
      ]
    }
  };

  const modal = document.getElementById('detailModal');
  const modalBody = document.getElementById('detailModalBody');
  let lastFocusedEl = null;
  let currentModalKey = null;

  function renderEquipmentDetail(key) {
    const data = EQUIPMENT_DATA[key];
    if (!data) return '';
    const title = T(data.title);

    const specRows = data.specs.map(s => `
      <tr>
        <td>${T(s.name)}</td>
        <td data-label="${T('Best for')}">${T(s.detail)}</td>
        <td data-label="${T('Attachments')}">${T(s.attachments)}</td>
      </tr>`).join('');

    const thumbs = data.images.map((img, i) => `
      <button class="detail-thumb${i === 0 ? ' active' : ''}" data-img="${img}" type="button">
        <img src="images/${img}" alt="${title} ${T('photo')} ${i + 1}" loading="lazy">
      </button>`).join('');

    return `
      <div class="detail-gallery">
        <div class="detail-main-image">
          <img id="detailMainImg" src="images/${data.images[0]}" alt="${title}" loading="lazy">
        </div>
        <div class="detail-thumbs">${thumbs}</div>
      </div>
      <div class="detail-info">
        <div class="detail-num">${T('Fleet Category')}</div>
        <h2 id="detailModalTitle">${title}</h2>
        <p class="detail-intro">${T(data.intro)}</p>
        <table class="detail-specs">
          <thead>
            <tr><th>${T('Configuration')}</th><th>${T('Best for')}</th><th>${T('Attachments')}</th></tr>
          </thead>
          <tbody>${specRows}</tbody>
        </table>
        <a href="#quote" class="btn-primary" data-close>${T('Request this equipment')}</a>
      </div>
    `;
  }

  // If the language is switched while a popup is open, redraw it in the new language
  function refreshModal() {
    if (!modal || !modal.classList.contains('open') || !currentModalKey) return;
    modalBody.innerHTML = renderEquipmentDetail(currentModalKey);
    modalBody.querySelectorAll('.detail-main-image, .detail-thumb').forEach(setBackdrop);
  }

  function openDetailModal(key, triggerEl) {
    if (!EQUIPMENT_DATA[key]) return;
    lastFocusedEl = triggerEl || document.activeElement;
    currentModalKey = key;
    modalBody.innerHTML = renderEquipmentDetail(key);
    modalBody.querySelectorAll('.detail-main-image, .detail-thumb').forEach(setBackdrop);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    modalBody.scrollTop = 0;   // always open at the top (must happen once the popup is visible)
    const closeBtn = modal.querySelector('.detail-modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeDetailModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  // Wire up every fleet card that has a data-equipment attribute
  document.querySelectorAll('.fleet-card[data-equipment]').forEach(card => {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');

    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return; // let "Check availability" links work normally
      openDetailModal(card.dataset.equipment, card);
    });
    
    card.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('a')) {
        e.preventDefault();
        openDetailModal(card.dataset.equipment, card);
      }
    });
  });

  // Close the modal via overlay click, close button, or the CTA link
  modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeDetailModal();
  });

  // Swap the main image when a thumbnail is clicked
  modalBody.addEventListener('click', (e) => {
    const thumb = e.target.closest('.detail-thumb');
    if (!thumb) return;
    modalBody.querySelectorAll('.detail-thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
    const mainImg = document.getElementById('detailMainImg');
    if (mainImg) {
      mainImg.src = 'images/' + thumb.dataset.img;
      setBackdrop(mainImg.parentElement);
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeDetailModal();
  });

  /* ---------- Language button ---------- */
  const langToggleBtn = document.getElementById('langToggle');
  if (langToggleBtn) langToggleBtn.addEventListener('click', () => applyLanguage(isAr() ? 'en' : 'ar', true));
  applyLanguage(lang, false, true);   // show the saved language (English by default)

});