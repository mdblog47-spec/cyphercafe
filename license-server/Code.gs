/**
 * PrintFlow License Server  (Google Apps Script)
 * ------------------------------------------------
 * Ek Google Sheet = tumhara admin panel.
 *   Clients  -> har client ki ek row (demo code + lifetime code yahin)
 *   Devices  -> kis client ke kaun se PC connect hain (auto)
 *   Config   -> latest version, download link, announcement (update dene ke liye)
 *
 * Setup:
 *   1. Naya Google Sheet banao -> Extensions > Apps Script -> ye poora code paste karo
 *   2. Upar se function "setupSheets" select karke Run karo (ek baar, permission allow karo)
 *   3. Deploy > New deployment > Web app
 *        Execute as: Me   |   Who has access: Anyone
 *      Jo URL mile use app ke license.ts mein LICENSE_API_URL mein daalo
 *   4. Code.gs mein kuch bhi change karo to Deploy > Manage deployments > Edit > New version
 */

const SHEET_CLIENTS = 'Clients';
const SHEET_DEVICES = 'Devices';
const SHEET_CONFIG = 'Config';
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DEMO_DAYS = 7;
const DEFAULT_MAX_PCS = 3;

// Clients sheet ke column numbers (1-based)
const COL = {
  ID: 1, NAME: 2, PHONE: 3, DEMO_CODE: 4, LIFE_CODE: 5, DEMO_DAYS: 6, MAX_PCS: 7,
  PLAN: 8, DEMO_START: 9, DEMO_EXPIRY: 10, LIFE_ON: 11, STATUS: 12, PCS: 13, NOTES: 14,
};
const CLIENT_HEADERS = [
  'Client ID', 'Client Name', 'Phone', 'Demo Code', 'Lifetime Code', 'Demo Days', 'Max PCs',
  'Plan (auto)', 'Demo Start (auto)', 'Demo Expiry (auto)', 'Lifetime Since (auto)', 'Status', 'PCs Used (auto)', 'Notes',
];
const DEVICE_HEADERS = ['Client ID', 'Device ID', 'PC Name', 'First Seen', 'Last Seen'];

/* ============================ ADMIN SIDE ============================ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('PrintFlow Admin')
    .addItem('1. Setup sheets (sirf ek baar)', 'setupSheets')
    .addSeparator()
    .addItem('Selected row: codes banao / fill defaults', 'menuFillDefaults')
    .addItem('Selected client ko LIFETIME kar do (manual)', 'menuMakeLifetime')
    .addItem('Selected client ka naya Lifetime code banao', 'menuNewLifetimeCode')
    .addItem('Selected client ka demo dobara shuru karo', 'menuRestartDemo')
    .addItem('Selected client ke PCs reset karo', 'menuResetDevices')
    .addItem('Selected client Block / Unblock', 'menuToggleBlock')
    .addToUi();
}

function setupSheets() {
  const ss = SpreadsheetApp.getActive();

  let clients = ss.getSheetByName(SHEET_CLIENTS) || ss.insertSheet(SHEET_CLIENTS);
  clients.getRange(1, 1, 1, CLIENT_HEADERS.length).setValues([CLIENT_HEADERS])
    .setFontWeight('bold').setBackground('#111a2b').setFontColor('#ffffff');
  clients.setFrozenRows(1);
  clients.getRange(2, COL.STATUS, 500, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Active', 'Blocked'], true).build());
  clients.getRange(2, COL.DEMO_START, 500, 3).setNumberFormat('dd-mmm-yyyy hh:mm');
  clients.setColumnWidths(1, CLIENT_HEADERS.length, 140);

  let devices = ss.getSheetByName(SHEET_DEVICES) || ss.insertSheet(SHEET_DEVICES);
  devices.getRange(1, 1, 1, DEVICE_HEADERS.length).setValues([DEVICE_HEADERS])
    .setFontWeight('bold').setBackground('#111a2b').setFontColor('#ffffff');
  devices.setFrozenRows(1);
  devices.getRange(2, 4, 2000, 2).setNumberFormat('dd-mmm-yyyy hh:mm');

  let config = ss.getSheetByName(SHEET_CONFIG) || ss.insertSheet(SHEET_CONFIG);
  if (config.getLastRow() < 1) {
    config.getRange(1, 1, 5, 2).setValues([
      ['Key', 'Value'],
      ['latest_version', '1.0.0'],
      ['download_url', ''],
      ['update_notes', ''],
      ['announcement', ''],
    ]);
    config.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#111a2b').setFontColor('#ffffff');
    config.setColumnWidth(1, 160);
    config.setColumnWidth(2, 480);
  }

  const first = ss.getSheets()[0];
  if (first.getName() === 'Sheet1' && first.getLastRow() === 0) ss.deleteSheet(first);
  SpreadsheetApp.getActive().toast('Sheets ready. Clients sheet mein "Client Name" likho, codes auto ban jayenge.');
}

/** Client Name likhte hi ID + codes + defaults auto bhar jaate hain */
function onEdit(e) {
  try {
    const sh = e.range.getSheet();
    if (sh.getName() !== SHEET_CLIENTS) return;
    if (e.range.getRow() < 2 || e.range.getColumn() !== COL.NAME) return;
    fillDefaults_(sh, e.range.getRow());
  } catch (err) { /* ignore */ }
}

function fillDefaults_(sh, row) {
  if (!String(sh.getRange(row, COL.NAME).getValue()).trim()) return;
  const set = (col, val) => {
    const cell = sh.getRange(row, col);
    if (String(cell.getValue()).trim() === '') cell.setValue(val);
  };
  set(COL.ID, 'C' + ('000' + (row - 1)).slice(-3));
  set(COL.DEMO_CODE, genCode_('PFD'));
  set(COL.LIFE_CODE, genCode_('PFL'));
  set(COL.DEMO_DAYS, DEFAULT_DEMO_DAYS);
  set(COL.MAX_PCS, DEFAULT_MAX_PCS);
  set(COL.PLAN, 'Not started');
  set(COL.STATUS, 'Active');
}

function genCode_(prefix) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 12; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i % 4 === 3 && i < 11) s += '-';
  }
  return prefix + '-' + s;
}

function selectedClientRow_() {
  const sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== SHEET_CLIENTS) throw new Error('Pehle Clients sheet mein kisi client ki row select karo.');
  const row = sh.getActiveRange().getRow();
  if (row < 2) throw new Error('Header nahi, client ki row select karo.');
  return { sh: sh, row: row };
}

function menuFillDefaults() {
  const s = selectedClientRow_();
  fillDefaults_(s.sh, s.row);
}

function menuMakeLifetime() {
  const s = selectedClientRow_();
  s.sh.getRange(s.row, COL.LIFE_ON).setValue(new Date());
  s.sh.getRange(s.row, COL.PLAN).setValue('Lifetime');
}

function menuNewLifetimeCode() {
  const s = selectedClientRow_();
  s.sh.getRange(s.row, COL.LIFE_CODE).setValue(genCode_('PFL'));
}

function menuRestartDemo() {
  const s = selectedClientRow_();
  s.sh.getRange(s.row, COL.DEMO_START, 1, 2).clearContent();
  s.sh.getRange(s.row, COL.LIFE_ON).clearContent();
  s.sh.getRange(s.row, COL.PLAN).setValue('Not started');
  s.sh.getRange(s.row, COL.DEMO_CODE).setValue(genCode_('PFD'));
}

function menuResetDevices() {
  const s = selectedClientRow_();
  const id = s.sh.getRange(s.row, COL.ID).getValue();
  const dev = SpreadsheetApp.getActive().getSheetByName(SHEET_DEVICES);
  for (let r = dev.getLastRow(); r >= 2; r--) {
    if (dev.getRange(r, 1).getValue() === id) dev.deleteRow(r);
  }
  s.sh.getRange(s.row, COL.PCS).setValue(0);
}

function menuToggleBlock() {
  const s = selectedClientRow_();
  const cell = s.sh.getRange(s.row, COL.STATUS);
  cell.setValue(String(cell.getValue()).toLowerCase() === 'blocked' ? 'Active' : 'Blocked');
}

/* ============================ SERVER SIDE ============================ */

function doGet() {
  return json_({ ok: true, service: 'PrintFlow License Server' });
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try { out = verify_(req); } finally { lock.releaseLock(); }
  } catch (err) {
    out = fail_('server_error', 'Server error. Please try again in a minute.');
  }
  return json_(out);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fail_(reason, message) {
  return { ok: false, reason: reason, message: message };
}

function readConfig_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_CONFIG);
  const cfg = {};
  if (!sh || sh.getLastRow() < 2) return cfg;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    if (r[0]) cfg[String(r[0]).trim()] = String(r[1] === null ? '' : r[1]);
  });
  return cfg;
}

/**
 * Activation + har baar ka re-check, dono yahi karta hai.
 * req: { code, deviceId, deviceName, appVersion }
 */
function verify_(req) {
  const code = String(req.code || '').trim().toUpperCase();
  const deviceId = String(req.deviceId || '').trim();
  if (!code || !deviceId) return fail_('bad_request', 'Licence code is missing.');

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_CLIENTS);
  if (!sh || sh.getLastRow() < 2) return fail_('invalid_code', 'This licence code is not valid.');

  const data = sh.getRange(2, 1, sh.getLastRow() - 1, CLIENT_HEADERS.length).getValues();
  let idx = -1;
  let kind = '';
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][COL.LIFE_CODE - 1]).trim().toUpperCase() === code) { idx = i; kind = 'lifetime'; break; }
    if (String(data[i][COL.DEMO_CODE - 1]).trim().toUpperCase() === code) { idx = i; kind = 'demo'; break; }
  }
  if (idx < 0) return fail_('invalid_code', 'This licence code is not valid.');

  const row = idx + 2;
  const d = data[idx];
  const clientId = d[COL.ID - 1];
  const now = new Date();

  if (String(d[COL.STATUS - 1]).toLowerCase() === 'blocked') {
    return fail_('blocked', 'This licence is blocked. Please contact support.');
  }

  // Lifetime: lifetime code ek baar chala to client hamesha ke liye lifetime
  let lifeOn = d[COL.LIFE_ON - 1];
  if (kind === 'lifetime' && !lifeOn) {
    lifeOn = now;
    sh.getRange(row, COL.LIFE_ON).setValue(now);
  }
  const isLifetime = !!lifeOn;

  // Demo: pehli baar chalne pe timer shuru
  let demoStart = d[COL.DEMO_START - 1];
  let demoExpiry = d[COL.DEMO_EXPIRY - 1];
  if (!isLifetime) {
    if (!demoStart) {
      const days = Number(d[COL.DEMO_DAYS - 1]) || DEFAULT_DEMO_DAYS;
      demoStart = now;
      demoExpiry = new Date(now.getTime() + days * DAY_MS);
      sh.getRange(row, COL.DEMO_START).setValue(demoStart);
      sh.getRange(row, COL.DEMO_EXPIRY).setValue(demoExpiry);
    }
    if (now.getTime() > new Date(demoExpiry).getTime()) {
      sh.getRange(row, COL.PLAN).setValue('Demo expired');
      return fail_('expired', 'Your demo has ended. Please enter your Lifetime code to continue.');
    }
  }

  // Multi-PC: max PCs tak allowed
  const dev = ss.getSheetByName(SHEET_DEVICES);
  const devRows = dev.getLastRow() > 1 ? dev.getRange(2, 1, dev.getLastRow() - 1, 5).getValues() : [];
  let found = -1;
  let count = 0;
  for (let i = 0; i < devRows.length; i++) {
    if (devRows[i][0] === clientId) {
      count++;
      if (String(devRows[i][1]) === deviceId) found = i;
    }
  }
  const maxPcs = Number(d[COL.MAX_PCS - 1]) || DEFAULT_MAX_PCS;
  const deviceName = String(req.deviceName || 'PC').slice(0, 40);
  if (found >= 0) {
    dev.getRange(found + 2, 3).setValue(deviceName);
    dev.getRange(found + 2, 5).setValue(now);
  } else {
    if (count >= maxPcs) {
      return fail_('device_limit', 'This licence is already used on ' + maxPcs + ' PCs. Contact support to add more.');
    }
    dev.appendRow([clientId, deviceId, deviceName, now, now]);
    count++;
  }

  sh.getRange(row, COL.PCS).setValue(count);
  sh.getRange(row, COL.PLAN).setValue(isLifetime ? 'Lifetime' : 'Demo');

  const cfg = readConfig_();
  return {
    ok: true,
    plan: isLifetime ? 'lifetime' : 'demo',
    clientName: String(d[COL.NAME - 1]),
    expiresAt: isLifetime ? null : new Date(demoExpiry).toISOString(),
    maxPcs: maxPcs,
    pcsUsed: count,
    serverTime: now.toISOString(),
    latestVersion: cfg.latest_version || '',
    downloadUrl: cfg.download_url || '',
    updateNotes: cfg.update_notes || '',
    announcement: cfg.announcement || '',
  };
}
