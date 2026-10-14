const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzKLN-AkoQT2ONmP3-lhGD_klJz7JpWieuMsVjpFBcfcCSnLsppanaZ7n5LhI7nJaufHg/exec?count=1";
const $ = (s) => document.querySelector(s);
$("#tk").innerHTML =
  "<span>RSVPS MADE SIMPLE &nbsp;|&nbsp; SAVE THE DATES MADE SIMPLE &nbsp;|&nbsp; </span>".repeat(
    16,
  );

const burger = $("#burger"),
  menu = $("#menu");
burger.onclick = () => {
  const o = menu.classList.toggle("open");
  burger.setAttribute("aria-expanded", o);
};
menu.onclick = () => menu.classList.remove("open");

document
  .querySelectorAll(".arrows button")
  .forEach(
    (b) =>
      (b.onclick = () =>
        $("#car").scrollBy({ left: b.dataset.d * 290, behavior: "smooth" })),
  );

document.querySelectorAll(".chips button").forEach(
  (b) =>
    (b.onclick = () => {
      document
        .querySelectorAll(".chips button")
        .forEach((x) => x.setAttribute("aria-pressed", x === b));
      document
        .querySelectorAll(".tpl .card")
        .forEach(
          (c) =>
            (c.hidden = b.dataset.f !== "all" && c.dataset.c !== b.dataset.f),
        );
    }),
);

let sending = false;
$("#rsvp").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (sending) return;
  const f = e.target,
    msg = $("#msg"),
    d = Object.fromEntries(new FormData(f));
  if (d.website) return; // honeypot
  if (!d.name.trim() || !/^\S+@\S+\.\S+$/.test(d.email)) {
    msg.textContent = "Add your name and a valid email.";
    return;
  }
  sending = true;
  $("#send").textContent = "Sending…";
  try {
    if (APPS_SCRIPT_URL)
      // text/plain avoids a CORS preflight on Apps Script
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(d),
      });
    else await new Promise((r) => setTimeout(r, 700));
    const row = document.createElement("div");
    row.className = "new";
    [d.name, d.attending, d.dietary || "-", d.guests].forEach((v) => {
      const s = document.createElement("span");
      s.textContent = v;
      row.append(s);
    });
    $("#rows").before(row);
    msg.textContent = APPS_SCRIPT_URL
      ? "Sent! Check your Google Sheet."
      : "Demo mode: added to the sample sheet. Add your Apps Script URL to send real replies.";
    f.reset();
  } catch (err) {
    msg.textContent = "That did not send. Check your connection and try again.";
  }
  sending = false;
  $("#send").textContent = "Send RSVP";
});

// active nav link
const links = [...document.querySelectorAll("#menu a")];
let lockUntil = 0;
function setActive(id) {
  links.forEach((a) => {
    const on = a.getAttribute("href") === "#" + id;
    a.classList.toggle("active", on);
    on
      ? a.setAttribute("aria-current", "true")
      : a.removeAttribute("aria-current");
  });
}

links.forEach((a) =>
  a.addEventListener("click", () => {
    setActive(a.getAttribute("href").slice(1));
    lockUntil = Date.now() + 900;
  }),
);
const spy = new IntersectionObserver(
  (es) => {
    if (Date.now() < lockUntil) return;
    es.forEach((e) => {
      if (e.isIntersecting) setActive(e.target.id);
    }); // ids with no nav link (hero, demo) clear the highlight
  },
  { rootMargin: "-40% 0px -55% 0px" },
);
[
  "top",
  "about",
  "how",
  "stack",
  "demo",
  "templates",
  "pricing",
  "faq",
  "book",
].forEach((id) => {
  const s = document.getElementById(id);
  if (s) spy.observe(s);
});

/* back to top */
const totop = $("#totop");
addEventListener(
  "scroll",
  () => totop.classList.toggle("show", scrollY > 500),
  { passive: true },
);
totop.onclick = () => scrollTo({ top: 0, behavior: "smooth" });

// background music 
const MUSIC_FILE = "";
const mbtn = $("#music");
let muted = false,
  audio,
  ctx,
  master,
  timer,
  nextT = 0,
  step = 0;
try {
  muted = localStorage.getItem("rsvp-muted") === "1";
} catch (e) {}
const CH = [
  [261.63, 329.63, 392],
  [220, 261.63, 329.63],
  [174.61, 220, 261.63],
  [196, 246.94, 293.66],
]; // C, Am, F, G
const PAT = [0, 1, 2, 1, 2, 1, 0, 1];
const playing = () =>
  MUSIC_FILE ? !!audio && !audio.paused : !!ctx && ctx.state === "running";
function paint() {
  mbtn.classList.toggle("off", !playing());
  mbtn.setAttribute("aria-pressed", playing());
}
function tone(f, t, d, type, v) {
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + d + 0.05);
}

function schedule() {
  while (nextT < ctx.currentTime + 0.4) {
    const ch = CH[Math.floor(step / 8) % 4],
      i = step % 8;
    tone(ch[PAT[i]] * (i === 4 ? 2 : 1), nextT, 0.6, "triangle", 0.07);
    if (i === 0) tone(ch[0] / 2, nextT, 2.3, "sine", 0.1);
    nextT += 0.3;
    step++;
  }
}

async function startMusic() {
  if (MUSIC_FILE) {
    if (!audio) {
      audio = new Audio(MUSIC_FILE);
      audio.loop = true;
      audio.volume = 0.35;
      audio.onplay = audio.onpause = paint;
    }
    try {
      await audio.play();
    } catch (e) {}
  } else {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      ctx.onstatechange = paint;
      nextT = ctx.currentTime + 0.1;
      timer = setInterval(schedule, 100);
    }
    ctx.resume();
  }
  paint();
}

function stopMusic() {
  MUSIC_FILE ? audio && audio.pause() : ctx && ctx.suspend();
}
mbtn.onclick = () => {
  if (playing()) {
    stopMusic();
    muted = true;
  } else {
    startMusic();
    muted = false;
  }
  try {
    localStorage.setItem("rsvp-muted", muted ? "1" : "0");
  } catch (e) {}
};

if (!muted) startMusic();
const gestures = ["pointerdown", "keydown", "touchend"];
function unlock(e) {
  if (mbtn.contains(e.target)) return;
  gestures.forEach((n) => removeEventListener(n, unlock));
  if (!muted && !playing()) startMusic();
}
gestures.forEach((n) => addEventListener(n, unlock, { passive: true }));
paint();

// two step modal (theme picker, calendar, uploads)
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
     creditUrl = the Pinterest pin link, creditName = the pin owner. These are placeholders:
     fill in the real owner and pin link. license is optional (leave it out if you have none).
     The event-type names below must match the options in the "Type of event" menu.
     ===================================================================== */
  // Local preview images. Put these files in the project's assets folder.
  // If your files are PNG/WebP instead of JPG, update the extensions here.
  const CATEGORY_IMAGES = {
    wedding: ['assets/wedding-1.jpg', 'assets/wedding-2.jpg', 'assets/wedding-3.jpg'],
    birthday: ['assets/birthday-1.jpg', 'assets/birthday-2.jpg', 'assets/birthday-3.jpg'],
    kpop: ['assets/kpop-1.jpg', 'assets/kpop-2.jpg', 'assets/kpop-3.jpg'],
    save: ['assets/save-1.jpg', 'assets/save-2.jpg', 'assets/save-3.jpg'],
    'small-business': ['assets/business-1.jpg', 'assets/business-2.jpg', 'assets/business-3.jpg'],
    business: ['assets/business-1.jpg']
  };
  const T = (slug, n, title, description, creditName = 'View reference', creditUrl = '', license = '') => ({
    title, description,
    image: CATEGORY_IMAGES[slug]?.[n - 1] || 'assets/business-1.jpg',
    creditName, creditUrl, license
  });
  const isPin = u => /^https:\/\/([a-z0-9-]+\.)?(pinterest\.[a-z.]+|pin\.it)\//i.test(u);   // only real Pinterest links become clickable
  const THEMES = {
    'Wedding': [
      T('wedding', 1, 'Polaroid Theme', 'Personal photos with a nostalgic polaroid feel', 'View reference', 'https://ph.pinterest.com/pin/617415430212900037/'),
      T('wedding', 2, 'Lace and Vintage', 'Romantic lace details and vintage styling', 'View reference', 'https://pin.it/3iMAYmtGW'),
      T('wedding', 3, 'Modern and Comfy', 'Natural photos and relaxed everyday vibes', 'View reference', 'https://pin.it/2QqR9yUNA')
    ],
    'Birthday': [
      T('birthday', 1, 'Formal Elegance', 'A sophisticated birthday design', 'View reference', 'https://pin.it/2EW9r4Db9'),
      T('birthday', 2, 'Demure', 'Soft, refined and understated', 'View reference', 'https://pin.it/2EW9r4Db9'),
      T('birthday', 3, 'House Party', 'A relaxed and playful party vibe', 'View reference', 'https://pin.it/79f0VYz4G')
    ],
    'K-pop cupsleeve event': [
      T('kpop', 1, 'Dreamy', 'Soft colors and an atmospheric fan-event feel', 'View reference', 'https://pin.it/1hISUn6ZP'),
      T('kpop', 2, 'Membership', 'A membership-inspired fan event', 'View reference', 'https://pin.it/57G6dCf4Z'),
      T('kpop', 3, 'Colorful', 'Vibrant colors and playful fan-event styling', 'View reference', 'https://pin.it/7qtjVl9H7')
    ],
    'Debut / 18th': [
      T('debut', 1, 'Royal Portrait', 'Large portrait, story, program timeline and entourage'),
      T('debut', 2, 'Soft Glam', 'Gentle colors, gallery, details and RSVP'),
      T('debut', 3, 'Midnight Night', 'Dark theme, countdown, venue map and RSVP')
    ],
    'Baby shower': [
      T('baby', 1, 'Soft Pastel', 'Gentle colors, one hero photo, details and RSVP'),
      T('baby', 2, 'Storybook', 'Story, photos, gift ideas and directions'),
      T('baby', 3, 'Clean and Calm', 'Simple schedule, map and RSVP')
    ],
    'Corporate event': [
      T('corporate', 1, 'Agenda First', 'Timeline up top, speakers, venue and RSVP'),
      T('corporate', 2, 'Photo Banner', 'Big team photo, activities list and map'),
      T('corporate', 3, 'Modern Formal', 'A polished corporate look, program and dress code')
    ],
    'Save the date only': [
      T('save', 1, 'Full Details, No Photo', 'Names, date and full event details without a photo', 'View reference', 'https://pin.it/2bU2VkpIO'),
      T('save', 2, 'Photo-Based', 'A save-the-date design that features a photograph', 'View reference', 'https://pin.it/5KqkmaUMT'),
      T('save', 3, 'Fun and Creative', 'Playful and unconventional save-the-date styling', 'View reference', 'https://pin.it/1iAkbHODm')
    ],
    'Small business': [
      T('small-business', 1, 'Event Place', 'An inviting event venue or space', 'View reference', 'https://pin.it/3MDCzOOUn'),
      T('small-business', 2, 'Art Market', 'A creative market for art and handmade goods', 'View reference', 'https://pin.it/5i78eAqzi'),
      T('small-business', 3, 'Flower Market', 'A floral market or flower-focused event', 'View reference', 'https://pin.it/4H22W6OiK')
    ],
    'Other': [
      T('business', 1, 'Business', 'A flexible starting point for your event')
    ]
  };

  /* What guests can tick, by package. Edit the wording freely. */
  const FEATURES = {
    'Save the Date': ['One-page event showcase site', 'Countdown to your day', 'Live countdown timer display', 'High-resolution photo gallery', 'Tap-to-navigate Google Maps link'],
    'Full Invitation': ['Complete interactive web invitation', 'Custom guest survey questions', 'Live RSVP Google Sheets sync', 'One-tap add to calendar button'],
    'Premium': ['Everything included in Full Invitation', 'Dark & Light Mode Toggle', 'Background music and song requests', 'Automated RSVP email confirmation']
  };
  const SURVEY_ITEMS = ['Custom guest survey questions', 'Everything included in Full Invitation'];
  const PRICE_TIERS = {
    'Save the Date': { normal: 799, launch: 499 },
    'Full Invitation': { normal: 1299, launch: 999 },
    Premium: { normal: 1999, launch: 1799 }
  };

  /* Booking window and upload limits: edit freely */
  const MIN_YEAR = 2026, MAX_YEAR = 2027;       // only dates in these years can be booked
  const MAX_FILES = 3, MAX_PDF_MB = 2.5, MAX_IMG_MB = 15;

  /* ===================== modal logic ===================== */
  const dlg = document.getElementById('inquiry');
  if (!dlg) return;
  const form = document.getElementById('inqform');
  const el = form.elements;
  const q = s => form.querySelector(s);
  const steps = [...form.querySelectorAll('.step')].sort((a, b) => Number(a.dataset.step) - Number(b.dataset.step));
  const done = dlg.querySelector('.done');
  const url = typeof APPS_SCRIPT_URL !== 'undefined' ? APPS_SCRIPT_URL : '';
  const TITLES = ['Terms and conditions', 'About your event', 'Pick your look', 'Online payment', 'Receipt'];
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
    q('.pbar i').style.width = (n * 20) + '%';
    form.querySelectorAll('.imsg').forEach(m => { m.textContent = ''; });
    dlg.scrollTop = 0;
    const first = n === 1 ? el.termsAccepted
      : n === 2 ? el.name
      : n === 3 ? steps[2].querySelector('.themes legend')
      : n === 4 ? q('#payment-title')
      : q('.receipt-title');
    if (first) first.focus();
  }

  function validate1() {
    const checks = [
      [el.name, !!el.name.value.trim(), 'Please add your name.'],
      [el.email, /^\S+@\S+\.\S+$/.test(el.email.value.trim()), 'Please add a valid email.'],
      [el.handle, !!el.handle.value.trim(), 'Add your Instagram or Facebook so I can message you.'],
      ...(el.eventType.value === 'Other' ? [[el.eventKind, !!el.eventKind.value.trim(), 'Tell me what kind of event you have in mind.']] : []),
      [el.eventDate, dateOk(el.eventDate.value), `Pick a date from today to December 31, ${MAX_YEAR}.`]
    ];
    checks.forEach(([f, ok]) => f.setAttribute('aria-invalid', String(!ok)));
    const dateCheck = checks.find(([field]) => field === el.eventDate);
    calBox.classList.toggle('bad', !dateCheck[1]);
    const bad = checks.find(c => !c[1]);
    if (bad) {
      steps[1].querySelector('.imsg').textContent = bad[2];
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
    grid.classList.toggle('single-theme', list.length === 1);
    list.forEach((t, i) => {
      const id = `theme-${i}`;
      const card = document.createElement('div'); card.className = 'tcard';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'theme'; input.value = t.title; input.id = id;
      const label = document.createElement('label'); label.className = 'tpick'; label.htmlFor = id;

      const imgs = document.createElement('div'); imgs.className = 'timgs';
      const im = new Image();
      im.loading = 'lazy'; im.decoding = 'async'; im.src = t.image; im.alt = `${t.title} preview`;
      im.addEventListener('error', () => {
        const ph = document.createElement('span');
        ph.className = 'image-missing';
        ph.textContent = `Add image: ${t.image}`;
        im.replaceWith(ph);
      }, { once: true });
      imgs.append(im);
      const title = document.createElement('b'); title.textContent = t.title;
      const desc = document.createElement('span'); desc.className = 'd'; desc.textContent = t.description;
      label.append(imgs, title, desc);

      const credit = document.createElement('p'); credit.className = 'credit';
      if (isPin(t.creditUrl)) {
        const a = document.createElement('a');
        a.href = t.creditUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'View reference';
        credit.append(a);
      } else if (t.license) {
        credit.textContent = t.license;
      } else {
        credit.remove();
      }

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
    if (e.target.name === 'eventType') {
      const isOther = e.target.value === 'Other';
      q('.event-kind').hidden = !isOther;
      el.eventKind.required = isOther;
      if (!isOther) el.eventKind.removeAttribute('aria-invalid');
    }
  });

  /* ----- inspiration files (PNG, JPG, PDF) ----- */
  let files = [], paymentProof = null, paymentPreviewUrl = '', orderId = '';
  const isPdf = f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
  const isImg = f => /^image\/(png|jpeg)$/.test(f.type) || /\.(png|jpe?g)$/i.test(f.name);
  const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const fmsg = t => { steps[2].querySelector('.imsg').textContent = t; };

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

  const formatMoney = (amount, decimals = 0) => `₱${Number(amount).toLocaleString('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
  const selectedTier = () => PRICE_TIERS[el.package.value] ? el.package.value : 'Full Invitation';
  const currentPrice = () => PRICE_TIERS[selectedTier()];
  function updatePaymentAmount() {
    q('#amount-due').textContent = formatMoney(currentPrice().launch / 2, 2);
  }

  function validateTheme() {
    const selected = form.querySelector('[name="theme"]:checked');
    if (selected) return true;
    steps[2].querySelector('.imsg').textContent = 'Choose a theme or one of the options below.';
    q('.themes legend').focus();
    return false;
  }

  const proofInput = q('.payment-proof');
  const proofPreview = q('.proof-preview');
  q('.payment-qr').addEventListener('error', event => {
    event.currentTarget.hidden = true;
    q('.qr-placeholder').hidden = false;
  }, { once: true });
  function clearProofPreview() {
    if (paymentPreviewUrl) URL.revokeObjectURL(paymentPreviewUrl);
    paymentPreviewUrl = '';
    q('.proof-image').removeAttribute('src');
    q('.proof-pdf').removeAttribute('src');
    q('.proof-pdf').hidden = true;
    q('.proof-image').hidden = false;
    q('.proof-filename').textContent = '';
    proofPreview.hidden = true;
  }

  proofInput.addEventListener('change', () => {
    const file = proofInput.files[0];
    paymentProof = null;
    clearProofPreview();
    if (!file) return;
    if (!isPdf(file) && !isImg(file)) {
      steps[3].querySelector('.imsg').textContent = 'Upload a PNG, JPG or PDF payment proof.';
      proofInput.value = '';
      return;
    }
    if (file.size > 5 * 1048576) {
      steps[3].querySelector('.imsg').textContent = 'Payment proof must be 5 MB or smaller.';
      proofInput.value = '';
      return;
    }
    paymentProof = file;
    paymentPreviewUrl = URL.createObjectURL(file);
    q('.proof-filename').textContent = file.name;
    if (isPdf(file)) {
      q('.proof-pdf').src = paymentPreviewUrl;
      q('.proof-pdf').hidden = false;
      q('.proof-image').hidden = true;
    } else {
      q('.proof-image').src = paymentPreviewUrl;
    }
    proofPreview.hidden = false;
    steps[3].querySelector('.imsg').textContent = '';
  });

  el.termsAccepted.addEventListener('change', () => {
    q('.terms-next').disabled = !el.termsAccepted.checked;
    steps[0].querySelector('.imsg').textContent = '';
  });

  function validateTerms() {
    if (el.termsAccepted.checked) return true;
    steps[0].querySelector('.imsg').textContent = 'Please read and agree to the terms before continuing.';
    el.termsAccepted.focus();
    return false;
  }

  function validatePayment() {
    const message = steps[3].querySelector('.imsg');
    if (!el.termsAccepted.checked) {
      message.textContent = 'Please agree to the terms before continuing.';
      el.termsAccepted.focus();
      return false;
    }
    if (!paymentProof) {
      message.textContent = 'Upload your payment proof before continuing.';
      proofInput.focus();
      return false;
    }
    return true;
  }

  const makeOrderId = () => {
    const now = new Date();
    const random = String(Math.floor(10000 + Math.random() * 90000));
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${random}`;
  };

  function renderReceipt(data, tier, id) {
    const price = PRICE_TIERS[tier];
    const set = (key, value) => {
      q(`[data-receipt="${key}"]`).textContent = value;
    };
    set('orderId', id);
    set('date', new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }));
    set('customer', data.name);
    set('contact', `${data.email} · ${data.platform}: ${data.handle}`);
    set('event', data.eventType === 'Other' ? `Other: ${data.eventKind}` : data.eventType);
    set('theme', data.theme || 'Not chosen');
    set('package', data.package);
    set('normalPrice', formatMoney(price.normal));
    set('launchPrice', formatMoney(price.launch));
    set('paid', formatMoney(price.launch / 2, 2));
    set('balance', formatMoney(price.launch / 2, 2));
    set('proof', isPdf(paymentProof) ? 'PDF uploaded' : 'Screenshot uploaded');
  }

  const packPaymentProof = async () => isPdf(paymentProof)
    ? { name: paymentProof.name, type: 'application/pdf', data: await readB64(paymentProof) }
    : { name: paymentProof.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', data: await imgB64(paymentProof) };

  async function confirmOrder() {
    if (busy || !validatePayment()) return;
    const message = steps[3].querySelector('.imsg');
    const confirmButton = q('.confirm-order');
    const tier = selectedTier();
    const price = PRICE_TIERS[tier];
    const packageLabel = el.package.value === 'Not sure yet' ? 'Full Invitation (estimate)' : el.package.value;
    orderId ||= makeOrderId();
    const data = {
      type: 'inquiry',
      orderId,
      orderDate: new Date().toISOString(),
      name: el.name.value.trim(),
      email: el.email.value.trim(),
      platform: el.platform.value,
      handle: el.handle.value.trim(),
      eventType: el.eventType.value,
      eventKind: el.eventType.value === 'Other' ? el.eventKind.value.trim() : '',
      package: packageLabel,
      eventDate: el.eventDate.value,
      theme: form.querySelector('[name="theme"]:checked')?.value || 'Not chosen',
      features: [...form.querySelectorAll('[name=features]:checked')].map(input => input.value).join(', '),
      survey: q('.survey').hidden ? '' : el.survey.value.trim(),
      inspoLink: form.querySelector('[name="theme"]:checked')?.value === 'Own inspiration' ? el.inspoLink.value.trim() : '',
      notes: el.notes.value.trim(),
      extras: q('.other').hidden ? '' : el.extras.value.trim(),
      termsAccepted: true,
      normalPrice: price.normal,
      launchPrice: price.launch,
      amountPaid: price.launch / 2,
      balanceDue: price.launch / 2
    };
    busy = true;
    confirmButton.disabled = true;
    confirmButton.textContent = 'Confirming...';
    message.textContent = '';
    try {
      data.inspoFiles = data.theme === 'Own inspiration' && files.length ? await packFiles() : [];
      data.paymentProof = await packPaymentProof();
      if (JSON.stringify(data).length > 9e6) throw new Error('toobig');
      if (url) {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(data)
        });
      }
      renderReceipt(data, tier, orderId);
      q('.receipt-status').textContent = url
        ? 'Order confirmed. Your receipt is ready to download.'
        : 'Demo mode: your order receipt is ready to download.';
      goStep(4);
    } catch (error) {
      message.textContent = error.message === 'toobig'
        ? 'The uploaded files are too large together. Try a smaller payment proof.'
        : 'That did not send. Check your connection and try again.';
    } finally {
      busy = false;
      confirmButton.disabled = !el.termsAccepted.checked;
      confirmButton.textContent = 'Confirm order';
    }
  }

  function next() {
    if (step === 1) {
      if (!validate1()) return;
      if (renderedType !== el.eventType.value) { renderThemes(); renderedType = el.eventType.value; }
      if (renderedPkg !== el.package.value) { renderFeatures(); renderedPkg = el.package.value; }
      goStep(2);
    } else if (step === 2) {
      if (!validateTheme()) return;
      updatePaymentAmount();
      goStep(3);
    } else if (step === 3) {
      confirmOrder();
    }
  }

  form.addEventListener('click', e => {
    if (e.target.closest('[data-next]')) next();
    else if (e.target.closest('[data-back]')) goStep(step - 1);
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

  function resetOrderState() {
    form.reset();
    orderId = '';
    paymentProof = null;
    clearProofPreview();
    files = [];
    renderFiles();
    renderedType = '';
    renderedPkg = '';
    el.eventDate.value = '';
    el.eventKind.required = false;
    q('.event-kind').hidden = true;
    q('.inspo').hidden = true;
    q('.dnote').hidden = true;
    q('.receipt-status').textContent = '';
    q('.confirm-order').disabled = true;
    updatePlatform();
    goStep(1);
  }

  q('#download-receipt').addEventListener('click', async event => {
    const button = event.currentTarget;
    const status = q('.receipt-status');
    if (!window.jspdf?.jsPDF) {
      status.textContent = 'The PDF tools are unavailable. Check your connection and try again.';
      return;
    }
    button.disabled = true;
    button.textContent = 'Preparing PDF...';
    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [154, 220] });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const receiptValue = key => q(`[data-receipt="${key}"]`).textContent;
      const rows = [
        ['Order ID', receiptValue('orderId')],
        ['Date', receiptValue('date')],
        ['Customer', receiptValue('customer')],
        ['Contact', receiptValue('contact')],
        ['Event', receiptValue('event')],
        ['Theme', receiptValue('theme')],
        ['Package', receiptValue('package')]
      ];
      const amountRows = [
        ['Normal price', receiptValue('normalPrice')],
        ['Launch price', receiptValue('launchPrice')],
        ['50% paid', receiptValue('paid')],
        ['50% balance', receiptValue('balance')]
      ];
      const pdfText = text => text.replaceAll('₱', 'PHP ');
      pdf.setFillColor(255, 253, 248);
      pdf.rect(4, 4, pageWidth - 8, 212, 'F');
      pdf.setDrawColor(213, 208, 197);
      pdf.rect(4, 4, pageWidth - 8, 212);
      pdf.setFillColor(249, 184, 207);
      pdf.circle(pageWidth - 14, 13, 5, 'F');
      pdf.setFillColor(185, 223, 230);
      pdf.circle(12, 202, 5, 'F');
      pdf.setTextColor(51, 47, 42);
      pdf.setFont('courier', 'bold');
      pdf.setFontSize(17);
      pdf.text('ORDER RECEIPT', pageWidth / 2, 19, { align: 'center' });
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(8);
      pdf.text('RSVPretty - made just for your event', pageWidth / 2, 27, { align: 'center' });

      let y = 39;
      const divider = () => {
        pdf.setDrawColor(140, 130, 117);
        for (let x = 10; x < pageWidth - 10; x += 3) pdf.line(x, y, Math.min(x + 1.3, pageWidth - 10), y);
      };
      const drawRows = (items, bold = false) => items.forEach(([label, value]) => {
        pdf.setFont('courier', bold ? 'bold' : 'normal');
        pdf.setFontSize(8.5);
        pdf.text(label, 11, y);
        const lines = pdf.splitTextToSize(pdfText(value), 79);
        lines.forEach((line, index) => pdf.text(line, pageWidth - 11, y + index * 4, { align: 'right' }));
        y += Math.max(7, lines.length * 4 + 3);
        divider();
        y += 3;
      });
      drawRows(rows);
      y += 2;
      drawRows(amountRows);
      y += 3;
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(8.5);
      pdf.text(`Payment proof: ${receiptValue('proof')}`, pageWidth / 2, y, { align: 'center' });
      y += 8;

      const barcode = receiptValue('orderId').replace(/\D/g, '');
      let barX = 26;
      for (let i = 0; i < 54; i++) {
        const digit = Number(barcode[i % barcode.length]);
        const barWidth = i % 3 === 0 ? 0.75 : 0.35 + (digit % 2) * 0.2;
        if (i % 2 === 0) pdf.setFillColor(51, 47, 42).rect(barX, y, barWidth, 14, 'F');
        barX += barWidth + 0.55;
      }
      y += 20;
      pdf.setFont('courier', 'bold');
      pdf.setFontSize(9);
      pdf.text('Thank you for ordering!', pageWidth / 2, y, { align: 'center' });
      pdf.save(`receipt-${orderId}.pdf`);
    } catch (error) {
      status.textContent = 'The receipt could not be exported. Please try again.';
    } finally {
      button.disabled = false;
      button.textContent = 'Download Receipt (PDF)';
    }
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    next();
  });

  dlg.addEventListener('close', () => {
    if (orderId) resetOrderState();
  });
})();

(() => {
  // The Pinterest URL is the reference link. The image itself must be a local image file.
  // These three local files were named in the request. Change .jpg if your real extension differs.
  const CATEGORY_IMAGE = {
    wedding: '',
    birthday: '',
    kpop: '',
    save: '',
    business: ''
  };
  const item = (title, caption, pinUrl, image, creator = '') =>
    ({ title, caption, pinUrl, src: image, creator });
  const group = (blurb, pics) => ({ blurb, pics });

  const BY_CATEGORY = {
    wedding: group('Explore romantic wedding inspiration featuring cozy polaroid captures, timeless lace touches, and effortless contemporary decor.', [
      item('Polaroid Theme', 'Personal photos with a nostalgic polaroid feel', 'https://ph.pinterest.com/pin/617415430212900037/', 'assets/wedding-1.jpg'),
      item('Lace and Vintage', 'Romantic lace details and vintage styling', 'https://pin.it/3iMAYmtGW', 'assets/wedding-2.jpg'),
      item('Modern and Comfy', 'Natural photos and relaxed everyday vibes', 'https://pin.it/2QqR9yUNA', 'assets/wedding-3.jpg')
    ]),
    save: group('Creative save-the-date designs ranging from clean typography layouts to playful photo cards that announce your big day.', [
      item('Full Details, No Photo', 'Full event details without a photo', 'https://pin.it/2bU2VkpIO', 'assets/save-1.jpg'),
      item('Photo-Based', 'A save-the-date design with a photograph', 'https://pin.it/5KqkmaUMT', 'assets/save-2.jpg'),
      item('Fun and Creative', 'Playful and unconventional styling', 'https://pin.it/1iAkbHODm', 'assets/save-3.jpg')
    ]),
    birthday: group('Thoughtful birthday concepts ranging from sophisticated formal elegance to relaxed, playful party setups.', [
      item('Formal Elegance', 'A sophisticated birthday design', 'https://pin.it/2EW9r4Db9', 'assets/birthday-1.jpg'),
      item('Demure', 'Soft, refined and understated', 'https://pin.it/4sK9QYLCH', 'assets/birthday-2.jpg'),
      item('House Party', 'A relaxed and playful party vibe', 'https://pin.it/79f0VYz4G', 'assets/birthday-3.jpg')
    ]),
    kpop: group('Creative fan event ideas blending soft pastel aesthetics, lively colors, and unique membership themes.', [
      item('Dreamy', 'Soft colors and an atmospheric fan-event feel', 'https://pin.it/1hISUn6ZP', 'assets/kpop-1.jpg'),
      item('Membership', 'A membership-inspired fan event', 'https://pin.it/57G6dCf4Z', 'assets/kpop-2.jpg'),
      item('Colorful', 'Vibrant colors and playful fan-event styling', 'https://pin.it/7qtjVl9H7', 'assets/kpop-3.jpg')
    ]),
    business: group('Inspiring concepts for small businesses, from inviting event venues to creative art and flower markets.', [
      item('Event Place', 'An inviting event venue or space', 'https://pin.it/3MDCzOOUn', 'assets/business-1.jpg'),
      item('Art Market', 'A creative market for art and handmade goods', 'https://pin.it/5i78eAqzi', 'assets/business-2.jpg'),
      item('Flower Market', 'A floral market or flower-focused event', 'https://pin.it/4H22W6OiK', 'assets/business-3.jpg')
    ]),
  };

  const COLLECTIONS = {
    'Eternal Vows': BY_CATEGORY.wedding,
    'Save the Date': BY_CATEGORY.save,
    'Cheers to Another Year': BY_CATEGORY.birthday,
    'K-pop Cupsleeve': BY_CATEGORY.kpop,
    'Small Business': BY_CATEGORY.business
  };

  const dlg = document.createElement('dialog');
  dlg.id = 'inspo';
  dlg.setAttribute('aria-labelledby', 'inspo-title');
  dlg.innerHTML = `
    <div class="mbox inspo-box">
      <button class="mclose" type="button" data-close aria-label="Close">×</button>
      <h2 id="inspo-title"></h2>
      <p class="ilead"></p>
      <div class="igrid"></div><br>
      <p class="mnote">
            Please note that the inspiration collection demonstrates the structure, layout, and overall flow of the website. The color palette and visual elements will be customized to seamlessly match your unique event theme. 
These pictures are from Pinterest. All credit goes to their owners.
          </p> <br>
      <button class="btn" type="button" data-open-inquiry>Plan something like this</button>
    </div>`;
  document.body.append(dlg);
  const grid = dlg.querySelector('.igrid');
  const isPin = u => /^https:\/\/([a-z0-9-]+\.)?(pinterest\.[a-z.]+|pin\.it)\//i.test(u);

  function openCollection(title, cat) {
    const col = COLLECTIONS[title] || BY_CATEGORY[cat] || BY_CATEGORY.wedding;
    dlg.querySelector('#inspo-title').textContent = title;
    dlg.querySelector('.ilead').textContent = col.blurb;
    grid.replaceChildren();

    col.pics.forEach((p, i) => {
      const fig = document.createElement('figure');
      const img = new Image();
      img.className = 'ipic';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = p.src;
      img.alt = `${p.title}: ${p.caption}`;
      img.addEventListener('error', () => {
        const missing = document.createElement('span');
        missing.className = 'image-missing inspo-missing';
        missing.textContent = `Add image file: ${p.src}`;
        img.replaceWith(missing);
      }, { once: true });

      const cap = document.createElement('figcaption');
      const titleText = document.createElement('b');
      titleText.textContent = p.title;
      cap.append(titleText);

      if (isPin(p.pinUrl)) {
        const a = document.createElement('a');
        a.className = 'reference-link';
        a.href = p.pinUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'View reference';
        cap.append(document.createTextNode(' · '), a);
      }

      // Creator names are omitted unless verified; the provided pin remains the source link.
      fig.append(img, cap);
      grid.append(fig);
    });
    dlg.scrollTop = 0;
    dlg.showModal();
  }

  dlg.addEventListener('click', e => {
    if (e.target === dlg || e.target.closest('[data-close], [data-open-inquiry]')) dlg.close();
  });

  document.querySelectorAll('.tpl .card').forEach(card => {
    const heading = card.querySelector('h3');
    if (!heading) return;
    const title = heading.textContent.trim();
    const cat = card.dataset.c;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-label', `See the ${title} inspiration collection`);
    const more = document.createElement('span');
    more.className = 'btn more';
    more.setAttribute('aria-hidden', 'true');
    more.textContent = 'See collection';
    card.querySelector('.t').append(more);
    card.addEventListener('click', () => openCollection(title, cat));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openCollection(title, cat);
      }
    });
  });
})();
