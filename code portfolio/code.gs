/**
 * RSVPretty – Google Apps Script (two-step inquiry version)
 *
 * Replace your whole Code.gs with this file, Save, then:
 *  1. Pick "testInquiry" in the function dropdown and click Run (approve permissions if asked).
 *  2. Check your Sheet for the "Inquiries" tab and a test row.
 *  3. Deploy > Manage deployments > pencil icon > Version: New version > Deploy.
 *     (Your /exec link stays the same. Saving alone is not enough.)
 *
 * UPLOADED PICTURES / PDFs: guests' files are saved in a Drive folder called "RSVPretty inspo" (created
 * automatically). Pictures show inside the Sheet cells; PDFs show as a clickable link. The files are set to
 * "anyone with the link can view" so the pictures can appear in the Sheet. The first time, run
 * testInquiry and approve the extra Google Drive permission, then redeploy as a New version.
 *
 * OLD "Inquiries" TAB: if your tab still has the old 9 columns, this script renames it to
 * "Inquiries (old yyyy-MM-dd HHmm)" automatically and starts a fresh "Inquiries" tab with the
 * new columns. Nothing is deleted.
 */

const CONFIG = {
  // Leave empty if you opened this editor from Extensions > Apps Script inside your Sheet.
  // Otherwise paste the Sheet's ID (the long text between /d/ and /edit in its address).
  SHEET_ID: '',
  HOST_EMAIL: 'shanniargosopacleb@gmail.com',  // you get an email for each inquiry. Empty = no email
  BOOKING_YEARS: [2026, 2027],                 // only event dates in these years are accepted
  RATE_LIMIT_SECONDS: 20                       // same email can't send twice within this time
};

const VERSION = 'two-step-uploads-2026-10';   // shows when you open your /exec link, so you can tell which code is live

const TABS = {
  inquiries: {
    name: 'Inquiries',
    headers: ['Timestamp', 'Name', 'Email', 'Platform', 'Social account', 'Event type', 'Package', 'Event date',
              'Chosen theme', 'Theme credit', 'Features wanted', 'Survey questions', 'Own inspo link',
              'Inspo file 1', 'Inspo file 2', 'Inspo file 3', 'Notes', 'Status']
  },
  rsvps: {
    name: 'RSVPs',
    headers: ['Timestamp', 'Name', 'Email', 'Attending', 'Guests', 'Dietary notes']
  }
};

/* ---------- The website sends data here ---------- */
function doPost(e) {
  try {
    const data = parseBody_(e);
    console.log('received fields: ' + Object.keys(data).join(', '));   // see Executions > Logs in Apps Script
    if (data.website) return json_({ ok: true });             // hidden bot-trap field was filled

    const name = clean_(data.name, 100);
    const email = clean_(data.email, 150).toLowerCase();
    if (!name) return json_({ ok: false, error: 'Name is required.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return json_({ ok: false, error: 'Valid email is required.' });

    // Don't allow the same email to spam
    const cache = CacheService.getScriptCache();
    const key = 'rl_' + data.type + '_' + Utilities.base64EncodeWebSafe(email).slice(0, 40);
    if (cache.get(key)) return json_({ ok: false, error: 'Please wait a moment before sending again.' });
    cache.put(key, '1', CONFIG.RATE_LIMIT_SECONDS);

    if (data.type === 'inquiry') {
      const yr = Number(String(data.eventDate || '').slice(0, 4));
      if (CONFIG.BOOKING_YEARS.indexOf(yr) === -1) return json_({ ok: false, error: 'Event date must be in ' + CONFIG.BOOKING_YEARS.join(' or ') + '.' });
      saveInquiry_(data, name, email);
    } else {
      saveRsvp_(data, name, email);
    }
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Something went wrong. Please try again.' });
  }
}

/* Open your /exec link in a browser to check it is alive */
function doGet() {
  return json_({ ok: true, status: 'RSVPretty is running', version: VERSION });
}

/* ---------- Saving ---------- */
function saveInquiry_(data, name, email) {
  const platform = data.platform === 'Facebook' ? 'Facebook' : 'Instagram';
  const handle = clean_(data.handle, 200);
  const eventType = clean_(data.eventType, 60);
  const pkg = clean_(data.package, 60);
  const eventDate = clean_(data.eventDate, 20);
  const theme = clean_(data.theme, 80);
  const themeCredit = clean_(data.themeCredit, 300);
  const features = clean_(data.features, 800);
  const survey = clean_(data.survey, 1500);
  const inspo = clean_(data.inspoLink, 300);

  const noteParts = [];
  const notes = clean_(data.notes, 1500);
  const extras = clean_(data.extras, 1500);
  if (notes) noteParts.push(notes);
  if (extras) noteParts.push('Extras: ' + extras);
  const allNotes = noteParts.join(' | ');

  const up = saveInspoFiles_(data.inspoFiles, name);
  const res = addRow_(TABS.inquiries, [new Date(), name, email, platform, handle, eventType, pkg, eventDate,
                                       theme, themeCredit, features, survey, inspo, up.cells[0], up.cells[1], up.cells[2], allNotes, 'New']);
  if (up.hasImage) {                                       // make room so the pictures are visible
    res.sheet.setRowHeight(res.row, 120);
    [1, 2, 3].forEach(n => res.sheet.setColumnWidth(TABS.inquiries.headers.indexOf('Inspo file ' + n) + 1, 150));
  }

  if (CONFIG.HOST_EMAIL) {
    MailApp.sendEmail({
      to: CONFIG.HOST_EMAIL,
      subject: 'New inquiry: ' + name + ' (' + eventType + ', ' + eventDate + ')',
      body: [
        'Name: ' + name,
        'Email: ' + email,
        platform + ': ' + handle,
        'Event: ' + eventType + ' on ' + eventDate,
        'Package: ' + (pkg || '-'),
        'Theme: ' + (theme || '-') + (themeCredit ? ' (' + themeCredit + ')' : ''),
        'Own inspo link: ' + (inspo || '-'),
        'Uploaded files: ' + (up.links.length ? up.links.join('\n') : '-'),
        'Features: ' + (features || '-'),
        'Survey questions: ' + (survey || '-'),
        'Notes: ' + (allNotes || '-')
      ].join('\n')
    });
  }
}

function saveRsvp_(data, name, email) {
  const attending = ['Yes', 'No', 'Maybe'].indexOf(data.attending) > -1 ? data.attending : 'Yes';
  const guests = Math.min(Math.max(parseInt(data.guests, 10) || 1, 1), 10);
  const dietary = clean_(data.dietary, 500);
  addRow_(TABS.rsvps, [new Date(), name, email, attending, guests, dietary]);
}

/* ---------- Run this from the editor to test ---------- */
function testInquiry() {
  saveInquiry_({
    platform: 'Instagram', handle: '@test_account', eventType: 'Wedding', package: 'Full Invitation',
    eventDate: '2026-12-12', theme: 'Garden Vows', themeCredit: 'Owner name · License',
    features: 'Complete interactive web invitation, Live RSVP Google Sheets sync', survey: 'Dietary needs? Song requests?',
    inspoLink: '', notes: 'This is a test row.', extras: 'Please add a map.',
    inspoFiles: [{ name: 'tiny.png', type: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }]
  }, 'Test Person', 'test@example.com');
  Logger.log('Done. Check the "Inquiries" tab in your Sheet.');
}

/* ---------- Uploaded inspiration files ---------- */
const FILE_RULES = {
  'image/jpeg':      { ext: 'jpg', magic: [0xFF, 0xD8] },
  'image/png':       { ext: 'png', magic: [0x89, 0x50, 0x4E, 0x47] },
  'application/pdf': { ext: 'pdf', magic: [0x25, 0x50, 0x44, 0x46] }
};

function saveInspoFiles_(list, owner) {
  const out = { cells: ['', '', ''], hasImage: false, links: [] };
  if (!Array.isArray(list)) return out;
  let folder = null;
  list.slice(0, 3).forEach((f, i) => {
    const rule = f && FILE_RULES[f.type];
    if (!rule || !f.data) return;
    const bytes = Utilities.base64Decode(f.data);
    if (bytes.length > 6 * 1024 * 1024) return;                                   // too big
    if (!rule.magic.every((b, k) => (bytes[k] & 0xFF) === b)) return;              // not really that file type
    folder = folder || inspoFolder_();
    const stamp = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd-HHmmss');
    const who = String(owner).replace(/[^\w]/g, '_').slice(0, 20);
    const file = folder.createFile(Utilities.newBlob(bytes, f.type, stamp + '_' + who + '_' + (i + 1) + '.' + rule.ext));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);  // lets the picture show in the Sheet
    out.links.push(file.getUrl());
    if (f.type === 'application/pdf') {
      out.cells[i] = '=HYPERLINK("' + file.getUrl() + '","PDF ' + (i + 1) + '")';
    } else {
      out.cells[i] = '=IMAGE("https://drive.google.com/uc?id=' + file.getId() + '")';
      out.hasImage = true;
    }
  });
  return out;
}

function inspoFolder_() {
  const it = DriveApp.getFoldersByName('RSVPretty inspo');
  return it.hasNext() ? it.next() : DriveApp.createFolder('RSVPretty inspo');
}

/* ---------- Helpers ---------- */
function getTab_(ss, tab) {
  let sh = ss.getSheetByName(tab.name);
  if (sh && sh.getLastRow() > 0) {
    const have = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
    const same = have.length === tab.headers.length && tab.headers.every((h, i) => have[i] === h);
    if (!same) {                                   // old layout: keep it, rename it, start a fresh tab
      sh.setName(tab.name + ' (old ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HHmm') + ')');
      sh = null;
    }
  }
  return sh || ss.insertSheet(tab.name);
}

function addRow_(tab, row) {
  const ss = CONFIG.SHEET_ID ? SpreadsheetApp.openById(CONFIG.SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);                       // stops two people overwriting each other
  try {
    const sh = getTab_(ss, tab);
    if (sh.getLastRow() === 0) {
      sh.appendRow(tab.headers);
      sh.setFrozenRows(1);
    }
    sh.appendRow(row);
    return { sheet: sh, row: sh.getLastRow() };
  } finally {
    lock.releaseLock();
  }
}

function parseBody_(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (_) { /* not JSON */ }
  }
  return (e && e.parameter) || {};
}

// Trim, limit length, and stop spreadsheet formulas (=, +, -, @) from running
function clean_(v, max) {
  let s = String(v == null ? '' : v).trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}