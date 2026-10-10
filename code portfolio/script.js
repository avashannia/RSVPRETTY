// Paste your Google Apps Script /exec URL here. Empty = demo mode.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxRRupF37Qdr_VAoRT8MIE1JqJn5e2q4MJdmPSuVSU_JKl1RGlhFuKAKE1_IAknMRgNg/exec";
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