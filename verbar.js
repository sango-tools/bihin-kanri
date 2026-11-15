/* 版の表示と、新しい版が出た時の知らせ（どのページでも使う）
   - 画面の一番下に「画面 v○・窓口 v○」を出す（窓口＝GAS。config.js の BIHIN_API に版を聞く）
   - 5分ごとと、画面に戻った時に version.js を取り直し、新しい版なら上に「新しい版があります」を出す
   - window.BIHIN_VERSION（version.js）を先に読み込んでおくこと */
(function () {
  var V = window.BIHIN_VERSION || 0;
  var API = window.BIHIN_API || '';
  var bar = document.createElement('div');
  bar.className = 'verbar';
  bar.setAttribute('style', 'text-align:center;font-size:11px;color:#8d99a8;padding:16px 0 calc(16px + env(safe-area-inset-bottom))');
  // 窓口（GAS）の版まで出すのは管理用だけ。社員のページは小さく画面の版だけ（GAS に聞く分、開くのも軽くなる）
  var admin = /kanri\.html$/.test(location.pathname);
  bar.textContent = admin ? '画面 v' + V + '・窓口 v…' : 'v' + V;
  function put() { document.body.append(bar); }
  if (document.body) put(); else document.addEventListener('DOMContentLoaded', put);

  if (admin && API && API.indexOf('REPLACE_WITH') < 0) {
    fetch(API + (API.indexOf('?') >= 0 ? '&' : '?') + 'action=ver', { redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (r) { bar.textContent = '画面 v' + V + '・窓口 v' + (r && r.gas ? r.gas : '?'); })
      .catch(function () { bar.textContent = '画面 v' + V + '・窓口 v?（つながりません）'; });
  }

  // 画面の殻を端末に持っておく（sw.js）。開くのが速くなり、電波が弱くても画面までは出る
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  /* 送っている間の暗転とぐるぐる（2026-11-15 木村さん「データを送っている時や、ほかの操作が重なるとまずい所は、暗転でぐるぐる。ログインも込みで」）。
     bihinBusy(文) で出し、戻り値の関数で消す。0.2秒より早く終われば出さない（ちらつかないように）。重なっても最後の1つが終わるまで出す */
  var busyN = 0, busyEl = null, busyTimer = null;
  window.bihinBusy = function (text) {
    busyN++;
    if (!busyEl) {
      busyEl = document.createElement('div');
      busyEl.className = 'busy';
      busyEl.setAttribute('role', 'alert'); busyEl.setAttribute('aria-live', 'assertive');
      busyEl.innerHTML = '<div class="busyBox"><div class="spin" aria-hidden="true"></div><div class="busyText"></div></div>';
    }
    busyEl.querySelector('.busyText').textContent = text || '送っています…';
    if (!busyEl.isConnected && !busyTimer) busyTimer = setTimeout(function () { busyTimer = null; if (busyN > 0) document.body.append(busyEl); }, 200);
    var done = false;
    return function () {
      if (done) return; done = true;
      busyN = Math.max(0, busyN - 1);
      if (busyN === 0) { if (busyTimer) { clearTimeout(busyTimer); busyTimer = null; } if (busyEl && busyEl.isConnected) busyEl.remove(); }
    };
  };

  var shown = false;
  function check() {
    if (shown || document.hidden) return;
    fetch('version.js?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (t) {
      var m = t.match(/BIHIN_VERSION\s*=\s*(\d+)/);
      if (!m || Number(m[1]) <= V) return;
      shown = true;
      var b = document.createElement('div');
      b.setAttribute('role', 'status');
      b.setAttribute('style', 'position:sticky;top:0;z-index:5;background:#2346b8;color:#fff;font-size:14px;padding:10px 16px;display:flex;gap:10px;align-items:center;justify-content:center');
      var s = document.createElement('span'); s.textContent = '新しい版（v' + m[1] + '）があります。';
      var btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = '読み直す';
      btn.setAttribute('style', 'font:inherit;border:0;border-radius:8px;padding:4px 12px;background:#fff;color:#2346b8;font-weight:700');
      btn.onclick = function () { location.reload(); };
      b.append(s, btn);
      document.body.prepend(b);
    }).catch(function () {});
  }
  setInterval(check, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
