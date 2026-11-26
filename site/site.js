/* Gait Check – website interactions: nav border, in-page links without history entries,
   scroll reveal, and the live demo in the desktop hero. */
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
