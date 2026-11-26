/* Gait Check – website interactions: nav border, in-page links without history entries,
   scroll reveal, the tracking clip with its readout, and the live demo in the desktop hero. */
(function () {
  'use strict';
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Section links scroll without adding a history entry, so one "back" always leaves the page.
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  });

  const els = document.querySelectorAll('.reveal, .chart-card');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  } else {
    els.forEach(el => el.classList.add('in'));
  }

  // Under the hood: the tracking clip plays while it is on screen, and a readout runs in step with it.
  // The values are simulated from the clip time (no real measurement), so they are stable and loop cleanly.
  const video = document.getElementById('techVideo');
  const scope = document.getElementById('scope');
  if (video && scope) {
    const $ = id => document.getElementById(id);
    const T = 0.72, FPS = 30, ALPHA = 0.30, MU = 96.0, SIGMA = 1.1, AH = 22, AP = 30, WINDOW = 3;
    const rnd = (n, k) => { const x = Math.sin(n * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
    const asymH = n => 0.5 + 1.6 * rnd(n, 1);                 // mm, half the difference between the two minima
    const asymP = n => 0.5 + 1.4 * rnd(n, 2);
    const wob = (t, k) => 0.9 * Math.sin(t * 23.1 + k) + 0.6 * Math.sin(t * 41.7 + k * 2.3);
    const head = t => { const n = Math.floor(t / T), p = 2 * Math.PI * t / T; return AH * Math.cos(2 * p) + asymH(n) * Math.cos(p) + wob(t, 1); };
    const pelvis = t => { const n = Math.floor(t / T), p = 2 * Math.PI * t / T + 0.6; return AP * Math.cos(2 * p) + asymP(n) * Math.cos(p) + wob(t, 4); };
    const si = n => 100 * (1 - asymP(n) / AP);          // L = AP + a, R = AP - a  =>  |L - R| / (L + R) = a / AP
    const minus = (v, d) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
    const ctx = scope.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue('--ink').trim(), green = css.getPropertyValue('--green').trim(), line = css.getPropertyValue('--line').trim();
    let W = 0, H = 0;
    function size() {
      const r = scope.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height; scope.width = Math.round(W * d); scope.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    function trace(fn, t, color) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const y = H / 2 - fn(t - (W - x) / W * WINDOW) * (H / 2 - 8) / 34;
        if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    }
    function draw() {
      const t = video.currentTime || 0;
      const n = Math.floor(t / T), ph = t / T - n;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      [0.5, H / 2, H - 0.5].forEach(y => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); });
      // stride boundaries scroll with the signal
      for (let k = n; k >= 0 && k * T > t - WINDOW; k--) { const x = W - (t - k * T) / WINDOW * W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      trace(pelvis, t, green); trace(head, t, ink);
      let s = MU; for (let k = 0; k <= n; k++) s = ALPHA * si(k) + (1 - ALPHA) * s;
      const z = (s - MU) / SIGMA;
      $('hudT').textContent = 't ' + t.toFixed(2) + ' s';
      $('hudF').textContent = 'frame ' + String(Math.floor(t * FPS)).padStart(4, '0');
      $('rStride').textContent = n + 1;
      $('rPhase').style.width = (ph * 100).toFixed(1) + '%';
      $('rStance').textContent = ph < 0.5 ? 'LF + RH' : 'RF + LH';
      $('rHead').textContent = minus((rnd(n, 3) < 0.5 ? -2 : 2) * asymH(n), 1);
      $('rPelvis').textContent = minus((rnd(n, 4) < 0.5 ? -2 : 2) * asymP(n), 1);
      $('rSI').textContent = si(n).toFixed(1);
      $('rEMA').textContent = s.toFixed(1);
      $('rZ').textContent = minus(z, 2);
      $('rStatus').textContent = Math.abs(z) < 2 ? 'in range' : 'check again';
    }
    let raf = 0, userPaused = calm, visible = false;
    const loop = () => { draw(); raf = video.paused ? 0 : requestAnimationFrame(loop); };
    const toggle = $('techToggle');
    const label = () => { toggle.textContent = video.paused ? 'Play' : 'Pause'; toggle.setAttribute('aria-label', (video.paused ? 'Play' : 'Pause') + ' the clip'); };
    const sync = () => { if (visible && !userPaused) { const p = video.play(); if (p && p.catch) p.catch(() => { }); } else video.pause(); };
    video.addEventListener('play', () => { label(); if (!raf) raf = requestAnimationFrame(loop); });
    video.addEventListener('pause', () => { label(); draw(); });
    video.addEventListener('seeked', draw);
    toggle.addEventListener('click', () => { userPaused = !video.paused; sync(); });
    window.addEventListener('resize', () => { size(); draw(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; sync(); }, { threshold: 0.25 }).observe(video);
    } else { visible = true; sync(); }
    size(); draw(); label();
  }

  // The live demo only runs inside the desktop hero. On phones the hero shows a still that opens the demo full screen.
  const frame = document.getElementById('demoFrame');
  const wide = matchMedia('(min-width: 961px)');
  function loadDemo() {
    if (!frame || frame.src || !wide.matches) return;
    const fallback = () => {
      frame.style.display = 'none';
      const img = document.querySelector('.phone-fallback');
      if (img) img.style.display = 'block';
      const cap = document.querySelector('.phone-cap .for-wide');
      if (cap) cap.innerHTML = '<a class="textlink" href="app/">Open the live demo</a>';
    };
    frame.addEventListener('error', fallback);
    frame.src = frame.dataset.src;
    setTimeout(() => { try { if (!frame.contentWindow || !frame.contentWindow.GC) fallback(); } catch (e) { /* cross-origin: assume it loaded */ } }, 6000);
  }
  loadDemo();
  if (wide.addEventListener) wide.addEventListener('change', loadDemo);
})();
