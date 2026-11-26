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

  // Under the hood: the tracking clip plays while it is on screen. Next to it, the two curves the method
  // is built on: vertical movement of head and pelvis over one stride, averaged over four strides. Each
  // curve has two dips (one per diagonal); the gap between them is MinDiff. Curves and numbers update
  // once every four strides. All values are simulated from the clip time, so they loop cleanly.
  const video = document.getElementById('techVideo');
  const readout = document.querySelector('.readout');
  if (video && readout) {
    const $ = id => document.getElementById(id);
    const STRIDE = 0.72, PER = 4, ALPHA = 0.30, LO = 94.5;
    const rnd = (n, k) => { const x = Math.sin(n * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
    const avg = (w, k, base, span) => { let s = 0; for (let i = 0; i < PER; i++) s += base + span * rnd(w * PER + i, k); return s / PER; };
    const PARTS = {
      head: { svg: 'cHead', out: 'rHead', amp: 22, k: 1, diff: w => avg(w, 1, 1.0, 3.2), names: ['left fore', 'right fore'] },
      pelvis: { svg: 'cPelvis', out: 'rPelvis', amp: 30, k: 2, diff: w => avg(w, 2, 1.0, 2.8), names: ['left hind', 'right hind'] }
    };
    const siOf = w => 100 * (1 - PARTS.pelvis.diff(w) / (2 * PARTS.pelvis.amp));
    const minus = v => (v < 0 ? '−' : v > 0 ? '+' : '') + Math.abs(v);
    // chart geometry (viewBox 320 x 150)
    const X0 = 34, X1 = 312, Y0 = 10, Y1 = 118;
    function curve(part, w) {
      const A = part.amp, d = part.diff(w), a = d / 2 * (rnd(w, part.k + 5) < 0.5 ? -1 : 1), lim = A + 5;
      const x = ph => X0 + ph * (X1 - X0), y = mm => Y0 + (lim - mm) / (2 * lim) * (Y1 - Y0);
      const f = ph => A * Math.cos(4 * Math.PI * ph) - a * Math.sin(2 * Math.PI * ph);     // dips at 25 % and 75 % of the stride
      let path = ''; for (let i = 0; i <= 80; i++) path += (i ? 'L' : 'M') + x(i / 80).toFixed(1) + ' ' + y(f(i / 80)).toFixed(1);
      const yL = y(f(0.25)), yR = y(f(0.75)), xg = x(0.5);
      const tick = mm => '<line class="ax" x1="' + X0 + '" x2="' + X1 + '" y1="' + y(mm).toFixed(1) + '" y2="' + y(mm).toFixed(1) + '"/><text class="lab" x="' + (X0 - 6) + '" y="' + (y(mm) + 3).toFixed(1) + '" text-anchor="end">' + minus(mm) + '</text>';
      $(part.svg).innerHTML = tick(A) + tick(0) + tick(-A) +
        '<line class="lvl" x1="' + x(0.25) + '" x2="' + x(0.75) + '" y1="' + yL.toFixed(1) + '" y2="' + yL.toFixed(1) + '"/>' +
        '<line class="lvl" x1="' + x(0.25) + '" x2="' + x(0.75) + '" y1="' + yR.toFixed(1) + '" y2="' + yR.toFixed(1) + '"/>' +
        '<path class="trace" d="' + path + '"/>' +
        '<circle class="pt" cx="' + x(0.25) + '" cy="' + yL.toFixed(1) + '" r="4"/><circle class="pt" cx="' + x(0.75) + '" cy="' + yR.toFixed(1) + '" r="4"/>' +
        '<line class="gap" x1="' + xg + '" x2="' + xg + '" y1="' + Math.min(yL, yR).toFixed(1) + '" y2="' + Math.max(yL, yR).toFixed(1) + '"/>' +
        '<text class="gaplab" x="' + xg + '" y="' + (Math.min(yL, yR) - 7).toFixed(1) + '" text-anchor="middle">MinDiff</text>' +
        '<text class="lab" x="' + x(0.25) + '" y="' + (Y1 + 22) + '" text-anchor="middle">' + part.names[0] + '</text>' +
        '<text class="lab" x="' + x(0.75) + '" y="' + (Y1 + 22) + '" text-anchor="middle">' + part.names[1] + '</text>' +
        '<text class="lab" x="' + (X0 - 6) + '" y="' + (Y1 + 22) + '" text-anchor="end">mm</text>';
      $(part.out).textContent = d.toFixed(1);
    }
    readout.querySelectorAll('svg, figcaption i, .r-tiles b').forEach(el => el.classList.add('fade'));
    let shown = -1;
    function render(w) {                                              // w = index of the four-stride window
      if (w === shown) return;
      const first = shown < 0; shown = w;
      const paint = () => {
        curve(PARTS.head, w); curve(PARTS.pelvis, w);
        let s = siOf(0); for (let i = 1; i <= w; i++) s = ALPHA * siOf(i) + (1 - ALPHA) * s;
        $('rStride').textContent = (w * PER + 1) + '–' + (w * PER + PER);
        $('rSI').textContent = siOf(w).toFixed(1);
        $('rS').textContent = s.toFixed(1);
        $('rStatus').textContent = s >= LO ? 'within' : 'below';
        readout.classList.remove('tick');
      };
      if (first || calm) { paint(); return; }
      readout.classList.add('tick'); setTimeout(paint, 350);          // soft fade between updates
    }
    const update = () => {
      const t = video.currentTime || 0;
      $('hudStride').textContent = Math.floor(t / STRIDE) + 1;
      render(Math.floor(t / (STRIDE * PER)));
    };
    let userPaused = calm, visible = false;
    const toggle = $('techToggle');
    const label = () => { toggle.textContent = video.paused ? 'Play' : 'Pause'; toggle.setAttribute('aria-label', (video.paused ? 'Play' : 'Pause') + ' the clip'); };
    const sync = () => { if (visible && !userPaused) { const p = video.play(); if (p && p.catch) p.catch(() => { }); } else video.pause(); };
    video.addEventListener('timeupdate', update);
    video.addEventListener('seeked', update);
    video.addEventListener('play', label);
    video.addEventListener('pause', label);
    toggle.addEventListener('click', () => { userPaused = !video.paused; sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; sync(); }, { threshold: 0.25 }).observe(video);
    } else { visible = true; sync(); }
    update(); label();
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
