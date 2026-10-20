/**
 * ฟาร์มสัตว์เลี้ยงประจำห้อง  (Google Apps Script + Google Sheets)
 *
 * วิธีใช้ ดู SETUP-GAS.md
 *  - ฐานข้อมูล = ชีตของ Google Sheets ที่สคริปต์นี้ผูกอยู่
 *  - ตั้ง Web App เป็น "Execute as: Me" และ "Who has access: Anyone within warin.ac.th"
 *    ระบบจึงรู้อีเมลของผู้ใช้จากบัญชี Google ที่ล็อกอินอยู่ (ฝั่งเว็บปลอมไม่ได้)
 *  - เว็บเรียกได้เฉพาะฟังก์ชันที่ชื่อขึ้นต้นด้วย api_ ซึ่งตรวจสิทธิ์ทุกครั้ง
 */

const DOMAIN = 'warin.ac.th';   // โดเมนอีเมลโรงเรียน (ไม่ต้องมี @)

// ลิงก์ของการเผยแพร่แบบ "เฉพาะคนในโดเมน" (Web app URL ของการเผยแพร่ B) ใส่หลัง Deploy ตามคู่มือ SETUP-GAS.md ขั้นที่ 6
// ใช้เป็นปลายทางของปุ่ม "ลงชื่อเข้าใช้ด้วย Google" บนหน้าที่เปิดให้ทุกคน ถ้าเว้นว่างจะไม่มีปุ่ม
const LOGIN_URL = '';
const TITLES = ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว'];
const ROOMS = ['ม.3/1', 'ม.3/2', 'ม.3/3', 'ม.3/4', 'ม.3/5', 'ม.3/6', 'ม.3/7', 'ม.3/8'];
const SPECIES = ['cat', 'dog', 'bunny', 'panda', 'fox', 'penguin', 'owl', 'frog', 'dino', 'dragon'];

// ของตกแต่งเริ่มต้น [id, ช่อง, ชื่อ, ราคา(แต้ม), อีโมจิ] — แก้ราคา/ชื่อได้ในชีต Items ระบบจะไม่เขียนทับ และเพิ่มเฉพาะรายการที่ยังไม่มี
const DEFAULT_ITEMS = [
  ['meadow', 'bg', 'ทุ่งหญ้า', 0, '🌿'], ['night', 'bg', 'ท้องฟ้ายามค่ำ', 30, '🌙'], ['beach', 'bg', 'ชายหาด', 30, '🏖️'],
  ['classroom', 'bg', 'ห้องเรียน', 35, '🏫'], ['snowbg', 'bg', 'ลานหิมะ', 40, '⛄'], ['rainbowbg', 'bg', 'ท้องฟ้ารุ้ง', 45, '🌈'],
  ['sakura', 'bg', 'สวนซากุระ', 50, '🌷'], ['space', 'bg', 'อวกาศ', 60, '🚀'],
  ['hat1', 'head', 'หมวกปาร์ตี้', 10, '🎉'], ['flower', 'head', 'ดอกไม้ทัดหู', 15, '🌸'], ['beret', 'head', 'เบเร่ต์ศิลปิน', 30, '🎨'],
  ['phones', 'head', 'หูฟัง', 35, '🎧'], ['ribbon', 'head', 'ริบบิ้นใหญ่', 25, '🎗️'], ['crown', 'head', 'มงกุฎ', 40, '👑'],
  ['grad', 'head', 'หมวกรับปริญญา', 45, '🎓'], ['wizard', 'head', 'หมวกพ่อมด', 50, '🧙'],
  ['round', 'face', 'แว่นกลม', 20, '👓'], ['shade', 'face', 'แว่นกันแดด', 25, '🕶️'], ['heartgl', 'face', 'แว่นหัวใจ', 30, '💖'],
  ['stargl', 'face', 'แว่นดาว', 30, '🤩'], ['monocle', 'face', 'แว่นข้างเดียว', 35, '🧐'],
  ['bow', 'neck', 'โบว์ผูกคอ', 15, '🎀'], ['scarf', 'neck', 'ผ้าพันคอ', 20, '🧣'], ['bell', 'neck', 'ปลอกคอกระดิ่ง', 20, '🔔'],
  ['tie', 'neck', 'เนคไทนักเรียน', 20, '👔'], ['medal', 'neck', 'เหรียญรางวัล', 40, '🏅'],
  ['tee', 'body', 'เสื้อยืดลายขวาง', 40, '👕'], ['dots', 'body', 'เสื้อลายจุด', 40, '👚'], ['apron', 'body', 'ผ้ากันเปื้อนเชฟ', 45, '👨‍🍳'],
  ['uniform', 'body', 'ชุดนักเรียน', 50, '🧑‍🎓'], ['hoodie', 'body', 'เสื้อฮู้ด', 55, '🧥'],
  ['pack', 'back', 'กระเป๋าเป้', 35, '🎒'], ['cape', 'back', 'ผ้าคลุมฮีโร่', 60, '🦸'], ['wings', 'back', 'ปีกนางฟ้า', 80, '👼'], ['bfly', 'back', 'ปีกผีเสื้อ', 80, '🦋'],
  ['lolli', 'prop', 'อมยิ้ม', 20, '🍭'], ['balloon', 'prop', 'ลูกโป่ง', 25, '🎈'], ['book', 'prop', 'หนังสือ', 25, '📖'],
  ['ice', 'prop', 'ไอศกรีม', 25, '🍦'], ['flag', 'prop', 'ธงโรงเรียน', 30, '🚩'],
  ['fx_sparkle', 'fx', 'ประกายดาว', 70, '✨'], ['fx_hearts', 'fx', 'หัวใจลอย', 70, '💗'], ['fx_snow', 'fx', 'หิมะตก', 70, '❄️'],
  ['fx_fire', 'fx', 'หิ่งห้อย', 80, '🔆'], ['fx_rainbow', 'fx', 'รุ้งกินน้ำ', 90, '🌈']
];
// สัตว์เลี้ยงลับ: มีได้คนเดียวทั้งระบบ ชื่อถูกล็อก สุ่มได้ตอนสุ่มไข่ตามโอกาสในชีต Settings (secret_chance) หรือครูมอบให้เอง
const SECRET = 'jay';
const SECRET_NAME = 'ครูเจ';
const SLOTS = ['head', 'face', 'neck', 'body', 'back', 'prop', 'fx', 'bg'];

const SHEETS = {
  Settings:    ['key', 'value'],
  Teachers:    ['email'],
  Students:    ['email', 'name', 'pet_name', 'species', 'hatched', 'seen_stage', 'points', 'equipped', 'owned', 'created_at',
                'title', 'first_name', 'last_name', 'student_no', 'classroom', 'order_no'],
  Subjects:    ['id', 'name', 'sort_order'],
  Assignments: ['id', 'name', 'max_score', 'sort_order', 'subject_id'],
  Scores:      ['student_email', 'assignment_id', 'score'],
  Items:       ['id', 'slot', 'name', 'cost', 'emoji'],
  Rewards:     ['id', 'name', 'cost', 'emoji', 'active'],
  Requests:    ['id', 'student_email', 'reward_id', 'cost', 'status', 'created_at', 'decided_at'],
  PointsLog:   ['student_email', 'amount', 'reason', 'by_email', 'created_at'],
  Backups:     ['id', 'label', 'created_at', 'created_by', 'students', 'scores', 'points_log', 'requests']
};

/* ===================== เปิดหน้าเว็บ ===================== */
// ไอคอนบนแท็บเบราว์เซอร์ (favicon) แทนสัญลักษณ์ Apps Script
// ต้องเป็นลิงก์ https ของภาพที่เปิดดูได้สาธารณะ และ **ต้องลงท้ายด้วยนามสกุลภาพ** (.png .ico .jpg .gif) ตามที่ Google กำหนด
// ตั้งได้ 2 ทาง: (1) ใส่ในชีต Settings แถว favicon_url (แนะนำ ไม่ต้อง Deploy ใหม่ มีผลภายใน 5 นาที) หรือ (2) ใส่ที่ค่าด้านล่าง
const FAVICON_URL = '';
const APP_TITLE = 'ฟาร์มสัตว์เลี้ยงประจำห้อง';

function validFavicon_(u) { return /^https:\/\/[^\s"'<>]+\.(png|ico|jpe?g|gif|svg|webp)(\?[^\s"'<>]*)?$/i.test(String(u || '')); }
function faviconSetting_() {
  const cache = cacheSvc_();
  let v = cache ? cache.get('favicon_url') : null;
  if (v === null || v === undefined) {
    try { v = String(setting_('favicon_url') || '').trim(); } catch (e) { v = ''; }
    if (cache) cache.put('favicon_url', v || '-', 300);
  }
  return (v && v !== '-') ? v : '';
}
function faviconUrl_() {
  const v = FAVICON_URL || faviconSetting_();
  return validFavicon_(v) ? v : '';
}
function putSetting_(key, value) {
  const r = readAll_('Settings').filter(function (x) { return x.key === key; })[0];
  if (r) writeRow_('Settings', r._row, { key: key, value: value });
  else appendObj_('Settings', { key: key, value: value });
}
// ครูตั้งลิงก์ไอคอนบนแท็บเบราว์เซอร์จากหน้าเว็บ (ว่าง = ใช้ไอคอนเริ่มต้นของ Google) มีผลทันทีในการเปิดหน้าครั้งถัดไป
function api_set_favicon(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const u = String((a && a.p_url) || '').trim();
    if (u && !validFavicon_(u)) throw new Error('bad_favicon');
    putSetting_('favicon_url', u);
    const cache = cacheSvc_();
    if (cache) cache.put('favicon_url', u || '-', 300);
    return { url: u, effective: faviconUrl_() };
  });
}

function doGet() {
  const out = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  const fav = faviconUrl_();
  if (fav) { try { out.setFaviconUrl(fav); } catch (e) {} }
  return out;
}

/* ===================== ตั้งค่าครั้งแรก (รันด้วยมือครั้งเดียว) ===================== */
function setup() {
  // กันไม่ให้ผู้ใช้เว็บเรียกฟังก์ชันนี้จากหน้าเว็บ: ต้องเป็นเจ้าของสคริปต์เท่านั้น
  const active = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  const owner0 = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (active && owner0 && active !== owner0) throw new Error('not_allowed');
  return setup_();
}

// สร้างแท็บและข้อมูลเริ่มต้นที่ยังขาด (รันซ้ำได้ ไม่ทับข้อมูลเดิม) ถูกเรียกอัตโนมัติถ้าพบว่าแท็บหายไป
let SETTING_UP_ = false;
function setup_() {
  SETTING_UP_ = true;
  const ss = SpreadsheetApp.getActive();
  if (!ss) throw new Error('สคริปต์นี้ไม่ได้ผูกกับ Google Sheets ให้สร้างจากเมนู ส่วนขยาย > Apps Script ในชีต');
  Object.keys(SHEETS).forEach(function (name) {
    const h = SHEETS[name];
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, h.length).setValues([h]);
    sh.setFrozenRows(1);
  });
  textCols_();

  if (readAll_('Settings').length === 0) appendObj_('Settings', { key: 'require_roster', value: false });
  ensureSetting_('secret_chance', 0.03);
  ensureSetting_('favicon_url', '');

  // เจ้าของสคริปต์ (คนที่กดรัน) เป็นครูอัตโนมัติ
  const owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (owner && !readAll_('Teachers').some(function (t) { return String(t.email).toLowerCase() === owner; })) {
    appendObj_('Teachers', { email: owner });
  }

  ensureItems_();
  if (readAll_('Rewards').length === 0) {
    [
      ['w1', 'สติกเกอร์ลายสัตว์เลี้ยง', 20, '⭐'], ['w2', 'เลือกที่นั่งได้ 1 สัปดาห์', 40, '💺'],
      ['w3', 'ปากกาสีพิเศษ', 30, '🖊️'], ['w4', 'บัตรผ่านส่งการบ้านช้า 1 วัน', 60, '🎟️']
    ].forEach(function (r) { appendObj_('Rewards', { id: r[0], name: r[1], cost: r[2], emoji: r[3], active: true }); });
  }
  if (readAll_('Subjects').length === 0) appendObj_('Subjects', { id: 1, name: 'วิชาหลัก', sort_order: 1 });
  if (readAll_('Assignments').length === 0) {
    [['ใบงาน 1', 10], ['ใบงาน 2', 10], ['ควิซ', 15], ['สอบกลางภาค', 25], ['โปรเจกต์', 15], ['สอบปลายภาค', 25]]
      .forEach(function (r, i) { appendObj_('Assignments', { id: i + 1, name: r[0], max_score: r[1], sort_order: i + 1, subject_id: 1 }); });
  }
  fixAssignmentSubjects_();
  SETTING_UP_ = false;
  return 'ตั้งค่าเสร็จแล้ว ครู: ' + owner;
}

/* ===================== ตัวช่วยอ่าน/เขียนชีต ===================== */
function sh_(name) {
  const ss = SpreadsheetApp.getActive();
  if (!ss) throw new Error('สคริปต์นี้ไม่ได้ผูกกับ Google Sheets ให้สร้างจากเมนู ส่วนขยาย > Apps Script ในชีต');
  let s = ss.getSheetByName(name);
  if (!s && !SETTING_UP_) {
    // แท็บหาย (ยังไม่ได้รัน setup) ให้สร้างอัตโนมัติ
    withLock_(function () { if (!SpreadsheetApp.getActive().getSheetByName(name)) setup_(); });
    SETTING_UP_ = false;
    s = SpreadsheetApp.getActive().getSheetByName(name);
  }
  if (!s) throw new Error('ไม่พบแท็บ ' + name + ' ในชีต');
  return s;
}
// ตั้งคอลัมน์รหัสนักเรียนเป็นข้อความ เพื่อไม่ให้ศูนย์นำหน้าหาย
function textCols_() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Students');
  if (!sh || typeof sh.getMaxRows !== 'function') return;
  const idx = SHEETS.Students.indexOf('student_no') + 1;
  sh.getRange(1, idx, sh.getMaxRows(), 1).setNumberFormat('@');
}
// เพิ่มคอลัมน์ที่ขาดในชีตเวอร์ชันเก่า โดยไม่ทับข้อมูลเดิม (คืน true ถ้ามีการเพิ่ม)
function ensureColumnsFor_(name) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss && ss.getSheetByName(name);
  if (!sh) return false;
  const want = SHEETS[name];
  const read = function () { return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String); };
  if (want.every(function (c) { return read().indexOf(c) >= 0; })) return false;
  withLock_(function () {
    const have = read();
    want.filter(function (c) { return have.indexOf(c) < 0; }).forEach(function (c, i) {
      sh.getRange(1, have.length + 1 + i, 1, 1).setValues([[c]]);
    });
    if (name === 'Students') textCols_();
  });
  return true;
}
// วิชาให้งานเก่าที่ยังไม่มีวิชา เข้าวิชาแรก
// เพิ่มของตกแต่งเริ่มต้นที่ยังไม่มีในชีต (ไม่แตะรายการที่มีอยู่ จึงไม่ทับราคาที่ครูแก้ไว้)
function ensureItems_() {
  const have = {};
  readAll_('Items').forEach(function (r) { have[String(r.id)] = true; });
  DEFAULT_ITEMS.forEach(function (it) {
    if (!have[it[0]]) appendObj_('Items', { id: it[0], slot: it[1], name: it[2], cost: it[3], emoji: it[4] });
  });
}
function fixAssignmentSubjects_() {
  const subs = readAll_('Subjects');
  if (!subs.length) return;
  const first = subs.map(function (x) { return Number(x.id); }).sort(function (a, b) { return a - b; })[0];
  readAll_('Assignments').forEach(function (a) {
    if (a.subject_id === '' || a.subject_id === undefined || a.subject_id === null) {
      writeRow_('Assignments', a._row, { id: a.id, name: a.name, max_score: a.max_score, sort_order: a.sort_order, subject_id: first });
    }
  });
}
// ตรวจโครงสร้างชีต (แท็บหาย/คอลัมน์ขาด) แล้วซ่อมให้เอง ผลตรวจถูกแคชไว้ 10 นาทีเพื่อความเร็ว
const SCHEMA_VER = 'v8';
function ensureSchema_() {
  const ss = SpreadsheetApp.getActive();
  if (!ss) return;
  const cache = (typeof CacheService !== 'undefined') ? CacheService.getScriptCache() : null;
  if (cache && cache.get('schema_' + SCHEMA_VER)) return;
  const have = ss.getSheets().map(function (x) { return x.getName(); });
  if (Object.keys(SHEETS).some(function (n) { return have.indexOf(n) < 0; })) {
    withLock_(function () { setup_(); });
    SETTING_UP_ = false;
  }
  let changed = false;
  ['Students', 'Assignments'].forEach(function (n) { if (ensureColumnsFor_(n)) changed = true; });
  if (changed) withLock_(fixAssignmentSubjects_);
  withLock_(ensureItems_);
  withLock_(function () { ensureSetting_('secret_chance', 0.03); ensureSetting_('favicon_url', ''); });
  if (cache) cache.put('schema_' + SCHEMA_VER, '1', 600);
}
function headers_(name) {
  const s = sh_(name);
  return s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
}
function readAll_(name) {
  const v = sh_(name).getDataRange().getValues();
  const h = v[0];
  const out = [];
  for (let i = 1; i < v.length; i++) {
    const o = { _row: i + 1 };
    for (let j = 0; j < h.length; j++) o[h[j]] = v[i][j];
    out.push(o);
  }
  return out;
}
function rowArray_(name, obj) {
  return headers_(name).map(function (k) { return obj[k] === undefined || obj[k] === null ? '' : obj[k]; });
}
function appendObj_(name, obj) { sh_(name).appendRow(rowArray_(name, obj)); }
function writeRow_(name, row, obj) {
  const h = headers_(name);
  sh_(name).getRange(row, 1, 1, h.length).setValues([rowArray_(name, obj)]);
}
/* ===================== ตัวบอกว่าข้อมูลเปลี่ยน (ใช้กับการรีเฟรชแบบเรียลไทม์) =====================
 * หน้าเว็บถามเลขเวอร์ชันถี่ๆ (ไม่อ่านชีต เร็วและถูก) ถ้าเลขเปลี่ยนจึงดึงข้อมูลจริง
 *   t = มีอะไรเปลี่ยนที่ครูต้องเห็น   s:<อีเมล> = ข้อมูลของนักเรียนคนนั้นเปลี่ยน   all = วิชา/งานเปลี่ยน (กระทบนักเรียนทุกคน)
 * เก็บใน CacheService (หมดอายุ 6 ชม. ถ้าหาย ระบบแค่ดึงข้อมูลใหม่หนึ่งครั้ง) */
function cacheSvc_() { return (typeof CacheService !== 'undefined') ? CacheService.getScriptCache() : null; }
let PENDING_ = null;
function touch_(email) { PENDING_ = PENDING_ || { emails: {}, all: false, t: true }; if (email) PENDING_.emails[String(email).toLowerCase()] = true; }
function touchAll_() { PENDING_ = PENDING_ || { emails: {}, all: false, t: true }; PENDING_.all = true; }
function flushTouch_() {
  const p = PENDING_; PENDING_ = null;
  const cache = cacheSvc_();
  if (!p || !cache) return;
  const v = String(Date.now()) + Math.random().toString(36).slice(2, 6);
  const obj = { t: v };
  Object.keys(p.emails).forEach(function (e) { obj['s:' + e] = v; });
  if (p.all) obj['all'] = v;
  cache.putAll(obj, 21600);
}
function verKey_(key) {
  const cache = cacheSvc_();
  if (!cache) return '0';
  let v = cache.get(key);
  if (!v) { v = String(Date.now()); cache.put(key, v, 21600); }
  return v;
}
// เบาที่สุด: ไม่อ่านชีต ตรวจบทบาทจากแคช 60 วินาที  คืนเฉพาะเลขเวอร์ชัน (ไม่มีข้อมูลจริงรั่ว)
function api_poll() {
  const e = me_();
  if (!e) return { v: '' };
  const cache = cacheSvc_();
  let role = cache ? cache.get('role:' + e) : null;
  if (!role) { role = whoami_().role; if (cache) cache.put('role:' + e, role, 60); }
  if (role === 'teacher') return { v: verKey_('t') };
  if (role === 'student') return { v: verKey_('s:' + e) + '|' + verKey_('all') };
  return { v: '' };
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { flushTouch_(); lock.releaseLock(); }
}
function parseJson_(v, dflt) {
  try { const x = JSON.parse(String(v)); return x === null || x === undefined ? dflt : x; } catch (e) { return dflt; }
}
function bool_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function nowIso_() { return new Date().toISOString(); }

/* ===================== ผู้ใช้และบทบาท ===================== */
function me_() { return String(Session.getActiveUser().getEmail() || '').toLowerCase().trim(); }
function inDomain_(e) { return e.length > DOMAIN.length + 1 && e.slice(-(DOMAIN.length + 1)) === '@' + DOMAIN; }
function ensureSetting_(key, dflt) {
  if (!readAll_('Settings').some(function (x) { return x.key === key; })) appendObj_('Settings', { key: key, value: dflt });
}
function secretChance_() {
  const v = Number(setting_('secret_chance'));
  return isNaN(v) || setting_('secret_chance') === '' ? 0.03 : Math.max(0, Math.min(1, v));
}
function secretHolder_() {
  const r = readAll_('Students').filter(function (x) { return String(x.species) === SECRET; })[0];
  return r ? String(r.email).toLowerCase() : '';
}
function setting_(k) {
  const r = readAll_('Settings').filter(function (x) { return x.key === k; })[0];
  return r ? r.value : '';
}
function isTeacher_(e) {
  return readAll_('Teachers').some(function (t) { return String(t.email).toLowerCase().trim() === e; });
}
function toStudent_(o) {
  return {
    email: String(o.email).toLowerCase(),
    name: String(o.name),
    pet_name: String(o.pet_name || 'สัตว์เลี้ยงของฉัน'),
    species: o.species ? String(o.species) : null,
    hatched: bool_(o.hatched),
    seen_stage: Number(o.seen_stage) || 0,
    points: Number(o.points) || 0,
    equipped: parseJson_(o.equipped, { head: null, face: null, neck: null, bg: 'meadow' }),
    owned: parseJson_(o.owned, []),
    created_at: String(o.created_at || ''),
    title: String(o.title || ''), first_name: String(o.first_name || ''), last_name: String(o.last_name || ''),
    student_no: String(o.student_no === undefined || o.student_no === null ? '' : o.student_no),
    classroom: String(o.classroom || ''),
    order_no: (o.order_no === '' || o.order_no === undefined || o.order_no === null || isNaN(Number(o.order_no))) ? null : Number(o.order_no),
    profile_done: !!(o.first_name && o.last_name && o.student_no !== '' && o.student_no !== undefined && o.classroom)
  };
}
function saveStudent_(row, s, quiet) { writeRow_('Students', row, toRowObj_(s)); if (!quiet) touch_(s.email); }
function findStudent_(email) {
  const r = readAll_('Students').filter(function (x) { return String(x.email).toLowerCase() === email; })[0];
  return r ? { row: r._row, s: toStudent_(r) } : null;
}
function newStudent_(email, name) {
  return {
    email: email, name: name, pet_name: 'สัตว์เลี้ยงของฉัน', species: null, hatched: false, seen_stage: 0, points: 0,
    equipped: { head: null, face: null, neck: null, bg: 'meadow' }, owned: [], created_at: nowIso_(),
    title: '', first_name: '', last_name: '', student_no: '', classroom: '', order_no: null, profile_done: false
  };
}
function whoami_() {
  ensureSchema_();
  const e = me_();
  if (!e) return { role: 'none', email: '', login_url: LOGIN_URL };
  if (isTeacher_(e)) return { role: 'teacher', email: e };
  if (!inDomain_(e)) return { role: 'denied', email: e };
  if (findStudent_(e)) return { role: 'student', email: e };
  if (String(setting_('require_roster')).toUpperCase() === 'TRUE') return { role: 'denied', email: e };
  withLock_(function () {
    if (!findStudent_(e)) { const n = newStudent_(e, e.split('@')[0]); appendObj_('Students', toRowObj_(n)); touch_(e); }
  });
  return { role: 'student', email: e };
}
function toRowObj_(s) {
  return {
    email: s.email, name: s.name, pet_name: s.pet_name, species: s.species || '', hatched: !!s.hatched,
    seen_stage: s.seen_stage, points: s.points, equipped: JSON.stringify(s.equipped),
    owned: JSON.stringify(s.owned), created_at: s.created_at,
    title: s.title || '', first_name: s.first_name || '', last_name: s.last_name || '',
    student_no: s.student_no || '', classroom: s.classroom || '',
    order_no: (s.order_no === null || s.order_no === undefined) ? '' : s.order_no
  };
}
function requireRole_(r) {
  const w = whoami_();
  if (w.role !== r) throw new Error('not_allowed');
  return w.email;
}

/* ===================== คะแนนและระยะการเติบโต ===================== */
function stageOf_(t) { return t >= 80 ? 4 : t >= 55 ? 3 : t >= 30 ? 2 : t >= 10 ? 1 : 0; }
// คะแนนสัตว์เลี้ยง = ผลรวมคะแนนทุกงาน หารจำนวนวิชาที่มีงาน (แต่ละวิชาเต็ม 100) สูงสุด 100
function petScore_(email) {
  const asg = assignments_();
  const subj = {}, known = {};
  asg.forEach(function (a) { subj[a.subject_id] = true; known[a.id] = true; });
  const n = Object.keys(subj).length;
  if (!n) return 0;
  let sum = 0;
  readAll_('Scores').forEach(function (r) {
    if (String(r.student_email).toLowerCase() === email && known[Number(r.assignment_id)]) sum += Number(r.score) || 0;
  });
  return Math.min(100, Math.round(sum / n * 10) / 10);
}
function subjects_() {
  return readAll_('Subjects')
    .map(function (x) { return { id: Number(x.id), name: String(x.name), sort_order: Number(x.sort_order) || 0 }; })
    .sort(function (a, b) { return a.sort_order - b.sort_order || a.id - b.id; });
}
function assignments_() {
  return readAll_('Assignments')
    .map(function (a) { return { id: Number(a.id), name: String(a.name), max_score: Number(a.max_score), sort_order: Number(a.sort_order) || 0, subject_id: Number(a.subject_id) || 0 }; })
    .sort(function (a, b) { return a.sort_order - b.sort_order || a.id - b.id; });
}
function items_() {
  return readAll_('Items').map(function (i) { return { id: String(i.id), slot: String(i.slot), name: String(i.name), cost: Number(i.cost) || 0, emoji: String(i.emoji) }; });
}
function rewards_() {
  return readAll_('Rewards').map(function (r) { return { id: String(r.id), name: String(r.name), cost: Number(r.cost) || 0, emoji: String(r.emoji), active: bool_(r.active) }; });
}
function requestObj_(r) {
  return {
    id: String(r.id), student_email: String(r.student_email).toLowerCase(), reward_id: String(r.reward_id), cost: Number(r.cost) || 0,
    status: String(r.status), created_at: String(r.created_at), decided_at: String(r.decided_at || '')
  };
}
function mustStudent_(email) {
  const f = findStudent_(email);
  if (!f) throw new Error('student_not_found');
  return f;
}

/* ===================== API ฝั่งนักเรียน ===================== */
function api_whoami() { return whoami_(); }

function api_student_data() {
  const email = requireRole_('student');
  const f = mustStudent_(email);
  const scores = readAll_('Scores')
    .filter(function (r) { return String(r.student_email).toLowerCase() === email; })
    .map(function (r) { return { assignment_id: Number(r.assignment_id), score: Number(r.score) }; });
  const reqs = readAll_('Requests').map(requestObj_)
    .filter(function (r) { return r.student_email === email; })
    .sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
  return {
    student: f.s, scores: scores, subjects: subjects_(), assignments: assignments_(),
    items: items_().sort(function (a, b) { return a.cost - b.cost; }),
    rewards: rewards_().filter(function (r) { return r.active; }).sort(function (a, b) { return a.cost - b.cost; }),
    requests: reqs
  };
}

function api_draw_egg() {
  const email = requireRole_('student');
  return withLock_(function () {
    const f = mustStudent_(email);
    if (!f.s.species) {
      if (!secretHolder_() && Math.random() < secretChance_()) {
        f.s.species = SECRET; f.s.pet_name = SECRET_NAME;
      } else {
        f.s.species = SPECIES[Math.floor(Math.random() * SPECIES.length)];
      }
      saveStudent_(f.row, f.s);
    }
    return f.s;
  });
}

function thaiDigits_(t) { return t.replace(/[๐-๙]/g, function (c) { return String(c.charCodeAt(0) - 0x0E50); }); }
function cleanName_(t) {
  const x = String(t || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return /[0-9๐-๙<>&"]/.test(x) ? '' : x;
}

// นักเรียนกรอกข้อมูลส่วนตัวครั้งแรก (กรอกได้ครั้งเดียว ถ้าผิดให้ครูกดรีเซ็ต)
function api_save_profile(a) {
  const email = requireRole_('student');
  return withLock_(function () {
    const f = mustStudent_(email);
    if (f.s.profile_done) throw new Error('profile_locked');
    const title = String(a.p_title || '').trim();
    const first = cleanName_(a.p_first), last = cleanName_(a.p_last);
    const no = thaiDigits_(String(a.p_student_no || '')).trim();
    const room = String(a.p_classroom || '').trim();
    if (TITLES.indexOf(title) < 0 || !first || !last || !/^[0-9]{1,8}$/.test(no) || ROOMS.indexOf(room) < 0) throw new Error('bad_profile');
    const dup = readAll_('Students').some(function (r) {
      return String(r.student_no) === no && String(r.email).toLowerCase() !== email;
    });
    if (dup) throw new Error('duplicate_student_no');
    f.s.title = title; f.s.first_name = first; f.s.last_name = last;
    f.s.student_no = no; f.s.classroom = room;
    f.s.name = title + first + ' ' + last;
    saveStudent_(f.row, f.s);
    return findStudent_(email).s;
  });
}

function api_hatch() {
  const email = requireRole_('student');
  return withLock_(function () {
    const f = mustStudent_(email);
    if (!f.s.species) throw new Error('no_egg');
    const st = stageOf_(petScore_(email));
    if (st < 2) throw new Error('not_ready');
    f.s.hatched = true; f.s.seen_stage = st;
    saveStudent_(f.row, f.s);
    return f.s;
  });
}

function api_mark_seen() {
  const email = requireRole_('student');
  return withLock_(function () {
    const f = mustStudent_(email);
    const st = stageOf_(petScore_(email));
    f.s.seen_stage = (f.s.hatched && st >= 2) ? st : Math.min(f.s.seen_stage, st);
    f.s.hatched = f.s.hatched && st >= 2;
    saveStudent_(f.row, f.s, true);
    return f.s;
  });
}

function api_rename_pet(a) {
  const email = requireRole_('student');
  return withLock_(function () {
    const f = mustStudent_(email);
    if (f.s.species === SECRET) throw new Error('name_locked');
    let n = String((a && a.p_name) || '').replace(/[<>]/g, '').trim().slice(0, 16);
    if (!n) n = 'สัตว์เลี้ยงของฉัน';
    f.s.pet_name = n;
    saveStudent_(f.row, f.s);
    return f.s;
  });
}

function api_buy_item(a) {
  const email = requireRole_('student');
  return withLock_(function () {
    const it = items_().filter(function (i) { return i.id === String(a.p_item); })[0];
    if (!it) throw new Error('item_not_found');
    const f = mustStudent_(email);
    if (f.s.owned.indexOf(it.id) >= 0) throw new Error('already_owned');
    if (f.s.points < it.cost) throw new Error('not_enough_points');
    f.s.points -= it.cost;
    f.s.owned.push(it.id);
    f.s.equipped[it.slot] = it.id;
    saveStudent_(f.row, f.s);
    return f.s;
  });
}

function api_equip_item(a) {
  const email = requireRole_('student');
  return withLock_(function () {
    const slot = String(a.p_slot);
    if (SLOTS.indexOf(slot) < 0) throw new Error('bad_slot');
    const f = mustStudent_(email);
    if (a.p_item === null || a.p_item === undefined) {
      f.s.equipped[slot] = slot === 'bg' ? 'meadow' : null;
    } else {
      const it = items_().filter(function (i) { return i.id === String(a.p_item) && i.slot === slot; })[0];
      if (!it) throw new Error('item_not_found');
      if (!(f.s.owned.indexOf(it.id) >= 0 || it.cost === 0)) throw new Error('not_owned');
      f.s.equipped[slot] = it.id;
    }
    saveStudent_(f.row, f.s);
    return f.s;
  });
}

// ถอดของตกแต่งทุกชิ้น (ของที่ซื้อแล้วยังอยู่ครบ ฉากหลังกลับเป็นทุ่งหญ้า)
function api_unequip_all() {
  const email = requireRole_('student');
  return withLock_(function () {
    const f = mustStudent_(email);
    f.s.equipped = { head: null, face: null, neck: null, body: null, back: null, prop: null, fx: null, bg: 'meadow' };
    saveStudent_(f.row, f.s);
    return f.s;
  });
}

function api_request_reward(a) {
  const email = requireRole_('student');
  return withLock_(function () {
    const rw = rewards_().filter(function (r) { return r.id === String(a.p_reward) && r.active; })[0];
    if (!rw) throw new Error('reward_not_found');
    const f = mustStudent_(email);
    if (f.s.points < rw.cost) throw new Error('not_enough_points');
    f.s.points -= rw.cost;
    saveStudent_(f.row, f.s);
    const req = { id: Utilities.getUuid(), student_email: email, reward_id: rw.id, cost: rw.cost, status: 'pending', created_at: nowIso_(), decided_at: '' };
    appendObj_('Requests', req);
    return req;
  });
}

/* ===================== API ฝั่งครู ===================== */
function api_teacher_data() {
  requireRole_('teacher');
  const students = readAll_('Students').map(toStudent_).sort(cmpStudent_);
  const scores = readAll_('Scores').map(function (r) {
    return { student_email: String(r.student_email).toLowerCase(), assignment_id: Number(r.assignment_id), score: Number(r.score) };
  });
  const requests = readAll_('Requests').map(requestObj_).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 200);
  const log = readAll_('PointsLog').map(function (r) {
    return { student_email: String(r.student_email).toLowerCase(), amount: Number(r.amount), reason: String(r.reason || ''), created_at: String(r.created_at) };
  }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 300);
  return {
    students: students, scores: scores, subjects: subjects_(), assignments: assignments_(), requests: requests, log: log,
    rewards: rewards_(), require_roster: String(setting_('require_roster')).toUpperCase() === 'TRUE',
    secret_holder: secretHolder_(), secret_chance: secretChance_(),
    favicon_url: faviconSetting_(), favicon_effective: faviconUrl_(),
    backups: backupList_(), last_reset: String(setting_('last_reset') || '')
  };
}

function api_set_score(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const email = String(a.p_email || '').toLowerCase().trim();
    const aid = Number(a.p_assignment);
    const asg = assignments_().filter(function (x) { return x.id === aid; })[0];
    if (!asg) throw new Error('assignment_not_found');
    if (!findStudent_(email)) throw new Error('student_not_found');
    touch_(email);
    const existing = readAll_('Scores').filter(function (r) {
      return String(r.student_email).toLowerCase() === email && Number(r.assignment_id) === aid;
    })[0];
    if (a.p_score === null || a.p_score === undefined || a.p_score === '') {
      if (existing) sh_('Scores').deleteRow(existing._row);
      return null;
    }
    const v = Math.round(Math.min(Math.max(Number(a.p_score) || 0, 0), asg.max_score) * 10) / 10;
    if (existing) writeRow_('Scores', existing._row, { student_email: email, assignment_id: aid, score: v });
    else appendObj_('Scores', { student_email: email, assignment_id: aid, score: v });
    return v;
  });
}

// กรอกคะแนนหลายคน/หลายงานในครั้งเดียว: p_items = [{email, assignment, score}] เขียนชีตแบบเป็นชุด จึงเร็วกว่าเรียกทีละช่อง
// คะแนนที่เกินคะแนนเต็มจะถูกปรับให้เท่าคะแนนเต็ม ติดลบจะเป็น 0 รายการที่ไม่พบนักเรียนหรืองานจะถูกข้าม
function api_set_scores_bulk(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const items = ((a && a.p_items) || []).slice(0, 3000);
    const asg = {};
    assignments_().forEach(function (x) { asg[x.id] = x; });
    const known = {};
    readAll_('Students').forEach(function (r) { known[String(r.email).toLowerCase()] = true; });
    const sh = sh_('Scores'), v = sh.getDataRange().getValues(), h = v[0].map(String);
    const iE = h.indexOf('student_email'), iA = h.indexOf('assignment_id'), iS = h.indexOf('score');
    const where = {};
    for (let r = 1; r < v.length; r++) where[String(v[r][iE]).toLowerCase() + '|' + Number(v[r][iA])] = r;
    const adds = [], addAt = {}, touched = {};
    let saved = 0, clamped = 0, skipped = 0, updated = 0;
    items.forEach(function (it) {
      const e = String((it && it.email) || '').toLowerCase().trim(), aid = Number(it && it.assignment), as = asg[aid], raw = Number(it && it.score);
      if (!e || !known[e] || !as || isNaN(raw) || it.score === null || it.score === '') { skipped++; return; }
      const c = Math.min(Math.max(raw, 0), as.max_score);
      if (c !== raw) clamped++;
      const val = Math.round(c * 10) / 10, key = e + '|' + aid;
      if (where[key] !== undefined) { v[where[key]][iS] = val; updated++; }
      else if (addAt[key] !== undefined) { adds[addAt[key]][iS] = val; }
      else { const row = rowArray_('Scores', { student_email: e, assignment_id: aid, score: val }); addAt[key] = adds.length; adds.push(row); }
      touched[e] = true; saved++;
    });
    if (updated) sh.getRange(2, iS + 1, v.length - 1, 1).setValues(v.slice(1).map(function (row) { return [row[iS]]; }));
    if (adds.length) sh.getRange(v.length + 1, 1, adds.length, h.length).setValues(adds);
    Object.keys(touched).forEach(function (e) { touch_(e); });
    return { saved: saved, added: adds.length, updated: updated, clamped: clamped, skipped: skipped };
  });
}

function api_set_assignment_max(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const id = Number(a.p_id), mx = Number(a.p_max);
    if (!(mx > 0 && mx <= 100)) throw new Error('bad_value');
    touchAll_();
    const row = readAll_('Assignments').filter(function (r) { return Number(r.id) === id; })[0];
    if (!row) throw new Error('assignment_not_found');
    writeRow_('Assignments', row._row, { id: row.id, name: row.name, max_score: mx, sort_order: row.sort_order });
    readAll_('Scores').forEach(function (r) {
      if (Number(r.assignment_id) === id && Number(r.score) > mx) writeRow_('Scores', r._row, { student_email: r.student_email, assignment_id: r.assignment_id, score: mx });
    });
    return null;
  });
}

function api_award_points(a) {
  const teacher = requireRole_('teacher');
  return withLock_(function () {
    const email = String(a.p_email || '').toLowerCase().trim();
    const amt = Math.floor(Number(a.p_amount));
    if (!(amt >= 1 && amt <= 100)) throw new Error('bad_amount');
    const f = mustStudent_(email);
    f.s.points += amt;
    saveStudent_(f.row, f.s);
    appendObj_('PointsLog', { student_email: email, amount: amt, reason: String(a.p_reason || '').slice(0, 60), by_email: teacher, created_at: nowIso_() });
    return f.s.points;
  });
}

// มอบแต้มให้นักเรียนหลายคนพร้อมกัน (เขียนชีตครั้งเดียว เร็วกว่าเรียกทีละคน)
function api_award_points_many(a) {
  const teacher = requireRole_('teacher');
  return withLock_(function () {
    const amt = Math.floor(Number(a.p_amount));
    if (!(amt >= 1 && amt <= 100)) throw new Error('bad_amount');
    const wanted = {};
    (a.p_emails || []).slice(0, 500).forEach(function (e) { const k = String(e || '').toLowerCase().trim(); if (k) wanted[k] = true; });
    const sh = sh_('Students');
    const v = sh.getDataRange().getValues();
    const h = v[0].map(String);
    const iE = h.indexOf('email'), iP = h.indexOf('points');
    const hit = [];
    for (let r = 1; r < v.length; r++) {
      const e = String(v[r][iE]).toLowerCase();
      if (wanted[e]) { v[r][iP] = (Number(v[r][iP]) || 0) + amt; hit.push(e); }
    }
    if (!hit.length) throw new Error('student_not_found');
    hit.forEach(function (e) { touch_(e); });
    sh.getRange(2, iP + 1, v.length - 1, 1).setValues(v.slice(1).map(function (row) { return [row[iP]]; }));
    const lg = sh_('PointsLog'), lh = headers_('PointsLog'), now = nowIso_(), why = String(a.p_reason || '').slice(0, 60);
    const rows = hit.map(function (e) {
      return rowArray_('PointsLog', { student_email: e, amount: amt, reason: why, by_email: teacher, created_at: now });
    });
    const start = lg.getDataRange().getValues().length + 1;
    lg.getRange(start, 1, rows.length, lh.length).setValues(rows);
    return { count: hit.length };
  });
}

function api_decide_request(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const r = readAll_('Requests').filter(function (x) { return String(x.id) === String(a.p_id); })[0];
    if (!r || String(r.status) !== 'pending') throw new Error('request_not_pending');
    if (a.p_approve) {
      r.status = 'approved';
    } else {
      const f = mustStudent_(String(r.student_email).toLowerCase());
      f.s.points += Number(r.cost) || 0;
      saveStudent_(f.row, f.s);
      r.status = 'rejected';
    }
    r.decided_at = nowIso_();
    touch_(r.student_email);
    writeRow_('Requests', r._row, r);
    return requestObj_(r);
  });
}

function api_add_students(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const rows = a.p_rows || [];
    const existing = {};
    readAll_('Students').forEach(function (r) { existing[String(r.email).toLowerCase()] = r._row; });
    let n = 0;
    rows.forEach(function (x) {
      const em = String((x && x.email) || '').toLowerCase().trim();
      let nm = String((x && x.name) || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) || !inDomain_(em)) return;
      if (!nm) nm = em.split('@')[0];
      if (existing[em]) {
        const f = findStudent_(em); f.s.name = nm; saveStudent_(f.row, f.s);
      } else {
        const s = newStudent_(em, nm);
        appendObj_('Students', toRowObj_(s));
        touch_(em);
        existing[em] = true;
      }
      n++;
    });
    return n;
  });
}

/* ===================== วิชาและงานที่มอบหมาย (ครู) ===================== */
function cleanTitle_(t) { return String(t || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40); }
function nextId_(sheetName) {
  const ids = readAll_(sheetName).map(function (r) { return Number(r.id) || 0; });
  return (ids.length ? Math.max.apply(null, ids) : 0) + 1;
}
function deleteRows_(sheetName, rows) {
  rows.slice().sort(function (a, b) { return b - a; }).forEach(function (r) { sh_(sheetName).deleteRow(r); });
}

function api_add_subject(a) {
  requireRole_('teacher');
  touchAll_();
  return withLock_(function () {
    const name = cleanTitle_(a.p_name);
    if (!name) throw new Error('bad_value');
    const id = nextId_('Subjects');
    appendObj_('Subjects', { id: id, name: name, sort_order: id });
    return { id: id };
  });
}
function api_rename_subject(a) {
  requireRole_('teacher');
  touchAll_();
  return withLock_(function () {
    const name = cleanTitle_(a.p_name);
    if (!name) throw new Error('bad_value');
    const r = readAll_('Subjects').filter(function (x) { return Number(x.id) === Number(a.p_id); })[0];
    if (!r) throw new Error('subject_not_found');
    writeRow_('Subjects', r._row, { id: r.id, name: name, sort_order: r.sort_order });
    return null;
  });
}
// ลบวิชา = ลบงานและคะแนนทั้งหมดในวิชานั้น
function api_delete_subject(a) {
  requireRole_('teacher');
  touchAll_();
  return withLock_(function () {
    const id = Number(a.p_id);
    const subj = readAll_('Subjects').filter(function (x) { return Number(x.id) === id; })[0];
    if (!subj) throw new Error('subject_not_found');
    const asg = readAll_('Assignments').filter(function (x) { return Number(x.subject_id) === id; });
    const ids = {};
    asg.forEach(function (x) { ids[Number(x.id)] = true; });
    deleteRows_('Scores', readAll_('Scores').filter(function (x) { return ids[Number(x.assignment_id)]; }).map(function (x) { return x._row; }));
    deleteRows_('Assignments', asg.map(function (x) { return x._row; }));
    deleteRows_('Subjects', [subj._row]);
    return null;
  });
}
function api_add_assignment(a) {
  requireRole_('teacher');
  touchAll_();
  return withLock_(function () {
    const sid = Number(a.p_subject);
    if (!readAll_('Subjects').some(function (x) { return Number(x.id) === sid; })) throw new Error('subject_not_found');
    const name = cleanTitle_(a.p_name), mx = Number(a.p_max);
    if (!name || !(mx > 0 && mx <= 100)) throw new Error('bad_value');
    const id = nextId_('Assignments');
    appendObj_('Assignments', { id: id, name: name, max_score: mx, sort_order: id, subject_id: sid });
    return { id: id };
  });
}
// แก้ชื่อและ/หรือคะแนนเต็ม (ส่งเฉพาะค่าที่ต้องการแก้)
function api_update_assignment(a) {
  requireRole_('teacher');
  touchAll_();
  return withLock_(function () {
    const id = Number(a.p_id);
    const r = readAll_('Assignments').filter(function (x) { return Number(x.id) === id; })[0];
    if (!r) throw new Error('assignment_not_found');
    let name = String(r.name), mx = Number(r.max_score);
    if (a.p_name !== undefined && a.p_name !== null) { name = cleanTitle_(a.p_name); if (!name) throw new Error('bad_value'); }
    if (a.p_max !== undefined && a.p_max !== null) { mx = Number(a.p_max); if (!(mx > 0 && mx <= 100)) throw new Error('bad_value'); }
    writeRow_('Assignments', r._row, { id: r.id, name: name, max_score: mx, sort_order: r.sort_order, subject_id: r.subject_id });
    readAll_('Scores').forEach(function (x) {
      if (Number(x.assignment_id) === id && Number(x.score) > mx) writeRow_('Scores', x._row, { student_email: x.student_email, assignment_id: x.assignment_id, score: mx });
    });
    return null;
  });
}
function api_delete_assignment(a) {
  requireRole_('teacher');
  touchAll_();
  return withLock_(function () {
    const id = Number(a.p_id);
    const r = readAll_('Assignments').filter(function (x) { return Number(x.id) === id; })[0];
    if (!r) throw new Error('assignment_not_found');
    deleteRows_('Scores', readAll_('Scores').filter(function (x) { return Number(x.assignment_id) === id; }).map(function (x) { return x._row; }));
    deleteRows_('Assignments', [r._row]);
    return null;
  });
}

/* ===================== รายงานคะแนนรายห้อง ===================== */
// ลำดับตามใบรายชื่อ: ห้อง -> เลขที่ (ที่ตั้งไว้ก่อน) -> รหัสนักเรียน -> ชื่อ  (ห้องที่ว่างอยู่ท้ายสุด)
function cmpStudent_(a, b) {
  const ra = a.classroom || '~', rb = b.classroom || '~';
  if (ra !== rb) return ra < rb ? -1 : 1;
  const ao = a.order_no, bo = b.order_no;
  if (ao !== null && bo !== null) { if (ao !== bo) return ao - bo; }
  else if (ao !== null) return -1;
  else if (bo !== null) return 1;
  const na = parseInt(a.student_no, 10), nb = parseInt(b.student_no, 10);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
}
function byStudentNo_(a, b) { return cmpStudent_(a, b); }
function reportCtx_() {
  const sc = {};
  readAll_('Scores').forEach(function (r) {
    const e = String(r.student_email).toLowerCase();
    (sc[e] = sc[e] || {})[Number(r.assignment_id)] = Number(r.score);
  });
  return { subs: subjects_(), asg: assignments_(), students: readAll_('Students').map(toStudent_), sc: sc };
}
function buildReport_(room, subjectId, ctx) {
  if (ROOMS.indexOf(room) < 0) throw new Error('bad_value');
  ctx = ctx || reportCtx_();
  const subs = ctx.subs, asg = ctx.asg, sc = ctx.sc;
  const students = ctx.students.filter(function (s) { return s.classroom === room; }).sort(byStudentNo_);
  const r1 = function (n) { return Math.round(n * 10) / 10; };
  const columns = ['เลขที่', 'รหัสนักเรียน', 'ชื่อ-สกุล'], maxes = ['', '', 'คะแนนเต็ม'];
  let subjectName = '';
  const subjTotal = function (e, sid) {
    let t = 0;
    asg.forEach(function (x) { if (x.subject_id === sid && typeof (sc[e] || {})[x.id] === 'number') t += sc[e][x.id]; });
    return r1(t);
  };
  let rows;
  if (subjectId) {
    const sub = subs.filter(function (x) { return x.id === Number(subjectId); })[0];
    if (!sub) throw new Error('subject_not_found');
    subjectName = sub.name;
    const list = asg.filter(function (x) { return x.subject_id === sub.id; });
    list.forEach(function (x) { columns.push(x.name); maxes.push(x.max_score); });
    columns.push('รวม'); maxes.push(r1(list.reduce(function (n, x) { return n + x.max_score; }, 0)));
    rows = students.map(function (s, i) {
      const m = sc[s.email] || {};
      return [s.order_no !== null ? s.order_no : i + 1, s.student_no, s.name].concat(list.map(function (x) { return typeof m[x.id] === 'number' ? m[x.id] : ''; })).concat([subjTotal(s.email, sub.id)]);
    });
  } else {
    const withWork = subs.filter(function (x) { return asg.some(function (y) { return y.subject_id === x.id; }); });
    withWork.forEach(function (x) {
      columns.push(x.name);
      maxes.push(r1(asg.filter(function (y) { return y.subject_id === x.id; }).reduce(function (n, y) { return n + y.max_score; }, 0)));
    });
    columns.push('เฉลี่ยทุกวิชา'); maxes.push(100);
    rows = students.map(function (s, i) {
      const totals = withWork.map(function (x) { return subjTotal(s.email, x.id); });
      const avg = withWork.length ? Math.min(100, r1(totals.reduce(function (n, t) { return n + t; }, 0) / withWork.length)) : 0;
      return [s.order_no !== null ? s.order_no : i + 1, s.student_no, s.name].concat(totals).concat([avg]);
    });
  }
  return { room: room, subject_name: subjectName, columns: columns, maxes: maxes, rows: rows };
}
// รายงานทุกห้อง (เฉพาะห้องที่มีนักเรียน) ใช้สำหรับดาวน์โหลด Excel หลายแท็บ
function api_all_rooms_report(a) {
  requireRole_('teacher');
  const ctx = reportCtx_();
  const sid = a && a.p_subject ? Number(a.p_subject) : 0;
  const reports = [];
  ROOMS.forEach(function (room) {
    if (ctx.students.some(function (s) { return s.classroom === room; })) reports.push(buildReport_(room, sid, ctx));
  });
  const sub = sid ? ctx.subs.filter(function (x) { return x.id === sid; })[0] : null;
  if (sid && !sub) throw new Error('subject_not_found');
  return { subject_name: sub ? sub.name : '', reports: reports };
}
function api_room_report(a) {
  requireRole_('teacher');
  return buildReport_(String(a.p_room || ''), a.p_subject ? Number(a.p_subject) : 0);
}
// เขียนรายงานลงแท็บใหม่ในชีตนี้ (เขียนทับแท็บชื่อเดิม) แล้วคืนลิงก์
function api_export_room(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const rep = buildReport_(String(a.p_room || ''), a.p_subject ? Number(a.p_subject) : 0);
    const ss = SpreadsheetApp.getActive();
    const name = ('รายงาน ' + rep.room.replace(/\//g, '-') + (rep.subject_name ? ' - ' + rep.subject_name : '')).replace(/[\[\]*?:\\\/]/g, '').slice(0, 90);
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.clear();
    const data = [rep.columns, rep.maxes].concat(rep.rows);
    const w = rep.columns.length;
    if (typeof sh.getMaxRows === 'function') sh.getRange(1, 2, sh.getMaxRows(), 1).setNumberFormat('@');
    sh.getRange(1, 1, data.length, w).setValues(data);
    if (typeof sh.setFrozenRows === 'function') sh.setFrozenRows(2);
    return { sheet_name: name, url: ss.getUrl() + '#gid=' + sh.getSheetId(), count: rep.rows.length };
  });
}

// ครูล้างข้อมูลส่วนตัวของนักเรียน เพื่อให้กรอกใหม่ (สัตว์เลี้ยงและแต้มไม่หาย)
function api_reset_profile(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const f = mustStudent_(String(a.p_email || '').toLowerCase().trim());
    f.s.title = ''; f.s.first_name = ''; f.s.last_name = ''; f.s.student_no = ''; f.s.classroom = '';
    f.s.name = f.s.email.split('@')[0];
    saveStudent_(f.row, f.s);
    return null;
  });
}

// ครูล้างชื่อสัตว์เลี้ยงที่ไม่เหมาะสม (กลับเป็นชื่อเริ่มต้น)
function api_reset_pet_name(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const f = mustStudent_(String(a.p_email || '').toLowerCase().trim());
    if (f.s.species === SECRET) return null;     // ชื่อของสัตว์เลี้ยงลับล็อกไว้ ไม่ล้าง
    f.s.pet_name = 'สัตว์เลี้ยงของฉัน';
    saveStudent_(f.row, f.s);
    return null;
  });
}

// ครูมอบสัตว์เลี้ยงลับให้นักเรียนคนหนึ่ง (p_email ว่าง = ถอนคืน) มีได้คนเดียว ถ้ามีผู้ถืออยู่แล้วจะย้ายจากคนเดิม
// คนเดิมจะกลับไปไม่มีไข่ แต่แต้ม คะแนน และของที่ซื้อไว้ยังอยู่ ให้สุ่มไข่ใหม่ได้
function api_set_secret(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const target = String((a && a.p_email) || '').toLowerCase().trim();
    const old = secretHolder_();
    if (old && old !== target) {
      const fo = findStudent_(old);
      if (fo) { fo.s.species = null; fo.s.hatched = false; fo.s.seen_stage = 0; fo.s.pet_name = 'สัตว์เลี้ยงของฉัน'; saveStudent_(fo.row, fo.s); }
    }
    if (target) {
      const ft = mustStudent_(target);
      ft.s.species = SECRET; ft.s.pet_name = SECRET_NAME;
      saveStudent_(ft.row, ft.s);
    }
    touch_(old); touch_(target);
    return { holder: target };
  });
}

// บันทึกเลขที่ของนักเรียนในห้องเดียว ตามลำดับอีเมลที่ส่งมา (คนที่ไม่ได้ส่งมาจะต่อท้ายตามลำดับเดิม)
function api_set_order(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const room = String(a.p_room || '');
    if (ROOMS.indexOf(room) < 0) throw new Error('bad_value');
    ensureColumnsFor_('Students');
    const inRoom = readAll_('Students').map(toStudent_).filter(function (x) { return x.classroom === room; }).sort(cmpStudent_);
    const byEmail = {};
    inRoom.forEach(function (x) { byEmail[x.email] = true; });
    const seen = {}, finalList = [];
    (a.p_emails || []).forEach(function (e) {
      const k = String(e || '').toLowerCase().trim();
      if (byEmail[k] && !seen[k]) { seen[k] = true; finalList.push(k); }
    });
    inRoom.forEach(function (x) { if (!seen[x.email]) finalList.push(x.email); });
    const pos = {};
    finalList.forEach(function (e, i) { pos[e] = i + 1; });
    const sh = sh_('Students'), v = sh.getDataRange().getValues(), h = v[0].map(String);
    const iE = h.indexOf('email'), iO = h.indexOf('order_no');
    if (iO < 0) throw new Error('bad_value');
    for (let r = 1; r < v.length; r++) {
      const e = String(v[r][iE]).toLowerCase();
      if (pos[e] !== undefined) v[r][iO] = pos[e];
    }
    sh.getRange(2, iO + 1, v.length - 1, 1).setValues(v.slice(1).map(function (row) { return [row[iO]]; }));
    touch_();
    return { count: finalList.length };
  });
}

/* ===================== ลบนักเรียน สำรองข้อมูล และล้างข้อมูลเทอมใหม่ ===================== */
const BACKUP_TABLES = ['Students', 'Scores', 'PointsLog', 'Requests', 'Subjects', 'Assignments'];
const MAX_BACKUPS = 15;

// เขียนตารางทั้งแผ่นใหม่ในครั้งเดียว (เร็วกว่าลบทีละแถว) คงหัวตารางและรูปแบบเซลล์ไว้
function writeTableRaw_(sh, header, rows) {
  sh.clearContents();
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  if (rows.length) sh.getRange(2, 1, rows.length, header.length).setValues(rows);
}
// ลบแถวที่ตรงเงื่อนไข คืนจำนวนที่ลบ
function dropRows_(name, pred) {
  const sh = sh_(name), v = sh.getDataRange().getValues(), h = v[0], keep = [];
  let removed = 0;
  for (let i = 1; i < v.length; i++) {
    const o = {};
    for (let j = 0; j < h.length; j++) o[h[j]] = v[i][j];
    if (pred(o)) removed++; else keep.push(v[i]);
  }
  if (removed) writeTableRaw_(sh, h, keep);
  return removed;
}
function clearTable_(name) { return dropRows_(name, function () { return true; }); }
function writeStudents_(list) {
  const sh = sh_('Students'), h = headers_('Students');
  const rows = list.map(function (s) { const o = toRowObj_(s); return h.map(function (k) { return o[k] === undefined || o[k] === null ? '' : o[k]; }); });
  writeTableRaw_(sh, h, rows);
}
function pad2_(n) { return (n < 10 ? '0' : '') + n; }
function nowLabel_() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);   // เวลาไทย (UTC+7)
  return pad2_(d.getUTCDate()) + '/' + pad2_(d.getUTCMonth() + 1) + '/' + (d.getUTCFullYear() + 543) + ' ' + pad2_(d.getUTCHours()) + ':' + pad2_(d.getUTCMinutes());   // วว/ดด/พ.ศ. ชม:นาที
}

// ลบนักเรียนรายคน: ลบแถวนักเรียน คะแนน ประวัติแต้ม และคำขอแลกรางวัลของคนนั้น (ลบถาวร กู้คืนได้จากไฟล์สำรองเท่านั้น)
// ถ้าเป็นผู้ถือสัตว์เลี้ยงลับ สัตว์ลับจะว่างและสุ่มหรือมอบให้คนอื่นได้ ถ้ายังไม่จำกัดเฉพาะรายชื่อ นักเรียนที่เข้าระบบอีกจะถูกสร้างบัญชีใหม่
function api_delete_student(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const email = String((a && a.p_email) || '').toLowerCase().trim();
    const f = findStudent_(email);
    if (!f) throw new Error('student_not_found');
    const mine = function (k) { return function (o) { return String(o[k]).toLowerCase() === email; }; };
    const res = {
      email: email, name: f.s.name, was_secret: f.s.species === SECRET,
      scores: dropRows_('Scores', mine('student_email')),
      points_log: dropRows_('PointsLog', mine('student_email')),
      requests: dropRows_('Requests', mine('student_email'))
    };
    dropRows_('Students', mine('email'));
    touch_(email);
    return res;
  });
}

function backupList_() {
  return readAll_('Backups').map(function (b) {
    return { id: Number(b.id), label: String(b.label), created_at: String(b.created_at), created_by: String(b.created_by),
             students: Number(b.students) || 0, scores: Number(b.scores) || 0, points_log: Number(b.points_log) || 0, requests: Number(b.requests) || 0 };
  }).sort(function (x, y) { return y.id - x.id; });
}
function backupCreate_(label) {
  const ss = SpreadsheetApp.getActive();
  const id = readAll_('Backups').reduce(function (m, x) { return Math.max(m, Number(x.id) || 0); }, 0) + 1;
  const counts = {};
  BACKUP_TABLES.forEach(function (name) {
    const src = sh_(name);
    counts[name] = Math.max(0, src.getDataRange().getValues().length - 1);
    const cp = src.copyTo(ss);
    cp.setName('bk' + id + '_' + name);
    try { cp.hideSheet(); } catch (e) {}
  });
  const entry = { id: id, label: (String(label || '').trim() || ('สำรอง ' + nowLabel_())).slice(0, 80), created_at: nowIso_(), created_by: me_(),
                  students: counts.Students, scores: counts.Scores, points_log: counts.PointsLog, requests: counts.Requests };
  appendObj_('Backups', entry);
  return entry;
}
// สำรองข้อมูลปัจจุบันไว้ในชีตเดียวกัน (แท็บซ่อน bk<เลข>_ชื่อตาราง) เก็บได้ไม่เกิน MAX_BACKUPS ชุด
function api_backup_create(a) {
  requireRole_('teacher');
  return withLock_(function () {
    if (readAll_('Backups').length >= MAX_BACKUPS) throw new Error('too_many_backups');
    const e = backupCreate_(a && a.p_label);
    touch_();
    return e;
  });
}
function api_backup_delete(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const id = Number(a && a.p_id), ss = SpreadsheetApp.getActive();
    if (!readAll_('Backups').some(function (b) { return Number(b.id) === id; })) throw new Error('backup_missing');
    BACKUP_TABLES.forEach(function (name) { const s = ss.getSheetByName('bk' + id + '_' + name); if (s) ss.deleteSheet(s); });
    dropRows_('Backups', function (o) { return Number(o.id) === id; });
    touch_();
    return null;
  });
}
// ข้อมูลทุกตารางของชุดสำรอง (หรือข้อมูลปัจจุบันถ้า p_id = 0) ให้หน้าเว็บทำไฟล์ Excel ไปเก็บไว้นอกชีต
function api_backup_data(a) {
  requireRole_('teacher');
  const id = Number(a && a.p_id) || 0, ss = SpreadsheetApp.getActive();
  let label = 'ข้อมูลปัจจุบัน ' + nowLabel_();
  if (id) {
    const b = readAll_('Backups').filter(function (x) { return Number(x.id) === id; })[0];
    if (!b) throw new Error('backup_missing');
    label = String(b.label);
  }
  const tables = {};
  BACKUP_TABLES.forEach(function (name) {
    const sheet = id ? ss.getSheetByName('bk' + id + '_' + name) : sh_(name);
    if (!sheet) throw new Error('backup_missing');
    tables[name] = sheet.getDataRange().getValues();
  });
  return { id: id, label: label, tables: tables };
}
// กู้คืนจากชุดสำรอง: สำรองสถานะปัจจุบันไว้ก่อนเสมอ แล้วแทนที่ 6 ตารางด้วยข้อมูลในชุดสำรอง
function api_backup_restore(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const id = Number(a && a.p_id), ss = SpreadsheetApp.getActive();
    if (!readAll_('Backups').some(function (b) { return Number(b.id) === id; })) throw new Error('backup_missing');
    const snaps = {};
    BACKUP_TABLES.forEach(function (name) {
      const s = ss.getSheetByName('bk' + id + '_' + name);
      if (!s) throw new Error('backup_missing');
      snaps[name] = s.getDataRange().getValues();
    });
    const safety = backupCreate_('ก่อนกู้คืน ' + nowLabel_());
    const counts = {};
    BACKUP_TABLES.forEach(function (name) {
      const live = sh_(name), liveH = headers_(name), snapH = snaps[name][0].map(String);
      const idx = liveH.map(function (k) { return snapH.indexOf(k); });
      const rows = snaps[name].slice(1).map(function (r) { return idx.map(function (i) { return i < 0 ? '' : r[i]; }); });
      writeTableRaw_(live, liveH, rows);
      counts[name] = rows.length;
    });
    touchAll_();
    return { restored: id, safety_id: safety.id, counts: counts };
  });
}

// ล้างข้อมูลสำหรับเทอมใหม่ ต้องมีชุดสำรองที่เพิ่งสร้างภายใน 30 นาทีก่อนเสมอ (ระบบบังคับ)
// p_opts: scores, subjects (ลบวิชาและงานทั้งหมดแล้วสร้างวิชาเริ่มต้นใหม่ รวมคะแนน), growth (สัตว์เลี้ยงเริ่มจากไข่ใหม่), points (ล้างแต้มและประวัติแต้ม),
//         items (ล้างของที่ซื้อและที่ใส่), requests (ล้างคำขอแลกรางวัล), students: 'keep' | 'profile' (ให้กรอกห้อง/เลขที่ใหม่) | 'delete' (ลบนักเรียนทั้งหมด)
function api_term_reset(a) {
  requireRole_('teacher');
  return withLock_(function () {
    const o = (a && a.p_opts) || {};
    const bid = Number(a && a.p_backup_id);
    const bk = readAll_('Backups').filter(function (x) { return Number(x.id) === bid; })[0];
    const age = bk ? Date.now() - new Date(String(bk.created_at)).getTime() : NaN;
    if (!bk || isNaN(age) || age > 30 * 60 * 1000 || age < -5 * 60 * 1000) throw new Error('backup_required');
    const mode = ['keep', 'profile', 'delete'].indexOf(o.students) >= 0 ? o.students : 'keep';
    const res = { backup_id: bid, students_mode: mode, scores: 0, subjects: false, points_log: 0, requests: 0, students: 0 };
    if (mode === 'delete') {
      res.students = clearTable_('Students');
      res.scores = clearTable_('Scores'); res.points_log = clearTable_('PointsLog'); res.requests = clearTable_('Requests');
    } else {
      if (o.subjects || o.scores) res.scores = clearTable_('Scores');
      if (o.points) res.points_log = clearTable_('PointsLog');
      if (o.requests) res.requests = clearTable_('Requests');
      const list = readAll_('Students').map(toStudent_);
      list.forEach(function (s) {
        if (mode === 'profile') { s.title = ''; s.first_name = ''; s.last_name = ''; s.student_no = ''; s.classroom = ''; s.order_no = null; s.name = s.email.split('@')[0]; }
        if (o.growth) { s.hatched = false; s.seen_stage = 0; }
        if (o.points) s.points = 0;
        if (o.items) { s.owned = []; s.equipped = { head: null, face: null, neck: null, body: null, back: null, prop: null, fx: null, bg: 'meadow' }; }
      });
      if (mode === 'profile' || o.growth || o.points || o.items) writeStudents_(list);
      res.students = list.length;
    }
    if (o.subjects) {
      clearTable_('Assignments'); clearTable_('Subjects');
      appendObj_('Subjects', { id: 1, name: 'วิชาหลัก', sort_order: 1 });
      [['ใบงาน 1', 10], ['ใบงาน 2', 10], ['ควิซ', 15], ['สอบกลางภาค', 25], ['โปรเจกต์', 15], ['สอบปลายภาค', 25]]
        .forEach(function (r, i) { appendObj_('Assignments', { id: i + 1, name: r[0], max_score: r[1], sort_order: i + 1, subject_id: 1 }); });
      res.subjects = true;
    }
    putSetting_('last_reset', nowIso_() + ' | ' + String(bk.label));
    touchAll_();
    return res;
  });
}

function api_set_require_roster(a) {
  requireRole_('teacher');
  touch_();
  return withLock_(function () {
    const v = !!a.p_value;
    const r = readAll_('Settings').filter(function (x) { return x.key === 'require_roster'; })[0];
    if (r) writeRow_('Settings', r._row, { key: 'require_roster', value: v });
    else appendObj_('Settings', { key: 'require_roster', value: v });
    return v;
  });
}
