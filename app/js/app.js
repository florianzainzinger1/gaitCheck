/* Gait Check – router, phone stage, presenter panel and demo scenes. */
(function () {
  'use strict';
  const S = GC.screens;
  const view = document.getElementById('view');
  let current = null, currentName = '';

  // ---------- router ----------
  function parse() {
    const raw = (location.hash || '#/today').replace(/^#\/?/, '');
    const [name, qs] = raw.split('?');
    const q = {}; (qs || '').split('&').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); q[k] = decodeURIComponent(v || ''); });
    return { name: S[name] ? name : 'today', q };
  }
  function render(anim) {
    const { name, q } = parse();
    if (current && current.unmount) current.unmount();
    current = S[name];
    view.innerHTML = current.render(q);
    const el = view.firstElementChild;
    if (anim && el) el.classList.add(anim);
    if (current.mount) current.mount(el, q);
    document.body.dataset.screen = name;
    currentName = name;
    markPresenter(name);
  }
  // History stays shallow: the home screen is the only stop. Leaving home adds one entry, every
  // further screen replaces it, and going home pops it again. So "back" reaches home in one press
  // however much you tapped around. Embedded in the website's hero, the demo adds no entries at all.
  const HOME = 'today';
  const embedded = window.self !== window.top;
  const router = {
    go(to) {
      const target = '#/' + to;
      if (location.hash === target) { render('enter'); return; }
      const toHome = to.split('?')[0] === HOME;
      const deep = history.state && history.state.gcDeep;
      if (toHome && deep && !embedded) { history.back(); return; }   // hashchange renders
      if (currentName === HOME && !toHome && !embedded) history.pushState({ gcDeep: true }, '', target);
      else history.replaceState(history.state, '', target);
      render('enter');
    },
    refresh() { const st = view.querySelector('.pad'); const y = st ? st.scrollTop : 0; render(); const n = view.querySelector('.pad'); if (n) n.scrollTop = y; }
  };
  GC.router = router;
  window.addEventListener('hashchange', () => render('enter'));

  // ---------- delegated clicks ----------
  document.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go && !go.disabled && view.contains(go)) { e.preventDefault(); router.go(go.dataset.go); return; }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'sheet-close') GC.ui.closeSheet();
    if (act.dataset.act === 'switch-horse') GC.sheets.switchHorse();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') GC.ui.closeSheet(); });
  GC.charts.bind(view);

  // ---------- phone stage ----------
  const phone = document.getElementById('phone');
  function layout() {
    const mobile = window.innerWidth < 760 || new URLSearchParams(location.search).has('app') || matchMedia('(display-mode: standalone)').matches;
    document.body.classList.toggle('mobile', mobile);
    if (mobile) { phone.style.transform = ''; return; }
    const sc = Math.min(1, (window.innerHeight - 48) / 844);
    phone.style.transform = `scale(${sc})`;
    document.getElementById('wrap').style.width = 390 * sc + 'px';
    document.getElementById('wrap').style.height = 844 * sc + 'px';
  }
  window.addEventListener('resize', layout);
  layout();
  function clock() { const el = document.getElementById('sbTime'); if (el) el.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  setInterval(clock, 15000); clock();

  // ---------- demo scenes (presenter) ----------
  const blume = () => GC.horse('blume');
  function useBlume() { GC.state.activeId = 'blume'; }
  function clearToday(h) { const t = GC.startOfDay(Date.now()).getTime(); h.checks = h.checks.filter(c => c.at < t); }
  function ensureReport() {
    const h = blume();
    const r = { id: 'demo01', horseId: h.id, at: Date.now(), include: { data: true, videos: true, notes: true }, note: 'Hind left flagged today. She was ridden lightly on Sunday, nothing unusual.', vet: h.vet };
    GC.state.sentReports = GC.state.sentReports.filter(x => x.id !== 'demo01').concat(r);
  }
  const SCENES = [
    { key: 'today', n: 'Today', note: 'Meet Blume. Lame for more than a year – the home screen shows how she moves today.', run() { useBlume(); clearToday(blume()); GC.commit(); router.go('today'); } },
    { key: 'record', n: 'Record the trot', note: '30 seconds of trotting, once a week. Just the phone – no sensors, no extra equipment.', run() { useBlume(); GC.commit(); router.go('record'); } },
    { key: 'result', n: 'Result', note: 'The AI learns her personal baseline and gives a symmetry value per leg.', run() { useBlume(); GC.setTodayCheck(blume(), GC.analyse(blume(), 'normal')); router.go('result'); } },
    { key: 'change', n: 'Change detected', note: 'If something changes, you get an alert right away – before you can see it.', run() { useBlume(); GC.setTodayCheck(blume(), GC.analyse(blume(), 'change')); router.go('change'); setTimeout(() => GC.ui.toast({ title: 'Hind left looks different', body: "from Blume's usual pattern.", go: 'change' }), 400); } },
    { key: 'vet', n: 'Send to vet', note: 'One tap shares the whole movement history – real data instead of "she seems a bit off".', run() { useBlume(); if (!GC.evaluate(blume(), GC.lastCheck(blume())).flaggedLegs.length) GC.setTodayCheck(blume(), GC.analyse(blume(), 'change')); router.go('vet'); } },
    { key: 'report', n: "Vet's report", note: 'The vet opens a secure link in any browser – no app needed.', run() { useBlume(); if (!GC.evaluate(blume(), GC.lastCheck(blume())).flaggedLegs.length) GC.setTodayCheck(blume(), GC.analyse(blume(), 'change')); ensureReport(); GC.commit(); router.go('report?r=demo01'); } },
    { key: 'history', n: 'History', note: 'Hind left over ten weeks: flagged, rehab, back in her range.', run() { useBlume(); GC.setTodayCheck(blume(), GC.analyse(blume(), 'normal')); router.go('history?leg=HL'); } },
    { key: 'training', n: 'Back to training', note: 'The question we could never answer: is she ready to train again?', run() { useBlume(); GC.setTodayCheck(blume(), GC.analyse(blume(), 'normal')); router.go('training'); } },
    { key: 'baseline', n: 'Learning the baseline', note: 'Every horse moves differently, so Gait Check compares each horse only with itself.', run() { GC.state.activeId = 'caruso'; GC.commit(); router.go('baseline'); } },
    { key: 'horses', n: 'Stable view', note: 'Stables and trainers look after many horses at once.', run() { useBlume(); GC.commit(); router.go('horses'); } }
  ];
  const SCREEN_TO_SCENE = { today: 'today', record: 'record', analysing: 'record', result: 'result', change: 'change', vet: 'vet', sent: 'vet', report: 'report', history: 'history', training: 'training', baseline: 'baseline', horses: 'horses' };
  let sceneIdx = 0;

  const list = document.getElementById('scenes');
  list.innerHTML = SCENES.map((s, i) => `<li><button data-scene="${i}"><span class="sn">${i + 1}</span>${s.n}</button></li>`).join('');
  list.addEventListener('click', e => { const b = e.target.closest('[data-scene]'); if (b) runScene(+b.dataset.scene); });
  function runScene(i) { sceneIdx = (i + SCENES.length) % SCENES.length; document.body.classList.remove('show-side'); GC.ui.closeSheet(); GC.ui.hideToast(); SCENES[sceneIdx].run(); }
  function markPresenter(name) {
    const key = SCREEN_TO_SCENE[name];
    const i = SCENES.findIndex(s => s.key === key);
    if (i >= 0) sceneIdx = i;
    list.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i));
    const note = document.getElementById('note');
    if (note) note.textContent = i >= 0 ? SCENES[i].note : '';
  }

  // presenter controls
  const nextSeg = document.getElementById('nextSeg');
  function syncControls() {
    nextSeg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.next === GC.state.nextResult));
    document.getElementById('fast').checked = !!GC.state.fastRecord;
  }
  nextSeg.addEventListener('click', e => { const b = e.target.closest('[data-next]'); if (!b) return; GC.state.nextResult = b.dataset.next; GC.commit(); syncControls(); });
  document.getElementById('fast').addEventListener('change', e => { GC.state.fastRecord = e.target.checked; GC.commit(); });
  document.getElementById('resetDemo').addEventListener('click', () => { GC.reset(); syncControls(); router.go('today'); GC.ui.snack('Demo data reset'); });
  syncControls();

  document.addEventListener('keydown', e => {
    if (e.target.matches('input,textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); runScene(sceneIdx + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); runScene(sceneIdx - 1); }
    else if (e.key.toLowerCase() === 'c') { GC.state.nextResult = GC.state.nextResult === 'change' ? 'normal' : 'change'; GC.commit(); syncControls(); GC.ui.snack('Next recording: ' + (GC.state.nextResult === 'change' ? 'hind left change' : 'in range')); }
    else if (e.key.toLowerCase() === 'r' && e.shiftKey) { GC.reset(); syncControls(); router.go('today'); GC.ui.snack('Demo data reset'); }
  });

  // hidden mobile presenter: long-press the status bar / triple-tap the brand to open controls
  let taps = 0, tapT;
  document.addEventListener('click', e => {
    if (!document.body.classList.contains('mobile') || !e.target.closest('.brand')) return;
    taps++; clearTimeout(tapT); tapT = setTimeout(() => taps = 0, 600);
    if (taps >= 3) { taps = 0; document.body.classList.toggle('show-side'); }
  });
  document.getElementById('closeSide').addEventListener('click', () => document.body.classList.remove('show-side'));

  // ---------- offline (service worker) ----------
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  }

  render();
})();
