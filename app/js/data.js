/* Gait Check – data model, demo seed, persistence and the (simulated) gait analysis engine.
   Plain script (no modules) so the app also runs when opened straight from disk. */
(function () {
  'use strict';

  const LEGS = ['FL', 'FR', 'HL', 'HR'];
  const LEG_NAMES = { FL: 'Front left', FR: 'Front right', HL: 'Hind left', HR: 'Hind right' };
  const BASELINE_CHECKS = 4;        // checks needed before a horse has a personal range
  const FLAG_TOLERANCE = 1;         // points below the range before we alert
  const STORE_KEY = 'gaitcheck.demo.v1';
  const DAY = 86400000;

  // ---------- small utils ----------
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function daysAgo(n, h = 16, m = 42) { const d = startOfDay(Date.now() - n * DAY); d.setHours(h, m); return d.getTime(); }
  function round(n) { return Math.round(n); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function mean(a) { return a.reduce((s, x) => s + x, 0) / a.length; }
  // deterministic noise so the seed looks the same on every device
  function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ---------- seed ----------
  function seedState() {
    const rnd = seeded(7);
    const jitter = (c, amp) => round(c + (rnd() - 0.5) * 2 * amp);

    // Blume: tendon injury hind left. Flagged 9 weeks ago, rehab, back in range for the last 4 checks.
    const blumeHL = [88, 89, 90, 90, 91, 93, 94, 96, 95];
    const blumeChecks = blumeHL.map((hl, i) => {
      const weeksAgo = blumeHL.length - i;          // last seeded check: 7 days ago -> check due today
      return {
        id: 'b' + i,
        at: daysAgo(weeksAgo * 7, 16, 30 + i),
        legs: { FL: jitter(97.5, 1), FR: jitter(97, 1), HL: hl, HR: jitter(96, 1) },
        video: true,
        sentToVet: i === 0,
        source: 'seed'
      };
    });

    const lunaChecks = [5, 4, 3, 2, 1].map((w, i) => ({
      id: 'l' + i, at: daysAgo(w * 7, 9, 10), video: true, source: 'seed',
      legs: { FL: jitter(97, 1), FR: jitter(96.5, 1), HL: jitter(96, 1), HR: jitter(97, 1) }
    }));

    const carusoChecks = [3, 2, 1].map((w, i) => ({
      id: 'c' + i, at: daysAgo(w * 7, 18, 5), video: true, source: 'seed',
      legs: { FL: jitter(95, 1.5), FR: jitter(96, 1.5), HL: jitter(95.5, 1.5), HR: jitter(95, 1.5) }
    }));

    return {
      version: 1,
      owner: 'Aurelia',
      activeId: 'blume',
      nextResult: 'normal',          // presenter control: 'normal' | 'change'
      fastRecord: true,              // presenter control: record timer runs fast
      horses: [
        {
          id: 'blume', name: 'Blume', pronoun: 'she', photo: 'assets/blume.jpg', hero: 'assets/rider.jpg',
          // Blume's range was learned before the injury, so it is stored explicitly.
          baseline: { FL: { mean: 97.5, lo: 96, hi: 99 }, FR: { mean: 97, lo: 95, hi: 99 }, HL: { mean: 95, lo: 93, hi: 97 }, HR: { mean: 96, lo: 94, hi: 98 } },
          checks: blumeChecks,
          vet: { name: 'Dr. Berger', clinic: 'Equine clinic', initials: 'DB' },
          training: { startedAt: daysAgo(3), sessions: [{ at: daysAgo(3, 17, 0), type: 'walk' }, { at: daysAgo(1, 17, 0), type: 'walk' }] },
          history: 'In her last two comebacks, her hind left slipped in week 2 to 3.'
        },
        { id: 'luna', name: 'Luna', pronoun: 'she', photo: null, baseline: null, checks: lunaChecks, vet: null, training: null },
        { id: 'caruso', name: 'Caruso', pronoun: 'he', photo: null, baseline: null, checks: carusoChecks, vet: null, training: null }
      ],
      sentReports: [],
      invites: []
    };
  }

  // ---------- persistence ----------
  let state;
  const listeners = [];
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { const s = JSON.parse(raw); if (s && s.version === 1) return s; }
    } catch (e) { /* private mode etc. – fall back to seed */ }
    return seedState();
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { } }
  function commit() { save(); listeners.forEach(fn => fn(state)); }
  function reset() { state = seedState(); commit(); }
  state = load();

  // ---------- derived data ----------
  const P = h => h.pronoun === 'he'
    ? { sub: 'he', obj: 'him', pos: 'his', Sub: 'He' }
    : { sub: 'she', obj: 'her', pos: 'her', Sub: 'She' };

  function horse(id) { return state.horses.find(h => h.id === id); }
  function active() { return horse(state.activeId) || state.horses[0]; }
  function checksOf(h) { return h.checks.slice().sort((a, b) => a.at - b.at); }
  function lastCheck(h) { const c = checksOf(h); return c[c.length - 1] || null; }

  /** Personal baseline: stored, or learned from the first BASELINE_CHECKS checks (mean ± max(1.5, 2·sd)). */
  function baselineOf(h) {
    if (h.baseline) return h.baseline;
    const c = checksOf(h);
    if (c.length < BASELINE_CHECKS) return null;
    const first = c.slice(0, BASELINE_CHECKS);
    const out = {};
    LEGS.forEach(l => {
      const v = first.map(x => x.legs[l]);
      const m = mean(v);
      const sd = Math.sqrt(mean(v.map(x => (x - m) ** 2)));
      const w = Math.max(1.5, 2 * sd);
      out[l] = { mean: m, lo: round(m - w), hi: Math.min(100, round(m + w)) };
    });
    return out;
  }
  function overallBand(b) {
    return { mean: mean(LEGS.map(l => b[l].mean)), lo: round(mean(LEGS.map(l => b[l].lo))), hi: round(mean(LEGS.map(l => b[l].hi))) };
  }
  function score(check) { return round(mean(LEGS.map(l => check.legs[l]))); }

  /** Evaluate a check against the horse's range. */
  function evaluate(h, check) {
    const b = baselineOf(h);
    if (!b) return { learning: true, flaggedLegs: [], inRange: true, legs: {} };
    const legs = {};
    const flaggedLegs = [];
    LEGS.forEach(l => {
      const v = check.legs[l];
      const r = b[l];
      const out = v < r.lo - FLAG_TOLERANCE;
      const inR = v >= r.lo - FLAG_TOLERANCE;
      legs[l] = { value: v, delta: round(v - r.mean), out, inRange: inR };
      if (out) flaggedLegs.push(l);
    });
    return { learning: false, flaggedLegs, inRange: flaggedLegs.length === 0, legs };
  }

  /** Status label for one check in a series, like the History screen. */
  function statusFor(h, checks, i, leg) {
    const b = baselineOf(h);
    if (!b) return { key: 'learning', label: 'Learning range' };
    const val = c => leg ? c.legs[leg] : score(c);
    const lo = leg ? b[leg].lo : overallBand(b).lo;
    const isOut = c => leg ? evaluate(h, c).legs[leg].out : !evaluate(h, c).inRange;
    const c = checks[i];
    if (isOut(c)) {
      const prev = checks[i - 1];
      if (prev && isOut(prev) && val(c) > val(prev)) return { key: 'improving', label: 'Improving' };
      if (prev && isOut(prev)) return { key: 'out', label: 'Out of range' };
      return { key: 'flag', label: c.sentToVet ? 'Flagged · sent to vet' : 'Flagged' };
    }
    const prev = checks[i - 1];
    if (prev && isOut(prev)) return { key: 'back', label: 'Back in range' };
    return { key: 'ok', label: 'In range' };
  }

  /** How many most recent checks in a row were in range on all four legs. */
  function streak(h) {
    const c = checksOf(h);
    let n = 0;
    for (let i = c.length - 1; i >= 0; i--) { if (evaluate(h, c[i]).inRange) n++; else break; }
    return n;
  }
  function readyToTrain(h) { return !!baselineOf(h) && streak(h) >= 4 && h.checks.some(c => !evaluate(h, c).inRange); }

  function dueInfo(h) {
    const lc = lastCheck(h);
    if (!lc) return { due: true, days: 0, label: 'First check due today' };
    const days = Math.floor((startOfDay(Date.now()) - startOfDay(lc.at)) / DAY);
    const interval = h.training ? 3 : 7;   // twice a week while building up after rehab
    const next = interval - days;
    if (days === 0) return { due: false, checkedToday: true, label: 'checked today', next: interval };
    if (next <= 0) return { due: true, label: interval === 7 ? 'Weekly check due today' : 'Check due today' };
    return { due: false, label: 'next check in ' + next + (next === 1 ? ' day' : ' days'), next };
  }
  function nextCheckDay(h) {
    const lc = lastCheck(h);
    const interval = h.training ? 3 : 7;
    const d = new Date((lc ? lc.at : Date.now()) + interval * DAY);
    return d.toLocaleDateString('en-GB', { weekday: 'long' });
  }

  // ---------- the analysis engine (simulated) ----------
  /**
   * Turns a recording into per-leg symmetry values. In the real product this is the
   * pose-tracking model; for the demo it produces plausible values around the horse's
   * own range, or a hind-left drop when the presenter picked "change".
   */
  function analyse(h, mode) {
    const b = baselineOf(h);
    const rnd = Math.random;
    const legs = {};
    LEGS.forEach(l => {
      const m = b ? b[l].mean : 96;
      const lo = b ? b[l].lo : 93, hi = b ? b[l].hi : 99;
      legs[l] = clamp(round(m + (rnd() - 0.5) * 2), lo, hi);
    });
    if (mode === 'change' && b) legs.HL = round(b.HL.mean - 7);
    return legs;
  }

  function addCheck(h, legs, extra) {
    const c = Object.assign({ id: 'n' + Date.now(), at: Date.now(), legs, video: true, source: 'live' }, extra || {});
    h.checks.push(c);
    commit();
    return c;
  }
  /** Replace any check made today (used by presenter scenes so jumping around stays tidy). */
  function setTodayCheck(h, legs) {
    const today = startOfDay(Date.now()).getTime();
    h.checks = h.checks.filter(c => c.at < today);
    return addCheck(h, legs, { source: 'scene' });
  }

  function addHorse(name, pronoun) {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
    state.horses.push({ id, name, pronoun, photo: null, baseline: null, checks: [], vet: null, training: null });
    commit();
    return id;
  }

  window.GC = window.GC || {};
  Object.assign(window.GC, {
    LEGS, LEG_NAMES, BASELINE_CHECKS, DAY,
    get state() { return state; },
    commit, reset, onChange: fn => listeners.push(fn),
    horse, active, checksOf, lastCheck, baselineOf, overallBand, score, evaluate, statusFor,
    streak, readyToTrain, dueInfo, nextCheckDay, analyse, addCheck, setTodayCheck, addHorse, P,
    startOfDay, round, mean
  });
})();
