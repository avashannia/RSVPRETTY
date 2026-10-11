const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyT0pET8JDNOMGHj6W2msZPP4MjE2l0gc-1nXXNileVDjHuiQvrCmhMdSvoUp4yszX3ag/exec?count=1";
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

/* ADD-ON JS: paste at the very end of script.js (or load it after script.js).
   It reuses APPS_SCRIPT_URL from script.js, so inquiries go to the same Apps Script. */
(() => {
  // Footer marquee text
  const ftk = document.getElementById('ftk');
  if (ftk) ftk.innerHTML = `<span>LET'S PLAN YOUR EVENT &nbsp;|&nbsp; ONE LINK &nbsp;|&nbsp; LIVE RSVPS &nbsp;|&nbsp; MADE WITH LOVE &nbsp;|&nbsp; </span>`.repeat(14);

  const dlg = document.getElementById('inquiry');
  if (!dlg) return;
  const form = document.getElementById('inqform');
  const done = dlg.querySelector('.done');
  const msg = dlg.querySelector('.imsg');
  const send = dlg.querySelector('.isend');
  const lbl = dlg.querySelector('.lbl');
  const handle = form.elements.handle;
  const url = typeof APPS_SCRIPT_URL !== 'undefined' ? APPS_SCRIPT_URL : '';
  let busy = false;

  function updatePlatform() {
    const ig = form.elements.platform.value === 'Instagram';
    lbl.textContent = ig ? 'Instagram username' : 'Facebook name or profile link';
    handle.placeholder = ig ? '@yourname' : 'facebook.com/yourname';
  }
  form.querySelectorAll('[name=platform]').forEach(r => r.addEventListener('change', updatePlatform));

  function openModal(trigger) {
    form.hidden = false; done.hidden = true; msg.textContent = '';
    const card = trigger && trigger.closest('.price .card');   // remember which package they clicked
    const pkg = card ? card.querySelector('h3').textContent.trim() : '';
form.elements.package.value = [...form.elements.package.options].some(o => o.value === pkg) ? pkg : 'Not sure yet';
    dlg.showModal();
    form.elements.name.focus();
  }

  // Any "Book your site" link (href="#book") or [data-open-inquiry] opens the modal
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-open-inquiry], a[href="#book"]');
    if (!t) return;
    e.preventDefault();
    openModal(t);
  });
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    const d = Object.fromEntries(new FormData(form));
    if (d.website) return;                                    // honeypot
    if (!d.name.trim() || !/^\S+@\S+\.\S+$/.test(d.email) || !d.handle.trim()) {
      msg.textContent = 'Add your name, a valid email and your social account so I can reach you.';
      return;
    }
    d.type = 'inquiry';                                        // tells Code.gs this is an inquiry, not an RSVP
    busy = true; send.textContent = 'Sending…'; msg.textContent = '';
    try {
      if (url) await fetch(url, {method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'text/plain'}, body: JSON.stringify(d)});
      else await new Promise(r => setTimeout(r, 700));
      dlg.querySelector('.who').textContent = d.name.trim().split(' ')[0];
      dlg.querySelector('.where').textContent = `${d.platform} (${d.handle.trim()})`;
      dlg.querySelector('.demo').hidden = !!url;
      form.hidden = true; done.hidden = false;
      form.reset(); updatePlatform();
    } catch (err) {
      msg.textContent = 'That did not send. Check your connection and try again.';
    }
    busy = false; send.textContent = 'Send my details';
  });
})();