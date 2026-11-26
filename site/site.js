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

  // Under the hood: the tracking clip plays while it is on screen. The readout next to it stays calm:
  // it updates once every four strides and adds one point to the chart. The values are simulated from
  // the clip time (no real measurement), so they are stable and loop cleanly.
  const video = document.getElementById('techVideo');
  const readout = document.querySelector('.readout');
  if (video && readout) {
    const $ = id => document.getElementById(id);
    const STRIDE = 0.72, PER = 4, SLOTS = 8, LO = 94.5, HI = 97.5;
    const rnd = (n, k) => { const x = Math.sin(n * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
    const avg = (w, f) => { let s = 0; for (let i = 0; i < PER; i++) s += f(w * PER + i); return s / PER; };
    const headOf = w => avg(w, n => 1.0 + 3.2 * rnd(n, 1));           // mm, difference between the two halves of a stride
    const pelvisOf = w => avg(w, n => 1.0 + 2.8 * rnd(n, 2));
    const siOf = w => 100 - 1.6 * pelvisOf(w);                       // symmetry score of the window
    const X = i => 16 + i * (288 / (SLOTS - 1));
    const Y = v => 34 + (HI - v) / (HI - LO) * 42;                    // band spans y 34..76 in the chart
    let shown = -2;
    function render(done) {                                           // done = number of finished windows
      if (done === shown) return;
      const first = shown === -2; shown = done;
      const paint = () => {
        const w = done - 1;
        $('rStride').textContent = done * PER;
        $('rSI').textContent = done ? siOf(w).toFixed(1) : '–';
        $('rHead').textContent = done ? headOf(w).toFixed(1) : '–';
        $('rPelvis').textContent = done ? pelvisOf(w).toFixed(1) : '–';
        $('rStatus').textContent = !done ? 'Reading the first strides' : (siOf(w) >= LO ? 'Within usual range' : 'Below usual range');
        const pts = []; for (let i = 0; i < Math.min(done, SLOTS); i++) pts.push([X(i), Y(siOf(i))]);
        $('rLine').setAttribute('points', pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '));
        $('rPts').innerHTML = pts.map((p, i) => '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5"' + (i === pts.length - 1 ? ' class="now"' : '') + '/>').join('');
        readout.classList.remove('tick');
      };
      if (first || calm) { paint(); return; }
      readout.classList.add('tick'); setTimeout(paint, 350);          // soft fade between updates
    }
    // The first value is there from the start, so the card never shows an empty state.
    const update = () => render(Math.min(SLOTS, Math.floor((video.currentTime || 0) / (STRIDE * PER)) + 1));
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
