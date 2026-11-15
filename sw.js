/* 画面の殻を端末に持っておく（service worker。現場ナビと同じ考え）
   - 画面（html・js）は「まず取りに行き、つながらなければ端末の控え」。新しい版がすぐ届くように
   - 絵・アイコンは「端末の控えを先に使う」。名前を変えない限り中身は変わらないので速い
   - GAS（script.google.com）への問い合わせ・データは、ここでは扱わない（いつも取りに行く）
   - 控える物を変えたら CACHE_VERSION を上げる（version.js の版とは別に数える） */
const CACHE_VERSION = 3;   // 3：溜まった version.js?t=… の控えを捨てるため上げた
const CACHE = 'bihin-shell-v' + CACHE_VERSION;
const SHELL = [
  './', 'index.html', 'list.html', 'kanri.html', 'config.js', 'version.js', 'verbar.js', 'theme.css', 'manifest.webmanifest',
  'icon-32.png', 'icon-180.png', 'icon-192.png', 'icon-512.png',
  'img/already.webp', 'img/sent.webp', 'img/scan.webp', 'img/trouble.webp', 'img/login.webp', 'img/head-kanri.webp',
  'img/empty-reports.webp', 'img/photo-guide.webp',
  'img/cat-pen.webp', 'img/cat-paper.webp', 'img/cat-file.webp', 'img/cat-binding.webp',
  'img/cat-pack.webp', 'img/cat-battery.webp', 'img/cat-envelope.webp', 'img/cat-other.webp',
  'vendor/qrcode.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(SHELL.map((u) => cache.add(u).catch(() => null))))   // 1つ失敗しても残りは控える
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('bihin-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // GAS・CDN はそのまま

  const isPage = req.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/');
  if (isPage) {
    // 控えは「?」の後ろを外した名前で1つだけ持つ（version.js?t=… を毎回別の物として溜めないように）
    const key = url.origin + url.pathname;
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(url.origin + url.pathname, copy)); }
      return res;
    }))
  );
});
