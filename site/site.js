/* Gait Check – website interactions: sticky nav border, scroll reveal, demo iframe fallback. */
(function () {
  'use strict';
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const els = document.querySelectorAll('.reveal, .chart-card');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  } else {
    els.forEach(el => el.classList.add('in'));
  }

  // If the embedded demo can't load (e.g. opened from disk with strict settings), show a screenshot instead.
  const frame = document.getElementById('demoFrame');
  if (frame) {
    const fallback = () => {
      frame.style.display = 'none';
      const img = document.querySelector('.phone-fallback');
      if (img) img.style.display = 'block';
      const cap = document.querySelector('.phone-cap');
      if (cap) cap.innerHTML = '<a class="textlink" href="app/">Open the live demo →</a>';
    };
    frame.addEventListener('error', fallback);
    setTimeout(() => { try { if (!frame.contentWindow || !frame.contentWindow.GC) fallback(); } catch (e) { /* cross-origin: assume it loaded */ } }, 6000);
  }
})();
