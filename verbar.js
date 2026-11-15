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
  bar.textContent = '画面 v' + V + '・窓口 v…';
  function put() { document.body.append(bar); }
  if (document.body) put(); else document.addEventListener('DOMContentLoaded', put);

  if (API && API.indexOf('REPLACE_WITH') < 0) {
    fetch(API + (API.indexOf('?') >= 0 ? '&' : '?') + 'action=ver', { redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (r) { bar.textContent = '画面 v' + V + '・窓口 v' + (r && r.gas ? r.gas : '?'); })
      .catch(function () { bar.textContent = '画面 v' + V + '・窓口 v?（つながりません）'; });
  }

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
