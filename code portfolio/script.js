const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzKLN-AkoQT2ONmP3-lhGD_klJz7JpWieuMsVjpFBcfcCSnLsppanaZ7n5LhI7nJaufHg/exec?count=1";
const $ = s => document.querySelector(s);
    $('#tk').innerHTML = '<span>RSVPS MADE SIMPLE &nbsp;|&nbsp; SAVE THE DATES MADE SIMPLE &nbsp;|&nbsp; </span>'.repeat(16);

const burger = $('#burger'), menu = $('#menu');
    burger.onclick = () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); };
    menu.onclick = () => menu.classList.remove('open');

document.querySelectorAll('.arrows button').forEach(b => b.onclick = () => $('#car').scrollBy({left: b.dataset.d * 290, behavior: 'smooth'}));

    document.querySelectorAll('.chips button').forEach(b => b.onclick = () => {
    document.querySelectorAll('.chips button').forEach(x => x.setAttribute('aria-pressed', x === b));
    document.querySelectorAll('.tpl .card').forEach(c => c.hidden = b.dataset.f !== 'all' && c.dataset.c !== b.dataset.f);
    });

let sending = false;
$('#rsvp').addEventListener('submit', async e => {
  e.preventDefault();
    if (sending) return;
        const f = e.target, msg = $('#msg'), d = Object.fromEntries(new FormData(f));
    if (d.website) return; // honeypot
    if (!d.name.trim() || !/^\S+@\S+\.\S+$/.test(d.email)) { msg.textContent = 'Add your name and a valid email.'; return; }
        sending = true; $('#send').textContent = 'Sending…';
    try {
        if (APPS_SCRIPT_URL) // text/plain avoids a CORS preflight on Apps Script
        await fetch(APPS_SCRIPT_URL, {method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'text/plain'}, body: JSON.stringify(d)});
        else await new Promise(r => setTimeout(r, 700));
    const row = document.createElement('div'); row.className = 'new';
    [d.name, d.attending, d.dietary || '-', d.guests].forEach(v => { const s = document.createElement('span'); s.textContent = v; row.append(s); });
    $('#rows').before(row);
    msg.textContent = APPS_SCRIPT_URL ? 'Sent! Check your Google Sheet.' : 'Demo mode: added to the sample sheet. Add your Apps Script URL to send real replies.';
    f.reset();
  } catch (err) { msg.textContent = 'That did not send. Check your connection and try again.'; }
  sending = false; $('#send').textContent = 'Send RSVP';
});

/* active nav link */
const links = [...document.querySelectorAll('#menu a')];
let lockUntil = 0;
function setActive(id) {
  links.forEach(a => {
    const on = a.getAttribute('href') === '#' + id;
    a.classList.toggle('active', on);
    on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
  });
}

links.forEach(a => a.addEventListener('click', () => { setActive(a.getAttribute('href').slice(1)); lockUntil = Date.now() + 900; }));
const spy = new IntersectionObserver(es => {
  if (Date.now() < lockUntil) return;
  es.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }); // ids with no nav link (hero, demo) clear the highlight
}, {rootMargin: '-40% 0px -55% 0px'});
['top', 'about', 'how', 'stack', 'demo', 'templates', 'pricing', 'faq', 'book'].forEach(id => { const s = document.getElementById(id); if (s) spy.observe(s); });

/* back to top */
const totop = $('#totop');
addEventListener('scroll', () => totop.classList.toggle('show', scrollY > 500), {passive: true});
totop.onclick = () => scrollTo({top: 0, behavior: 'smooth'});

/* background music */
// Leave "" for the built-in melody, or use a real audio file next to your site, e.g. "assets/music.mp3"
const MUSIC_FILE = "";
const mbtn = $('#music');
let muted = false, audio, ctx, master, timer, nextT = 0, step = 0;
try { muted = localStorage.getItem('rsvp-muted') === '1'; } catch (e) {}
const CH = [[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]]; // C, Am, F, G
const PAT = [0, 1, 2, 1, 2, 1, 0, 1];
const playing = () => MUSIC_FILE ? !!audio && !audio.paused : !!ctx && ctx.state === 'running';
function paint() { mbtn.classList.toggle('off', !playing()); mbtn.setAttribute('aria-pressed', playing()); }
function tone(f, t, d, type, v) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .05);
}

function schedule() {
  while (nextT < ctx.currentTime + .4) {
    const ch = CH[Math.floor(step / 8) % 4], i = step % 8;
    tone(ch[PAT[i]] * (i === 4 ? 2 : 1), nextT, .6, 'triangle', .07);
    if (i === 0) tone(ch[0] / 2, nextT, 2.3, 'sine', .1);
    nextT += .3; step++;
  }
}

async function startMusic() {
  if (MUSIC_FILE) {
    if (!audio) { audio = new Audio(MUSIC_FILE); audio.loop = true; audio.volume = .35; audio.onplay = audio.onpause = paint; }
    try { await audio.play(); } catch (e) {}
  } else {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = .5; master.connect(ctx.destination);
      ctx.onstatechange = paint; nextT = ctx.currentTime + .1;
      timer = setInterval(schedule, 100);
    }
    ctx.resume();
  }
  paint();
}

function stopMusic() { MUSIC_FILE ? audio && audio.pause() : ctx && ctx.suspend(); }
mbtn.onclick = () => {
  if (playing()) { stopMusic(); muted = true; } else { startMusic(); muted = false; }
  try { localStorage.setItem('rsvp-muted', muted ? '1' : '0'); } catch (e) {}
};


if (!muted) startMusic();
const gestures = ['pointerdown', 'keydown', 'touchend'];
function unlock(e) {
  if (mbtn.contains(e.target)) return;
  gestures.forEach(n => removeEventListener(n, unlock));
  if (!muted && !playing()) startMusic();
}
gestures.forEach(n => addEventListener(n, unlock, {passive: true}));
paint();

/* TWO-STEP MODAL JS
   In script.js, delete the whole add-on block at the bottom, from the comment
   "ADD-ON JS: paste at the very end of script.js..." down to the final "})();",
   and paste this file in its place. Everything above it stays as it is.
   It reuses APPS_SCRIPT_URL from the top of script.js. */
(() => {
  // Footer marquee text
  const ftk = document.getElementById('ftk');
  if (ftk) ftk.innerHTML = `<span>LET'S PLAN YOUR EVENT &nbsp;|&nbsp; ONE LINK &nbsp;|&nbsp; LIVE RSVPS &nbsp;|&nbsp; MADE WITH LOVE &nbsp;|&nbsp; </span>`.repeat(14);

  /* =====================================================================
     THEMES: EDIT ME
     T(folder-name, number, title, structure description, creditName, creditUrl, license)
     Pictures are expected at assets/themes/<folder-name>-<number>-a.jpg, -b.jpg, -c.jpg
     (a = main picture, b and c = the two small ones).
     Only use designs you have permission for, or whose license allows it, and
     fill in the real owner, link and license. These are placeholders.
     The event-type names below must match the options in the "Type of event" menu.
     ===================================================================== */
  const T = (slug, n, title, description, creditName = 'Owner name', creditUrl = '', license = 'Add license or permission') => ({
    title, description,
    images: ['a', 'b', 'c'].map(x => `assets/themes/${slug}-${n}-${x}.jpg`),
    creditName, creditUrl, license
  });
  const THEMES = {
    'Wedding': [
      T('wedding', 1, 'Garden Vows', 'Single scroll, big hero photo, story and schedule timeline'),
      T('wedding', 2, 'Modern Minimal', 'Clean sections, countdown up top, gallery and map at the end'),
      T('wedding', 3, 'Romantic Scrapbook', 'Layered photos, handwritten accents, RSVP at the bottom')
    ],
    'Birthday': [
      T('birthday', 1, 'Confetti Party', 'Bold hero, countdown, party details and RSVP'),
      T('birthday', 2, 'Photo Memories', 'Photo gallery first, short details, RSVP button'),
      T('birthday', 3, 'Simple Celebration', 'One clean page: date, place, map and RSVP')
    ],
    'Debut / 18th': [
      T('debut', 1, 'Royal Ball', 'Elegant hero, program timeline, entourage section'),
      T('debut', 2, 'Soft Glam', 'Large portrait, story section, gallery and RSVP'),
      T('debut', 3, 'Modern Night', 'Dark theme, countdown, details and map')
    ],
    'Baby shower / Christening': [
      T('baby', 1, 'Little Blessing', 'Soft colors, big photo, event details and RSVP'),
      T('baby', 2, 'Sweet Beginnings', 'Story, gallery, registry links and map'),
      T('baby', 3, 'Clean and Calm', 'Minimal page with schedule and RSVP')
    ],
    'Corporate event': [
      T('corporate', 1, 'Clean Agenda', 'Hero banner, agenda timeline, speakers and RSVP'),
      T('corporate', 2, 'Team Day', 'Photo-led layout, activities list and map'),
      T('corporate', 3, 'Gala Night', 'Dark elegant look, program and dress code')
    ],
    'Save the date only': [
      T('save', 1, 'One-Page Showcase', 'Big date, countdown and one photo'),
      T('save', 2, 'Photo Strip', 'Gallery-first layout with date and map link'),
      T('save', 3, 'Bold Type', 'Large typography, countdown and a short message')
    ],
    'Other': [
      T('other', 1, 'Simple Page', 'One scroll with date, place and RSVP'),
      T('other', 2, 'Photo First', 'Big photos with details underneath'),
      T('other', 3, 'Timeline', 'Schedule-focused layout with map')
    ]
  };

  /* What guests can tick, by package. Edit the wording freely. */
  const FEATURES = {
    'Save the Date': ['One-page event showcase site', 'Countdown to your day', 'Live countdown timer display', 'High-resolution photo gallery', 'Tap-to-navigate Google Maps link'],
    'Full Invitation': ['Complete interactive web invitation', 'Custom guest survey questions', 'Live RSVP Google Sheets sync', 'One-tap add to calendar button'],
    'Premium': ['Everything included in Full Invitation', 'Dark & Light Mode Toggle', 'Background music and song requests', 'Automated RSVP email confirmation']
  };
  const SURVEY_ITEMS = ['Custom guest survey questions', 'Everything included in Full Invitation'];

  /* Booking window and upload limits: edit freely */
  const MIN_YEAR = 2026, MAX_YEAR = 2027;       // only dates in these years can be booked
  const MAX_FILES = 3, MAX_PDF_MB = 2.5, MAX_IMG_MB = 15;

  /* ===================== modal logic ===================== */
  const dlg = document.getElementById('inquiry');
  if (!dlg) return;
  const form = document.getElementById('inqform');
  const el = form.elements;
  const q = s => form.querySelector(s);
  const steps = [...form.querySelectorAll('.step')];
  const done = dlg.querySelector('.done');
  const send = q('.isend');
  const url = typeof APPS_SCRIPT_URL !== 'undefined' ? APPS_SCRIPT_URL : '';
  const TITLES = ['About your event', 'Pick your look'];
  let step = 1, busy = false, renderedType = '', renderedPkg = '';

  /* ----- dates ----- */
  const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const daysUntil = v => { const [y, m, d] = v.split('-').map(Number); return Math.round((new Date(y, m - 1, d) - today()) / 864e5); };
  const dateOk = v => { if (!v) return false; const y = Number(v.slice(0, 4)); return daysUntil(v) >= 0 && y >= MIN_YEAR && y <= MAX_YEAR; };
  function checkDate() {
    const v = el.eventDate.value, n = v ? daysUntil(v) : -1;
    q('.dnote').hidden = !(n >= 0 && n < 7);          // friendly note only, never blocks
  }

  /* ----- styled calendar (replaces the browser's own date picker) ----- */
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const calBox = q('.cal'), calGrid = q('.cal-grid');
  let minD = today(), maxD = new Date(MAX_YEAR, 11, 31), view = new Date(minD.getFullYear(), minD.getMonth(), 1);
  const fromIso = v => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); };
  const pretty = d => d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'});
  const readCal = () => { q('.cal-read').textContent = el.eventDate.value ? pretty(fromIso(el.eventDate.value)) : 'No date picked yet'; };

  function renderCal() {
    const y = view.getFullYear(), m = view.getMonth();
    q('.cal-title').textContent = `${MONTHS[m]} ${y}`;
    q('.cal-prev').disabled = view <= new Date(minD.getFullYear(), minD.getMonth(), 1);
    q('.cal-next').disabled = view >= new Date(maxD.getFullYear(), maxD.getMonth(), 1);
    calGrid.replaceChildren();
    for (let i = new Date(y, m, 1).getDay(); i > 0; i--) calGrid.append(document.createElement('span'));
    const total = new Date(y, m + 1, 0).getDate(), todayIso = iso(today());
    for (let d = 1; d <= total; d++) {
      const dt = new Date(y, m, d), v = iso(dt);
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = d; b.dataset.date = v; b.tabIndex = -1;
      b.setAttribute('aria-label', pretty(dt));
      b.setAttribute('aria-pressed', String(v === el.eventDate.value));
      if (dt < minD || dt > maxD) b.disabled = true;
      if (v === todayIso) b.classList.add('today');
      if (v === el.eventDate.value) b.classList.add('sel');
      calGrid.append(b);
    }
    const stop = calGrid.querySelector('.sel') || calGrid.querySelector('button:not(:disabled)');
    if (stop) stop.tabIndex = 0;                       // one tab stop; arrow keys move between days
  }
  function calFocus() { const t = calGrid.querySelector('.sel') || calGrid.querySelector('button:not(:disabled)'); if (t) t.focus(); }
  function pickDate(v) {
    el.eventDate.value = v;
    calBox.classList.remove('bad');
    readCal(); checkDate(); renderCal();
    const s = calGrid.querySelector('.sel'); if (s) s.focus();
  }
  q('.cal-prev').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCal(); });
  q('.cal-next').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCal(); });
  calGrid.addEventListener('click', e => { const b = e.target.closest('button[data-date]'); if (b && !b.disabled) pickDate(b.dataset.date); });
  calGrid.addEventListener('keydown', e => {
    const b = e.target.closest('button[data-date]');
    const move = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7}[e.key];
    if (!b || !move) return;
    e.preventDefault();
    const t = fromIso(b.dataset.date); t.setDate(t.getDate() + move);
    if (t < minD || t > maxD) return;
    if (t.getMonth() !== view.getMonth() || t.getFullYear() !== view.getFullYear()) { view = new Date(t.getFullYear(), t.getMonth(), 1); renderCal(); }
    const nb = calGrid.querySelector(`[data-date="${iso(t)}"]`); if (nb) nb.focus();
  });

  /* ----- platform label ----- */
  function updatePlatform() {
    const ig = el.platform.value === 'Instagram';
    q('.lbl').textContent = ig ? 'Instagram username' : 'Facebook name or profile link';
    el.handle.placeholder = ig ? '@yourname' : 'facebook.com/yourname';
  }
  form.querySelectorAll('[name=platform]').forEach(r => r.addEventListener('change', updatePlatform));

  /* ----- steps ----- */
  function goStep(n) {
    step = n;
    steps.forEach((s, i) => { s.hidden = i !== n - 1; });
    q('.sn').textContent = n;
    q('.stname').textContent = TITLES[n - 1];
    q('.pbar i').style.width = (n * 50) + '%';
    form.querySelectorAll('.imsg').forEach(m => { m.textContent = ''; });
    dlg.scrollTop = 0;
    const first = n === 1 ? el.name : steps[1].querySelector('input');
    if (first) first.focus();
  }

  function validate1() {
    const checks = [
      [el.name, !!el.name.value.trim(), 'Please add your name.'],
      [el.email, /^\S+@\S+\.\S+$/.test(el.email.value.trim()), 'Please add a valid email.'],
      [el.handle, !!el.handle.value.trim(), 'Add your Instagram or Facebook so I can message you.'],
      [el.eventDate, dateOk(el.eventDate.value), `Pick a date from today to December 31, ${MAX_YEAR}.`]
    ];
    checks.forEach(([f, ok]) => f.setAttribute('aria-invalid', String(!ok)));
    calBox.classList.toggle('bad', !checks[3][1]);
    const bad = checks.find(c => !c[1]);
    if (bad) {
      steps[0].querySelector('.imsg').textContent = bad[2];
      if (bad[0] === el.eventDate) calFocus(); else bad[0].focus();
      return false;
    }
    return true;
  }

  /* ----- render step 2 content ----- */
  function renderThemes() {
    const type = el.eventType.value;
    const list = THEMES[type] || THEMES['Other'];
    q('.evname').textContent = type.toLowerCase();
    const grid = q('.tgrid');
    grid.replaceChildren();
    list.forEach((t, i) => {
      const id = `theme-${i}`;
      const card = document.createElement('div'); card.className = 'tcard';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'theme'; input.value = t.title; input.id = id;
      const label = document.createElement('label'); label.className = 'tpick'; label.htmlFor = id;

      const imgs = document.createElement('div'); imgs.className = 'timgs';
      t.images.forEach((src, k) => {
        const im = new Image();
        im.loading = 'lazy'; im.decoding = 'async'; im.src = src; im.alt = `${t.title} preview ${k + 1}`;
        // a missing picture never blocks the form: swap it for a blue tile
        im.addEventListener('error', () => { const ph = document.createElement('span'); ph.className = 'tph'; im.replaceWith(ph); });
        imgs.append(im);
      });
      const title = document.createElement('b'); title.textContent = t.title;
      const desc = document.createElement('span'); desc.className = 'd'; desc.textContent = t.description;
      label.append(imgs, title, desc);

      const credit = document.createElement('p'); credit.className = 'credit';
      credit.append('Design by ');
      if (/^https?:\/\//i.test(t.creditUrl)) {
        const a = document.createElement('a');
        a.href = t.creditUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = t.creditName;
        credit.append(a);
      } else credit.append(t.creditName);
      credit.append(` · ${t.license}`);

      card.append(input, label, credit);
      grid.append(card);
    });
  }

  function syncSurvey() {
    const on = [...form.querySelectorAll('[name=features]')].some(i => i.checked && SURVEY_ITEMS.includes(i.value));
    q('.survey').hidden = !on;
  }

  function syncOther() {
    q('.other').hidden = ![...form.querySelectorAll('[name=features]')].some(i => i.checked && i.value === 'Other');
  }

  function renderFeatures() {
    const pkg = el.package.value, known = !!FEATURES[pkg];
    q('.pkgname').textContent = known ? `(${pkg})` : '(Full Invitation options shown)';
    const box = q('.flist');
    box.replaceChildren();
    FEATURES[known ? pkg : 'Full Invitation'].forEach(f => {
      const l = document.createElement('label'); l.className = 'chk';
      const i = document.createElement('input');
      i.type = 'checkbox'; i.name = 'features'; i.value = f; i.checked = true;   // all ticked by default
      const s = document.createElement('span'); s.textContent = f;
      l.append(i, s);
      box.append(l);
    });
    // "Other" is not ticked by default; ticking it reveals "Anything else you'd like on your site?"
    const lo = document.createElement('label'); lo.className = 'chk';
    const io = document.createElement('input'); io.type = 'checkbox'; io.name = 'features'; io.value = 'Other';
    const so = document.createElement('span'); so.textContent = 'Other';
    lo.append(io, so); box.append(lo);
    syncSurvey(); syncOther();
  }

  form.addEventListener('change', e => {
    if (e.target.name === 'features') { syncSurvey(); syncOther(); }
    if (e.target.name === 'theme') q('.inspo').hidden = e.target.value !== 'Own inspiration';
  });

  /* ----- inspiration files (PNG, JPG, PDF) ----- */
  let files = [];
  const isPdf = f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
  const isImg = f => /^image\/(png|jpeg)$/.test(f.type) || /\.(png|jpe?g)$/i.test(f.name);
  const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const fmsg = t => { steps[1].querySelector('.imsg').textContent = t; };

  function renderFiles() {
    const ul = q('.ffiles');
    ul.replaceChildren();
    files.forEach((f, i) => {
      const li = document.createElement('li');
      const s = document.createElement('span'); s.textContent = `${f.name} (${kb(f.size)})`;
      const b = document.createElement('button'); b.type = 'button'; b.dataset.rm = i; b.textContent = 'Remove';
      b.setAttribute('aria-label', `Remove ${f.name}`);
      li.append(s, b); ul.append(li);
    });
  }
  q('.inspofile').addEventListener('change', e => {
    fmsg('');
    [...e.target.files].forEach(f => {
      if (files.length >= MAX_FILES) return fmsg(`You can add up to ${MAX_FILES} files.`);
      if (!isPdf(f) && !isImg(f)) return fmsg('Only PNG, JPG or PDF files, please.');
      if (isPdf(f) && f.size > MAX_PDF_MB * 1048576) return fmsg(`That PDF is too big (max ${MAX_PDF_MB} MB). Try a screenshot instead.`);
      if (isImg(f) && f.size > MAX_IMG_MB * 1048576) return fmsg(`That picture is too big (max ${MAX_IMG_MB} MB).`);
      files.push(f);
    });
    e.target.value = '';
    renderFiles();
  });
  q('.ffiles').addEventListener('click', e => {
    const b = e.target.closest('[data-rm]');
    if (b) { files.splice(Number(b.dataset.rm), 1); renderFiles(); }
  });

  const readB64 = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(f); });
  // pictures are shrunk to max 1600px and saved as JPG so the upload stays small
  const imgB64 = f => new Promise((ok, no) => {
    const u = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1600 / Math.max(im.width, im.height));
      const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', .85).split(',')[1]);
    };
    im.onerror = () => { URL.revokeObjectURL(u); no(new Error('badfile')); };
    im.src = u;
  });
  const packFiles = () => Promise.all(files.map(async f => isPdf(f)
    ? {name: f.name, type: 'application/pdf', data: await readB64(f)}
    : {name: f.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', data: await imgB64(f)}));

  function next() {
    if (!validate1()) return;
    if (renderedType !== el.eventType.value) { renderThemes(); renderedType = el.eventType.value; }
    if (renderedPkg !== el.package.value) { renderFeatures(); renderedPkg = el.package.value; }
    goStep(2);
  }

  form.addEventListener('click', e => {
    if (e.target.closest('[data-next]')) next();
    else if (e.target.closest('[data-back]')) goStep(1);
  });

  /* ----- open / close ----- */
  function openModal(trigger) {
    form.hidden = false; done.hidden = true;
    const card = trigger && trigger.closest('.price .card');   // package preselected from the pricing buttons
    const pkg = card ? card.querySelector('h3').textContent.trim() : '';
    el.package.value = [...el.package.options].some(o => o.value === pkg) ? pkg : 'Not sure yet';
    minD = new Date(Math.max(today(), new Date(MIN_YEAR, 0, 1)));   // no past dates
    maxD = new Date(MAX_YEAR, 11, 31);                               // nothing too far ahead
    const v = el.eventDate.value;
    view = v ? new Date(Number(v.slice(0, 4)), Number(v.slice(5, 7)) - 1, 1) : new Date(minD.getFullYear(), minD.getMonth(), 1);
    renderCal(); readCal();
    dlg.showModal();
    goStep(1);
  }

  // Any "Book your site" link (href="#book") or [data-open-inquiry] opens the modal
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-open-inquiry], a[href="#book"]');
    if (!t) return;
    e.preventDefault();
    openModal(t);
  });
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });

  /* ----- one single submit, at the very end ----- */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (step === 1) { next(); return; }                         // Enter key on step 1 = Next
    if (busy) return;
    if (el.website.value) return;                               // honeypot
    const msg = steps[1].querySelector('.imsg');
    const val = n => el[n].value.trim();

    const type = el.eventType.value;
    const pick = form.querySelector('[name=theme]:checked');
    const chosen = pick ? pick.value : '';
    const t = (THEMES[type] || THEMES['Other']).find(x => x.title === chosen);
    const d = {
      type: 'inquiry',
      name: val('name'), email: val('email'),
      platform: el.platform.value, handle: val('handle'),
      eventType: type, package: el.package.value, eventDate: el.eventDate.value,
      theme: chosen || 'Not chosen',
      themeCredit: t ? `${t.creditName}${t.creditUrl ? ' (' + t.creditUrl + ')' : ''} · ${t.license}` : '',
      features: [...form.querySelectorAll('[name=features]:checked')].map(i => i.value).join(', '),
      survey: q('.survey').hidden ? '' : val('survey'),
      inspoLink: chosen === 'Own inspiration' ? val('inspoLink') : '',
      notes: val('notes'), extras: q('.other').hidden ? '' : val('extras')
    };

    const withFiles = chosen === 'Own inspiration' && files.length > 0;
    busy = true; send.disabled = true; send.textContent = withFiles ? 'Uploading…' : 'Sending…'; msg.textContent = '';
    try {
      d.inspoFiles = withFiles ? await packFiles() : [];
      if (JSON.stringify(d).length > 9e6) throw new Error('toobig');
      if (url) await fetch(url, {method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'text/plain'}, body: JSON.stringify(d)});
      else await new Promise(r => setTimeout(r, 700));
      done.querySelector('.who').textContent = d.name.split(' ')[0];
      done.querySelector('.where').textContent = `${d.platform} (${d.handle})`;
      done.querySelector('.demo').hidden = !!url;
      form.reset();
      el.eventDate.value = '';                       // hidden inputs are not cleared by reset()
      files = []; renderFiles();
      renderedType = ''; renderedPkg = '';
      q('.inspo').hidden = true; q('.dnote').hidden = true;
      updatePlatform();
      goStep(1);
      form.hidden = true; done.hidden = false;
      done.querySelector('h2').focus();
    } catch (err) {
      msg.textContent = err.message === 'toobig' ? 'Those files are too big together. Try fewer or smaller files.'
        : err.message === 'badfile' ? 'One of the pictures could not be read. Try a different file.'
        : 'That did not send. Check your connection and try again.';
    }
    busy = false; send.disabled = false; send.textContent = 'Send my details';
  });

  /* INSPIRATION COLLECTION MODAL
   Paste at the very end of script.js. It needs no HTML changes: it makes every card in the
   "Inspiration for every kind of event" section clickable and builds its own pop-up window.

   HOW TO EDIT: every card title below must match the card's heading in index.html.
   P(folder-name, number, short phrase, owner name, Pinterest pin link)
   - Put the pictures in assets/inspo/, named like garden-1.jpg, garden-2.jpg, garden-3.jpg
   - Use the REAL owner name and the REAL pin link (https://www.pinterest.com/pin/...).
   - Only use pictures you saved from Pinterest as inspiration with credit. For the safest
     option, use Pinterest's own "Embed" feature or ask the owner for permission. */
(() => {
  const P = (slug, n, caption, creditName = 'Owner name', pinUrl = '') =>
    ({ src: `assets/inspo/${slug}-${n}.jpg`, caption, creditName, pinUrl });
  const C = (blurb, pics) => ({ blurb, pics });

  const COLLECTIONS = {
    'Garden vows': C('Soft greens, big photos and one calm scroll.', [
      P('garden', 1, 'A big photo opens the page'),
      P('garden', 2, 'A simple timeline of the day'),
      P('garden', 3, 'Map and RSVP at the end')]),
    'Save the date, simple': C('Just the date, a countdown and one lovely photo.', [
      P('save', 1, 'Big date, nothing else'),
      P('save', 2, 'A countdown that ticks live'),
      P('save', 3, 'One photo, one map link')]),
    'Confetti 30th': C('Bright, playful and made for a party.', [
      P('confetti', 1, 'Bold colors from the first scroll'),
      P('confetti', 2, 'Party details in one glance'),
      P('confetti', 3, 'RSVP buttons that pop')]),
    "Kid's party": C('Cheerful pages that parents can read in seconds.', [
      P('kids', 1, 'Big friendly headline'),
      P('kids', 2, 'Date, time and place up front'),
      P('kids', 3, 'Easy RSVP for busy parents')]),
    'Little one on the way': C('Gentle colors for baby showers and christenings.', [
      P('baby', 1, 'Soft palette, calm feeling'),
      P('baby', 2, 'Story and photos together'),
      P('baby', 3, 'Gift ideas and directions')]),
    'Team offsite': C('Clear agendas for company days and gatherings.', [
      P('team', 1, 'Agenda front and center'),
      P('team', 2, 'Activities laid out simply'),
      P('team', 3, 'Directions and RSVP')])
  };
  const FALLBACK = C('A few ideas to get you started.', [
    P('ideas', 1, 'Clean, simple layout'), P('ideas', 2, 'Details at a glance'), P('ideas', 3, 'Easy RSVP')]);

  /* ---------- build the pop-up window once ---------- */
  const dlg = document.createElement('dialog');
  dlg.id = 'inspo';
  dlg.setAttribute('aria-labelledby', 'inspo-title');
  dlg.innerHTML = `
    <div class="mbox">
      <button class="mclose" type="button" data-close aria-label="Close">×</button>
      <h2 id="inspo-title"></h2>
      <p class="ilead"></p>
      <p class="pinnote"><span class="pinb">Pinterest</span><span>These pictures are from Pinterest. All credit goes to their owners.</span></p>
      <div class="igrid"></div>
      <p class="ifoot">Shown as inspiration only. Tap a name under a picture to visit the original pin.</p>
      <button class="btn" type="button" data-open-inquiry>Plan something like this</button>
    </div>`;
  document.body.append(dlg);
  const grid = dlg.querySelector('.igrid');

  // only real Pinterest links become clickable
  const isPin = u => /^https:\/\/([a-z0-9-]+\.)?(pinterest\.[a-z.]+|pin\.it)\//i.test(u);

  function openCollection(title) {
    const col = COLLECTIONS[title] || FALLBACK;
    dlg.querySelector('#inspo-title').textContent = title;
    dlg.querySelector('.ilead').textContent = col.blurb;
    grid.replaceChildren();
    col.pics.forEach((p, i) => {
      const fig = document.createElement('figure');

      const img = new Image();
      img.className = 'ipic'; img.loading = 'lazy'; img.decoding = 'async';
      img.src = p.src; img.alt = `${title} idea ${i + 1}: ${p.caption}`;
      img.addEventListener('error', () => {           // a missing picture never breaks the window
        const tile = document.createElement('span');
        tile.className = 'ipic tph'; tile.textContent = 'Picture coming soon';
        img.replaceWith(tile);
      });

      const cap = document.createElement('figcaption');
      const phrase = document.createElement('b'); phrase.textContent = p.caption;
      cap.append(phrase);

      const credit = document.createElement('p'); credit.className = 'icredit';
      const badge = document.createElement('span'); badge.className = 'pinb'; badge.textContent = 'Pinterest';
      credit.append(badge, 'Credit: ');
      if (isPin(p.pinUrl)) {
        const a = document.createElement('a');
        a.href = p.pinUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = p.creditName;
        credit.append(a);
      } else credit.append(p.creditName);

      fig.append(img, cap, credit);
      grid.append(fig);
    });
    dlg.scrollTop = 0;
    dlg.showModal();
  }

  // close on X, backdrop click, or when "Plan something like this" opens the booking window
  dlg.addEventListener('click', e => {
    if (e.target === dlg || e.target.closest('[data-close], [data-open-inquiry]')) dlg.close();
  });

  /* ---------- make every card clickable ---------- */
  document.querySelectorAll('.tpl .card').forEach(card => {
    const title = card.querySelector('h3').textContent.trim();
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-label', `See the ${title} inspiration collection`);
    const more = document.createElement('span');
    more.className = 'btn more'; more.setAttribute('aria-hidden', 'true'); more.textContent = 'See collection';
    card.querySelector('.t').append(more);
    card.addEventListener('click', () => openCollection(title));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCollection(title); }
    });
  });
})();
})();