/* GaitCheck – small SVG line chart with the horse's personal range as a band.
   Charts are interactive: drag or tap across a chart to read individual checks. */
(function () {
  'use strict';
  const registry = new Map();
  let uid = 0;

  const C = { ink: '#151515', green: '#4F5E33', red: '#B83A2E', band: '#E8DFD0', grid: '#DDD7CA', muted: '#6B665C', paper: '#FBFAF6' };

  function fmtDate(t) {
    const d = new Date(t);
    const today = GC.startOfDay(Date.now()).getTime();
    if (t >= today) return 'Today';
    if (t >= today - GC.DAY) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  /**
   * opts: { points:[{t, v, flag}], band:{lo,hi}|null, yMin, yMax, height, startLabel, endLabel, compact }
   */
  function line(opts) {
    const id = 'ch' + (++uid);
    const W = 340, H = opts.height || 190;
    const padL = 8, padR = opts.compact ? 8 : 34, padT = 12, padB = opts.compact ? 8 : 26;
    const pts = opts.points;
    const vals = pts.map(p => p.v);
    const yMin = opts.yMin != null ? opts.yMin : Math.floor(Math.min(...vals, opts.band ? opts.band.lo : 100) / 5) * 5 - (opts.pad || 0);
    const yMax = opts.yMax != null ? opts.yMax : 100;
    const x = i => pts.length === 1 ? (padL + (W - padR)) / 2 : padL + 8 + (i * (W - padR - padL - 16)) / (pts.length - 1);
    const y = v => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);

    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="${opts.label || 'Symmetry over time'}">`;
    // grid
    if (!opts.compact) {
      for (let g = yMin; g <= yMax; g += 5) {
        s += `<line x1="${padL}" x2="${W - padR + 4}" y1="${y(g)}" y2="${y(g)}" stroke="${C.grid}" stroke-width="1"/>`;
        s += `<text x="${W - padR + 8}" y="${y(g) + 4}" font-size="11" fill="${C.muted}">${g}</text>`;
      }
    }
    // band
    if (opts.band) {
      const top = y(Math.min(yMax, opts.band.hi)), bot = y(Math.max(yMin, opts.band.lo));
      s += `<rect x="${padL}" y="${top}" width="${W - padR - padL}" height="${Math.max(2, bot - top)}" rx="6" fill="${C.band}" class="band"/>`;
    }
    // segments (red when going into a flagged point)
    for (let i = 1; i < pts.length; i++) {
      const col = pts[i].flag && !pts[i - 1].flag ? C.red : C.ink;
      s += `<line class="seg" style="--d:${i * 60}ms" x1="${x(i - 1)}" y1="${y(pts[i - 1].v)}" x2="${x(i)}" y2="${y(pts[i].v)}" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    // points
    pts.forEach((p, i) => {
      const last = i === pts.length - 1;
      const fill = p.flag ? C.red : last ? C.green : C.paper;
      const stroke = p.flag ? C.red : last ? C.green : C.ink;
      const r = last || p.flag ? 6 : 4.5;
      s += `<circle class="pt" style="--d:${i * 60}ms" cx="${x(i)}" cy="${y(p.v)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
    });
    // scrub cursor
    s += `<g class="cursor" opacity="0"><line y1="${padT}" y2="${H - padB}" stroke="${C.muted}" stroke-dasharray="3 3"/><circle r="8" fill="none" stroke="${C.green}" stroke-width="2"/></g>`;
    if (!opts.compact) {
      s += `<text x="${padL}" y="${H - 6}" font-size="11" fill="${C.muted}">${opts.startLabel || fmtDate(pts[0].t)}</text>`;
      s += `<text x="${W - padR}" y="${H - 6}" font-size="11" fill="${C.muted}" text-anchor="end">${opts.endLabel || fmtDate(pts[pts.length - 1].t)}</text>`;
    }
    s += '</svg>';
    registry.set(id, { pts, x, y, W, label: opts.tipLabel || '' });
    return `<div class="chart" data-chart="${id}">${s}<div class="tip" hidden></div></div>`;
  }

  // one delegated handler for every chart
  function bind(root) {
    const move = e => {
      const el = e.target.closest('.chart'); if (!el) return;
      const c = registry.get(el.dataset.chart); if (!c) return;
      const svg = el.querySelector('svg');
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * c.W;
      let best = 0, bd = 1e9;
      c.pts.forEach((p, i) => { const d = Math.abs(c.x(i) - px); if (d < bd) { bd = d; best = i; } });
      const p = c.pts[best];
      const cur = svg.querySelector('.cursor');
      cur.setAttribute('opacity', '1');
      cur.querySelector('line').setAttribute('x1', c.x(best)); cur.querySelector('line').setAttribute('x2', c.x(best));
      const ci = cur.querySelector('circle'); ci.setAttribute('cx', c.x(best)); ci.setAttribute('cy', c.y(p.v));
      const tip = el.querySelector('.tip');
      tip.hidden = false;
      tip.innerHTML = `<b>${p.v}</b> ${fmtDate(p.t)}${p.flag ? ' · <span class="red">flagged</span>' : ''}`;
      const leftPct = (c.x(best) / c.W) * 100;
      tip.style.left = `clamp(8px, calc(${leftPct}% - 50px), calc(100% - 110px))`;
    };
    const leave = e => {
      const el = e.target;
      if (!el.classList || !el.classList.contains('chart')) return;
      el.querySelector('.cursor').setAttribute('opacity', '0');
      el.querySelector('.tip').hidden = true;
    };
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerdown', move);
    root.addEventListener('pointerleave', leave, true);
  }

  /** Tiny sparkline used on cards. */
  function spark(values, band) {
    const W = 96, H = 40, lo = Math.min(...values, band ? band.lo : 100) - 2, hi = 100;
    const x = i => 4 + (i * (W - 10)) / Math.max(1, values.length - 1);
    const y = v => 4 + (1 - (v - lo) / (hi - lo)) * (H - 8);
    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">`;
    if (band) s += `<rect x="0" y="${y(band.hi)}" width="${W}" height="${y(band.lo) - y(band.hi)}" rx="4" fill="${C.band}"/>`;
    s += `<polyline points="${values.map((v, i) => x(i) + ',' + y(v)).join(' ')}" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<circle cx="${x(values.length - 1)}" cy="${y(values[values.length - 1])}" r="3.5" fill="${C.green}"/></svg>`;
    return s;
  }

  GC.charts = { line, spark, bind, fmtDate, C };
})();
