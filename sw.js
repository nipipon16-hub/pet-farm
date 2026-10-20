/* Service worker ขั้นต่ำ: ทำให้เบราว์เซอร์ยอมให้ติดตั้งเป็นแอป และเปิดหน้าตัวเปิดแอปได้แม้ออฟไลน์
   (ตัวระบบจริงอยู่บน Google Apps Script จึงต้องออนไลน์เสมอ) เปลี่ยนเลข CACHE เมื่อแก้ไฟล์ในโฟลเดอร์นี้ */
const CACHE = 'launcher-v1';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-48.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {                         // หน้าเว็บ: ลองออนไลน์ก่อน (ได้ค่าตั้งใหม่เสมอ) ไม่ได้ค่อยใช้ที่เก็บไว้
    e.respondWith(fetch(req).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
