/* Gait Check – UI helpers: icons, escaping, toasts, bottom sheets. */
(function () {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const svg = (d, o = {}) => `<svg width="${o.s || 24}" height="${o.s || 24}" viewBox="0 0 24 24" fill="${o.fill || 'none'}" stroke="${o.stroke || 'currentColor'}" stroke-width="${o.w || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    home: o => svg('<path d="M4 11l8-7 8 7v9H4z"/>', o),
    record: o => svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/>', o),
    recordFill: o => svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/>', o),
    history: o => svg('<polyline points="3 17 9 11 13 15 21 7"/>', o),
    horses: o => svg('<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M14 14.3c.6-.2 1.3-.3 2-.3 3.3 0 6 2.7 6 6"/>', o),
    check: o => svg('<polyline points="5 12 10 17 19 7"/>', o),
    chevR: o => svg('<polyline points="9 6 15 12 9 18"/>', o),
    chevL: o => svg('<polyline points="15 6 9 12 15 18"/>', o),
    close: o => svg('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>', o),
    plus: o => svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', o),
    link: o => svg('<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>', o),
    camera: o => svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', o),
    upload: o => svg('<path d="M12 16V4"/><polyline points="7 9 12 4 17 9"/><path d="M4 20h16"/>', o),
    film: o => svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>', o),
    print: o => svg('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>', o),
    share: o => svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>', o),
    info: o => svg('<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="8" r=".6" fill="currentColor"/>', o),
    bell: o => svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>', o),
    flip: o => svg('<path d="M4 7h13l-3-3"/><path d="M20 17H7l3 3"/>', o),
    copy: o => svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>', o),
    walk: o => svg('<circle cx="12" cy="4.5" r="1.5"/><path d="M10 21l2-7 3 3v4M8 10l4-3 3 3 3 1"/>', o)
  };

  // avatar: photo or initial
  function avatar(h, size = 52) {
    if (h.photo) return `<img class="av" src="${h.photo}" alt="${esc(h.name)}" style="width:${size}px;height:${size}px">`;
    return `<span class="ini" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px">${esc(h.name[0])}</span>`;
  }

  // ---------- toast (in-phone push notification) ----------
  let toastTimer;
  function toast({ title, body, icon = 'history', tone = 'green', go }) {
    const el = document.getElementById('toast');
    el.innerHTML = `<div class="toast-in"><span class="toast-ic ${tone}">${I[icon]({ stroke: '#FFF', s: 20 })}</span><span class="toast-tx"><span class="toast-app">Gait Check <em>now</em></span><b>${esc(title)}</b><span>${esc(body)}</span></span></div>`;
    el.onclick = () => { hideToast(); if (go) GC.router.go(go); };
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5200);
    if (navigator.vibrate) try { navigator.vibrate(40); } catch (e) { }
  }
  function hideToast() { document.getElementById('toast').classList.remove('show'); }

  // small confirmation snackbar
  let snackTimer;
  function snack(text) {
    const el = document.getElementById('snack');
    el.textContent = text; el.classList.add('show');
    clearTimeout(snackTimer); snackTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  // ---------- bottom sheet ----------
  function sheet(html, onMount) {
    const wrap = document.getElementById('sheet');
    wrap.innerHTML = `<div class="sheet-bg" data-act="sheet-close"></div><div class="sheet-panel" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    wrap.classList.add('show');
    if (onMount) onMount(wrap.querySelector('.sheet-panel'));
    const f = wrap.querySelector('input,textarea'); if (f) setTimeout(() => f.focus(), 250);
  }
  function closeSheet() { const w = document.getElementById('sheet'); w.classList.remove('show'); setTimeout(() => { if (!w.classList.contains('show')) w.innerHTML = ''; }, 300); }

  GC.ui = { esc, I, avatar, toast, hideToast, snack, sheet, closeSheet };
})();
