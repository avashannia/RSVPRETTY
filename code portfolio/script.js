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
  const CATEGORY_IMAGE = {
    wedding: 'assets/wedding-1.jpg',
    birthday: 'assets/bday-1.jpg',
    kpop: 'assets/kpop-1.jpg',
    save: 'assets/wedding-1.jpg',
    'small-business': 'assets/small-business-1.jpg'
  };
  const T = (slug, n, title, description, creditName = 'View reference', creditUrl = '', license = '') => ({
    title, description,
    // Reuse the provided category preview when available; other categories use the existing naming convention.
    images: CATEGORY_IMAGE[slug]
      ? [CATEGORY_IMAGE[slug], CATEGORY_IMAGE[slug], CATEGORY_IMAGE[slug]]
      : ['a', 'b', 'c'].map(x => `assets/themes/${slug}-${n}-${x}.jpg`),
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
        // If the file is missing, show the expected path so it is easy to fix.
        im.addEventListener('error', () => {
          const ph = document.createElement('span');
          ph.className = 'image-missing';
          ph.textContent = `Add image: ${src}`;
          im.replaceWith(ph);
        }, { once: true });
        imgs.append(im);
      });
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
      themeCredit: t ? `${t.creditName}${t.creditUrl ? ' (' + t.creditUrl + ')' : ''}${t.license ? ' · ' + t.license : ''}` : '',
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
      // each part of the thank-you message is optional, so editing that text can never break sending
      const say = (sel, text) => { const n = done.querySelector(sel); if (n) n.textContent = text; };
      say('.who', d.name.split(' ')[0]);
      say('.where', `${d.platform} (${d.handle})`);
      const demo = done.querySelector('.demo'); if (demo) demo.hidden = !!url;
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
