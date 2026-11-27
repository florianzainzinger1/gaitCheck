/* GaitCheck – screens. Each screen returns HTML from current state; `mount` wires up anything live. */
(function () {
  'use strict';
  const { esc, I, avatar } = GC.ui;
  const ch = GC.charts;
  const L = GC.LEG_NAMES;

  // ---------- shared helpers ----------
  function when(t) {
    const d = new Date(t);
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const day = ch.fmtDate(t);
    return (day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : day) + ', ' + time;
  }
  const tabs = on => `<nav class="tabs" aria-label="Main">
    ${[['today', 'Today', 'home'], ['record', 'Record', 'record'], ['history', 'History', 'history'], ['horses', 'Horses', 'horses']]
      .map(([r, n, ic]) => `<button data-go="${r}" class="${on === r ? 'on' : ''}" ${on === r ? 'aria-current="page"' : ''}>${I[ic]()}${n}</button>`).join('')}
  </nav>`;
  const back = (to, title) => `<div class="hdr"><button class="back" data-go="${to}" aria-label="Back">${I.chevL()}</button><h2 class="t">${title}</h2></div>`;
  const recent = (h, n) => GC.checksOf(h).slice(-n);
  const sd = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);

  function flaggedOf(h) {
    const lc = GC.lastCheck(h);
    if (!lc) return null;
    const ev = GC.evaluate(h, lc);
    if (!ev.flaggedLegs.length) return null;
    // the leg furthest from its range
    const leg = ev.flaggedLegs.slice().sort((a, b) => ev.legs[a].delta - ev.legs[b].delta)[0];
    return { check: lc, ev, leg };
  }

  function heroFor(h, cls = 'hero') {
    if (h.hero || h.photo) return `<img class="${cls}" src="${h.hero || h.photo}" alt="${esc(h.name)}">`;
    return `<div class="${cls} hero-blank"><span>${esc(h.name[0])}</span></div>`;
  }

  // =====================================================================
  const S = {};

  // ---------- TODAY ----------
  S.today = {
    tab: 'today',
    render() {
      const h = GC.active(), p = GC.P(h), b = GC.baselineOf(h);
      const due = GC.dueInfo(h);
      const lc = GC.lastCheck(h);
      const fl = flaggedOf(h);
      let cards = '';

      if (!b) {
        const n = h.checks.length;
        cards += `<button class="card tap learn" data-go="baseline">
          <div><div class="lbl">Getting to know ${esc(h.name)}</div>
          <div class="big-sub">Check ${n} of ${GC.BASELINE_CHECKS}</div>
          <div class="bars">${[0, 1, 2, 3].map(i => `<span class="bar ${i < n ? 'on' : ''}"></span>`).join('')}</div></div>${I.chevR()}</button>`;
      } else if (fl) {
        cards += `<button class="card tap alert" data-go="change">
          <span class="alert-ic">${I.history({ stroke: '#FFF', s: 20 })}</span>
          <span class="grow"><b>${L[fl.leg]} looks different</b><span>${sd(fl.ev.legs[fl.leg].delta)} vs. ${p.pos} usual range · ${when(fl.check.at)}</span></span>${I.chevR()}</button>`;
      } else if (lc) {
        const vals = recent(h, 7).map(GC.score);
        cards += `<button class="card tap sym" data-go="result">
          <div><div class="lbl">Symmetry</div><div class="score"><span class="num">${GC.score(lc)}</span><span class="muted">within ${p.pos} usual range</span></div></div>
          ${ch.spark(vals, GC.overallBand(b))}</button>`;
      }
      if (b && !fl && GC.readyToTrain(h)) {
        cards += `<button class="card tap ready" data-go="training"><span class="ck big">${I.check({ stroke: '#FFF', s: 18, w: 2.5 })}</span>
          <span class="grow"><b>Ready to train again</b><span>Back in ${p.pos} range for ${GC.streak(h)} checks in a row</span></span>${I.chevR()}</button>`;
      }

      const sub = due.checkedToday ? `Check done today · next one ${GC.nextCheckDay(h)}` : due.due ? due.label : `Last check ${when(lc.at)}`;
      const subCls = due.due && !due.checkedToday ? 'amber b' : 'muted';
      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
      return `<section class="scr today">
        ${heroFor(h, 'hero today-hero')}
        <div class="brand"><div class="brand-t">GaitCheck</div><div class="brand-s">${greet}, ${esc(GC.state.owner)}</div></div>
        <div class="sheet-card">
          <button class="row horse-switch" data-act="switch-horse">${avatar(h, 44)}<div class="grow"><div class="h-name">${esc(h.name)}</div><div class="sm ${subCls}">${esc(sub)}</div></div>${GC.state.horses.length > 1 ? `<span class="muted sm switch">Switch</span>` : ''}</button>
          ${cards}
          <button class="btn green mt-auto" data-go="record">${I.recordFill({ stroke: '#FFF', s: 20 })}${fl ? 'Film again' : b ? "Record today's trot" : `Record check ${Math.min(h.checks.length + 1, 4)} of 4`}</button>
        </div>
        ${tabs('today')}
      </section>`;
    }
  };

  // ---------- RECORD ----------
  // The demo footage is a landscape clip (848×384) with the tracking points already drawn in.
  // It is shown whole, with black bars above and below, and plays while the recording runs.
  const CLIP = 'assets/tracking.mp4', CLIP_STILL = 'assets/tracking.jpg';
  const clipVideo = id => `<video class="clip" id="${id}" src="${CLIP}" poster="${CLIP_STILL}" muted loop playsinline preload="metadata" aria-label="Demo footage: a horse trotting past the camera with tracking points on head, body and legs"></video>`;
  const playClip = v => { if (!v) return; const p = v.play(); if (p && p.catch) p.catch(() => { }); };

  let rec = null; // live recording session
  S.record = {
    full: true,
    render() {
      const h = GC.active();
      return `<section class="scr record">
        <div class="vf" id="vf">
          ${clipVideo('vfVid')}
        </div>
        <div class="rec-top">
          <button class="round" data-go="today" aria-label="Close">${I.close({ stroke: '#FFF' })}</button>
          <span class="chip">Trot · in hand</span>
          <span class="round ghost" aria-hidden="true"></span>
        </div>
        <div class="howto" id="howto">
          <b>Trot ${esc(h.name)} away from you and back</b>
          <ul><li>${I.check({ s: 18, stroke: '#9DAF7A' })}Straight, firm ground, about 20 m</li>
          <li>${I.check({ s: 18, stroke: '#9DAF7A' })}Phone at hip height, held still</li>
          <li>${I.check({ s: 18, stroke: '#9DAF7A' })}All four hooves in frame</li></ul>
        </div>
        <div class="rec-live" id="recLive" hidden><span class="rdot"></span><span id="recMsg">Tracking ${esc(h.name)}</span></div>
        <div class="rec-bar">
          <div class="prog"><span id="prog"></span></div>
          <div class="rec-ctrl">
            <span class="thumb"><img src="${h.photo || 'assets/trot.jpg'}" alt=""></span>
            <button class="shutter" id="shutter" aria-label="Start recording"><span></span></button>
            <span class="timer" id="timer">0:00</span>
          </div>
          <div class="src">Demo footage</div>
        </div>
      </section>`;
    },
    mount(el) {
      const h = GC.active();
      // The demo always runs on the built-in footage. It never opens the camera and takes no files.
      rec = { t: 0, timer: null, running: false, horseId: h.id };
      const shutter = el.querySelector('#shutter');
      shutter.onclick = () => rec.running ? finish() : start();

      function start() {
        rec.running = true; rec.t = 0;
        shutter.classList.add('on'); shutter.setAttribute('aria-label', 'Stop recording');
        el.querySelector('#howto').classList.add('away');
        el.querySelector('#recLive').hidden = false;
        el.classList.add('is-rec');
        const vid = el.querySelector('#vfVid');
        try { vid.currentTime = 0; } catch (e) { }
        playClip(vid);
        const speed = GC.state.fastRecord ? 6 : 1;
        const msgs = ['Tracking ' + h.name, 'Hooves in frame', 'Keep the phone still', 'Now trot back towards you', 'Almost done'];
        rec.timer = setInterval(() => {
          rec.t += 0.1 * speed;
          const s = Math.min(30, rec.t);
          el.querySelector('#timer').textContent = '0:' + String(Math.floor(s)).padStart(2, '0');
          el.querySelector('#prog').style.width = (s / 30 * 100) + '%';
          el.querySelector('#recMsg').textContent = msgs[Math.min(msgs.length - 1, Math.floor(s / 6.5))];
          if (s >= 30) finish();
        }, 100);
      }
      function finish() {
        clearInterval(rec.timer); rec.running = false;
        GC.session = { horseId: h.id, source: 'demo', seconds: Math.max(5, Math.round(Math.min(30, rec.t))), frame: 'assets/trot.jpg' };
        GC.router.go('analysing');
      }
    },
    unmount() { if (rec) clearInterval(rec.timer); rec = null; }
  };

  // ---------- ANALYSING ----------
  let anTimers = [];
  S.analysing = {
    full: true,
    render() {
      const ses = GC.session || { horseId: GC.active().id, source: 'demo', seconds: 30, frame: 'assets/trot.jpg' };
      GC.session = ses;
      const h = GC.horse(ses.horseId);
      const steps = [`Finding ${h.name} in the video`, 'Tracking hooves, joints and hips', 'Comparing left and right steps', GC.baselineOf(h) ? `Comparing with ${GC.P(h).pos} usual pattern` : `Adding to ${GC.P(h).pos} baseline`];
      return `<section class="scr pad-full">
        <div class="muted sm b">Today · 0:${String(ses.seconds).padStart(2, '0')} of trot</div>
        <h2 class="t">Looking at ${esc(h.name)}'s movement</h2>
        <div class="an-frame">
          ${clipVideo('anVid')}
          <div class="scanonly" id="anScan"></div>
          <span class="an-badge" id="anBadge">Analysing…</span>
        </div>
        <div class="card list steps">${steps.map((s, i) => `<div class="li step" data-i="${i}"><span class="stp"><span class="spin"></span>${I.check({ stroke: '#FFF', s: 16, w: 2.5 })}</span>${esc(s)}</div>`).join('')}</div>
        <button class="btn green mt-auto" id="seeRes" disabled>See ${esc(h.name)}'s result</button>
      </section>`;
    },
    mount(el) {
      const ses = GC.session;
      const h = GC.horse(ses.horseId);
      const stepEls = el.querySelectorAll('.step');
      const dt = GC.state.fastRecord ? 650 : 1300;
      stepEls[0].classList.add('doing');
      playClip(el.querySelector('#anVid'));
      stepEls.forEach((s, i) => {
        anTimers.push(setTimeout(() => {
          s.classList.remove('doing'); s.classList.add('done');
          if (stepEls[i + 1]) stepEls[i + 1].classList.add('doing');
          if (i === stepEls.length - 1) complete();
        }, dt * (i + 1)));
      });
      function complete() {
        const wasLearning = !GC.baselineOf(h);
        const legs = GC.analyse(h, GC.state.nextResult);
        const c = GC.addCheck(h, legs, { seconds: ses.seconds, source: ses.source });
        const ev = GC.evaluate(h, c);
        el.querySelector('#anBadge').textContent = 'Done';
        el.querySelector('#anBadge').classList.add('done');
        el.querySelector('#anScan').hidden = true;
        el.querySelector('#anVid').pause();
        const btn = el.querySelector('#seeRes');
        btn.disabled = false;
        GC.state.activeId = h.id; GC.commit();
        const nowLearned = wasLearning && GC.baselineOf(h);
        if (wasLearning) {
          btn.dataset.go = 'baseline';
          btn.textContent = nowLearned ? `${h.name}'s range is ready` : `Check ${h.checks.length} of ${GC.BASELINE_CHECKS} done`;
        } else if (ev.flaggedLegs.length) {
          btn.dataset.go = 'change';
          const leg = ev.flaggedLegs[0];
          setTimeout(() => GC.ui.toast({ title: `${L[leg]} looks different`, body: `from ${h.name}'s usual pattern.`, go: 'change' }), 350);
        } else {
          btn.dataset.go = 'result?c=' + c.id;
        }
      }
    },
    unmount() { anTimers.forEach(clearTimeout); anTimers = []; }
  };

  // ---------- RESULT ----------
  S.result = {
    tab: 'today',
    render(q) {
      const h = GC.active(), p = GC.P(h), b = GC.baselineOf(h);
      const all = GC.checksOf(h);
      const c = (q.c && all.find(x => x.id === q.c)) || all[all.length - 1];
      if (!c) return S.today.render();
      const idx = all.indexOf(c);
      const ev = GC.evaluate(h, c);
      const series = all.slice(Math.max(0, idx - 8), idx + 1);
      const band = b ? GC.overallBand(b) : null;
      const chart = ch.line({ points: series.map(x => ({ t: x.at, v: GC.score(x), flag: !GC.evaluate(h, x).inRange })), band, yMin: 85, label: 'Overall symmetry' });
      const legRows = GC.LEGS.map(l => {
        const e = ev.legs[l];
        const d = e && !ev.learning ? `<span class="delta ${e.out ? 'red' : ''}">${sd(e.delta)}</span>` : '';
        return `<button class="li tap" data-go="history?leg=${l}"><span class="grow">${L[l]}</span>${d}<b class="${e && e.out ? 'red' : ''}">${c.legs[l]}</b></button>`;
      }).join('');
      let note;
      if (ev.learning) note = `<div class="note info">${I.info({ s: 20 })}<span>Still learning ${p.pos} range: ${h.checks.length} of ${GC.BASELINE_CHECKS} checks. You'll see results, but no alerts yet.</span></div>`;
      else if (ev.flaggedLegs.length) note = `<button class="note bad tap" data-go="change">${I.info({ s: 20 })}<span>${L[ev.flaggedLegs[0]]} is outside ${p.pos} usual range. See what this means.</span>${I.chevR({ s: 18 })}</button>`;
      else note = `<div class="note good">${I.check({ s: 20 })}<span>${esc(h.name)} moves the way ${p.sub} usually does. Next check: ${GC.nextCheckDay(h)}.</span></div>`;

      return `<section class="scr">
        <div class="pad">
          <div class="row">${avatar(h, 52)}<div><div class="h-name l">${esc(h.name)}</div><div class="muted sm">Check: ${when(c.at)}${c.seconds ? ' · 0:' + String(c.seconds).padStart(2, '0') + ' of trot' : ''}</div></div></div>
          <div class="card pad-c">
            <div class="lbl">Symmetry</div>
            <div class="score"><span class="num">${GC.score(c)}</span><span class="muted">${ev.learning ? 'learning range' : ev.inRange ? `within ${p.pos} usual range` : 'outside usual range'}</span></div>
            ${chart}
            ${band ? `<div class="legend"><span class="sw"></span>${esc(h.name)}'s usual range, learned from ${p.pos} own checks</div>` : ''}
          </div>
          <div class="card list">${legRows}</div>
          ${note}
        </div>
        ${tabs('today')}
      </section>`;
    }
  };

  // ---------- CHANGE DETECTED ----------
  S.change = {
    tab: 'history',
    render() {
      const h = GC.active(), p = GC.P(h), b = GC.baselineOf(h);
      const fl = flaggedOf(h);
      if (!fl) return `<section class="scr"><div class="pad"><h2 class="t">No change right now</h2><p class="muted">${esc(h.name)}'s latest check is within ${p.pos} usual range.</p><button class="btn green" data-go="today">Back to today</button></div>${tabs('history')}</section>`;
      const leg = fl.leg, e = fl.ev.legs[leg];
      const series = recent(h, 9);
      const chart = ch.line({ points: series.map((x, i) => ({ t: x.at, v: x.legs[leg], flag: i === series.length - 1 })), band: b[leg], yMin: 85, label: L[leg] + ' symmetry' });
      const weeks = Math.max(1, Math.round((fl.check.at - GC.checksOf(h)[0].at) / (7 * GC.DAY)));
      const sendW = Math.min(8, weeks);
      return `<section class="scr">
        <div class="pad">
          <div class="spacer-toast"></div>
          <div><h2 class="t xl">${L[leg]}</h2><div class="red b">${sd(e.delta)} vs. ${p.pos} usual range</div></div>
          <div class="card pad-c">${chart}</div>
          <div class="card pad-c"><b>What this means</b><p class="muted m0">${esc(h.name)}'s ${L[leg].toLowerCase()} is moving differently from ${p.pos} own normal. This is not a diagnosis. Film again tomorrow to rule out a bad day. If it stays, show your vet.</p></div>
          <div class="stack mt-auto">
            <button class="btn black" data-go="vet">Send ${sendW} weeks to my vet</button>
            <button class="btn outline" data-act="remind">Film again tomorrow</button>
          </div>
        </div>
        ${tabs('history')}
      </section>`;
    },
    mount(el) {
      const r = el.querySelector('[data-act="remind"]');
      if (r) r.onclick = () => { GC.ui.snack('Reminder set for tomorrow, 8:00'); setTimeout(() => GC.router.go('today'), 900); };
    }
  };

  // ---------- SEND TO VET ----------
  S.vet = {
    full: true,
    render() {
      const h = GC.active(), p = GC.P(h);
      const v = h.vet || { name: 'Add your vet', clinic: 'Tap change', initials: '+' };
      const all = GC.checksOf(h);
      const weeks = Math.min(8, Math.max(1, Math.round((all[all.length - 1].at - all[0].at) / (7 * GC.DAY))));
      const vids = all.filter(c => c.video).slice(-(weeks + 1)).length;
      const fl = flaggedOf(h);
      const defNote = fl ? `${L[fl.leg]} flagged today. ${p.Sub} was ridden lightly on Sunday, nothing unusual.` : `Routine update. ${p.Sub} has been in ${p.pos} range.`;
      const sess = h.training ? h.training.sessions.length : 0;
      return `<section class="scr">
        <div class="pad nobar">
          ${back('change', 'Send to your vet')}
          <div class="card row pad-c">${`<span class="ini">${esc(v.initials)}</span>`}<div class="grow"><b>${esc(v.name)}</b><div class="muted sm">${esc(v.clinic)} · ${esc(h.name)}'s vet</div></div><button class="lnk" data-act="change-vet">Change</button></div>
          <div class="sec">What's included</div>
          <div class="card list">
            <label class="li cb"><input type="checkbox" name="data" checked><span class="box">${I.check({ stroke: '#FFF', s: 16, w: 3 })}</span><span class="grow"><b class="n">${weeks} weeks of movement data</b><span class="muted sm d">Symmetry per leg, every check</span></span></label>
            <label class="li cb"><input type="checkbox" name="videos" checked><span class="box">${I.check({ stroke: '#FFF', s: 16, w: 3 })}</span><span class="grow"><b class="n">${vids} trot videos</b><span class="muted sm d">With tracking points, 30 s each</span></span></label>
            <label class="li cb"><input type="checkbox" name="notes"><span class="box">${I.check({ stroke: '#FFF', s: 16, w: 3 })}</span><span class="grow"><b class="n">Training and notes</b><span class="muted sm d">${sess ? sess + ' sessions logged' : 'What you logged between checks'}</span></span></label>
          </div>
          <div class="sec">Note for your vet</div>
          <textarea id="vetNote" rows="3">${esc(defNote)}</textarea>
          <div class="row muted sm">${I.link({ s: 20 })}<span>Your vet gets a secure link. It opens in any browser, no app needed.</span></div>
          <button class="btn black mt-auto" id="sendRep">Send report</button>
        </div>
      </section>`;
    },
    mount(el) {
      const h = GC.active();
      el.querySelector('[data-act="change-vet"]').onclick = () => vetSheet(h);
      el.querySelector('#sendRep').onclick = () => {
        if (!h.vet) { vetSheet(h); return; }
        const inc = {}; el.querySelectorAll('input[type=checkbox]').forEach(c => inc[c.name] = c.checked);
        const btn = el.querySelector('#sendRep');
        btn.disabled = true; btn.innerHTML = '<span class="spin w"></span>Sending…';
        setTimeout(() => {
          const id = Math.random().toString(36).slice(2, 8);
          GC.state.sentReports.push({ id, horseId: h.id, at: Date.now(), include: inc, note: el.querySelector('#vetNote').value, vet: h.vet });
          const fl = flaggedOf(h); if (fl) fl.check.sentToVet = true;
          GC.commit();
          GC.router.go('sent?r=' + id);
        }, 900);
      };
    }
  };
  function vetSheet(h) {
    const v = h.vet || { name: '', clinic: '' };
    GC.ui.sheet(`<h3>${esc(h.name)}'s vet</h3>
      <label class="fld"><span>Name</span><input id="vName" value="${esc(v.name)}" placeholder="Dr. …" autocomplete="off"></label>
      <label class="fld"><span>Clinic</span><input id="vClinic" value="${esc(v.clinic)}" placeholder="Clinic" autocomplete="off"></label>
      <button class="btn green" id="vSave">Save</button>`, panel => {
      panel.querySelector('#vSave').onclick = () => {
        const name = panel.querySelector('#vName').value.trim() || 'Your vet';
        const clinic = panel.querySelector('#vClinic').value.trim() || 'Clinic';
        const initials = name.replace(/^dr\.?\s*/i, '').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'V';
        h.vet = { name, clinic, initials }; GC.commit(); GC.ui.closeSheet(); GC.router.refresh();
      };
    });
  }

  // ---------- SENT ----------
  S.sent = {
    full: true,
    render(q) {
      const r = GC.state.sentReports.find(x => x.id === q.r) || GC.state.sentReports[GC.state.sentReports.length - 1];
      if (!r) return S.today.render();
      const h = GC.horse(r.horseId);
      const link = location.href.split('#')[0] + '#/report?r=' + r.id;
      return `<section class="scr pad-full center">
        <div class="okbig">${I.check({ stroke: '#FFF', s: 44, w: 2.5 })}</div>
        <h2 class="t">Report sent</h2>
        <p class="muted m0">${esc(r.vet.name)} can now see ${esc(h.name)}'s movement history. We'll let you know when it's been opened.</p>
        <div class="card linkbox"><span class="grow trunc">gaitcheck.app/r/${r.id}</span><button class="lnk" data-act="copy" data-link="${esc(link)}">${I.copy({ s: 18 })}Copy</button></div>
        <div class="stack mt-auto w100">
          <button class="btn outline" data-go="report?r=${r.id}">Preview what your vet sees</button>
          ${navigator.share ? `<button class="btn outline" data-act="share" data-link="${esc(link)}">${I.share({ s: 18 })}Share another way</button>` : ''}
          <button class="btn green" data-go="today">Done</button>
        </div>
      </section>`;
    },
    mount(el) {
      const c = el.querySelector('[data-act="copy"]');
      c.onclick = async () => { try { await navigator.clipboard.writeText(c.dataset.link); GC.ui.snack('Link copied'); } catch (e) { GC.ui.snack('Copy not available here'); } };
      const s = el.querySelector('[data-act="share"]');
      if (s) s.onclick = () => navigator.share({ title: 'GaitCheck report', url: s.dataset.link }).catch(() => { });
    }
  };

  // ---------- VET REPORT (what the vet opens in a browser) ----------
  S.report = {
    full: true,
    render(q) {
      const r = GC.state.sentReports.find(x => x.id === q.r) || GC.state.sentReports[GC.state.sentReports.length - 1];
      const h = r ? GC.horse(r.horseId) : GC.active();
      const inc = r ? r.include : { data: true, videos: true, notes: false };
      const b = GC.baselineOf(h);
      const all = GC.checksOf(h).slice(-9);
      const p = GC.P(h);
      const legCharts = b ? GC.LEGS.map(l => {
        const last = all[all.length - 1]; const e = GC.evaluate(h, last).legs[l];
        return `<div class="rp-leg ${e.out ? 'flag' : ''}"><div class="rp-lh"><b>${L[l]}</b><span>${last.legs[l]} <small>(range ${b[l].lo}–${b[l].hi})</small></span></div>
          ${ch.line({ points: all.map(x => ({ t: x.at, v: x.legs[l], flag: GC.evaluate(h, x).legs[l].out })), band: b[l], yMin: 85, height: 110, compact: true, label: L[l] })}</div>`;
      }).join('') : '';
      const rows = all.slice().reverse().map((c) => {
        const ev = GC.evaluate(h, c);
        return `<tr class="${ev.inRange ? '' : 'flag'}"><td>${ch.fmtDate(c.at)}</td>${GC.LEGS.map(l => `<td class="${ev.legs[l] && ev.legs[l].out ? 'red b' : ''}">${c.legs[l]}</td>`).join('')}<td>${GC.score(c)}</td></tr>`;
      }).join('');
      const sessions = inc.notes && h.training ? h.training.sessions.map(s => `<li>${ch.fmtDate(s.at)} · ${{ walk: 'Walk only', light: 'Light trot', full: 'Full session' }[s.type]}</li>`).join('') : '';
      const fl = flaggedOf(h);
      return `<section class="scr report">
        <div class="browser"><button class="back" data-go="${r ? 'sent?r=' + r.id : 'today'}" aria-label="Back">${I.chevL()}</button><span class="url">🔒 gaitcheck.app/r/${r ? r.id : 'preview'}</span><button class="back" data-act="print" aria-label="Print">${I.print({ s: 20 })}</button></div>
        <div class="rp" id="printable">
          <div class="rp-head"><div><div class="rp-brand">GaitCheck · Movement report</div><h2>${esc(h.name)}</h2><div class="muted sm">Owner: ${esc(GC.state.owner)} · ${all.length} checks, ${ch.fmtDate(all[0].at)} – ${ch.fmtDate(all[all.length - 1].at)}</div></div>${avatar(h, 56)}</div>
          ${fl ? `<div class="rp-flag"><b>${L[fl.leg]} flagged ${ch.fmtDate(fl.check.at).toLowerCase()}</b><span>${fl.ev.legs[fl.leg].value} vs. usual ${b[fl.leg].lo}–${b[fl.leg].hi} (${sd(fl.ev.legs[fl.leg].delta)} vs. mean)</span></div>` : `<div class="rp-ok"><b>All four legs within ${p.pos} usual range</b></div>`}
          ${r && r.note ? `<div class="rp-note"><span class="muted sm">Note from the owner</span><p>${esc(r.note)}</p></div>` : ''}
          ${inc.data && b ? `<h4>Symmetry per leg</h4><div class="rp-grid">${legCharts}</div>
          <h4>All checks</h4><table class="rp-tbl"><thead><tr><th>Date</th><th>FL</th><th>FR</th><th>HL</th><th>HR</th><th>All</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
          ${inc.videos ? `<h4>Trot videos</h4><div class="rp-vids">${all.slice(-4).reverse().map((c, i) => `<div class="rp-vid"><img src="assets/clip-${i + 1}.jpg" width="636" height="288" alt="Frame from the trot video"><span>${ch.fmtDate(c.at)}</span></div>`).join('')}</div>` : ''}
          ${sessions ? `<h4>Training log</h4><ul class="rp-ul">${sessions}</ul>` : ''}
          <p class="rp-disc">Symmetry scores are relative to this horse's own baseline (learned from ${p.pos} first ${GC.BASELINE_CHECKS} checks), measured from 30-second in-hand trot videos filmed by the owner. GaitCheck flags changes. It does not diagnose.</p>
        </div>
      </section>`;
    },
    mount(el) { el.querySelector('[data-act="print"]').onclick = () => window.print(); }
  };

  // ---------- HISTORY ----------
  S.history = {
    tab: 'history',
    render(q) {
      const h = GC.active(), b = GC.baselineOf(h);
      const all = GC.checksOf(h);
      if (!all.length) return `<section class="scr"><div class="pad"><h2 class="t">History</h2><p class="muted">No checks for ${esc(h.name)} yet.</p><button class="btn green" data-go="record">Record the first trot</button></div>${tabs('history')}</section>`;
      // default leg: the one that was flagged most recently
      let leg = q.leg;
      if (!leg) {
        leg = 'all';
        if (b) for (let i = all.length - 1; i >= 0 && leg === 'all'; i--) { const f = GC.evaluate(h, all[i]).flaggedLegs; if (f.length) leg = f[0]; }
      }
      const series = all.slice(-10);
      const val = c => leg === 'all' ? GC.score(c) : c.legs[leg];
      const isOut = c => b && (leg === 'all' ? !GC.evaluate(h, c).inRange : GC.evaluate(h, c).legs[leg].out);
      const band = b ? (leg === 'all' ? GC.overallBand(b) : b[leg]) : null;
      const chart = ch.line({ points: series.map(c => ({ t: c.at, v: val(c), flag: isOut(c) })), band, yMin: 85, label: 'History' });
      const items = series.map((c, i) => ({ c, st: GC.statusFor(h, series, i, leg === 'all' ? null : leg) })).reverse();
      const rows = items.map(({ c, st }) => `<button class="li tap hist" data-go="result?c=${c.id}"><span class="dot ${st.key}"></span><span class="grow">${ch.fmtDate(c.at)}</span><span class="st ${st.key}">${st.label}</span><b>${val(c)}</b>${I.chevR({ s: 16 })}</button>`).join('');
      const seg = ['all', ...GC.LEGS].map(l => `<button class="${l === leg ? 'on' : ''}" data-go="history?leg=${l}">${l === 'all' ? 'All' : l}</button>`).join('');
      const weeks = Math.max(1, Math.round((series[series.length - 1].at - series[0].at) / (7 * GC.DAY)) + 1);
      return `<section class="scr">
        <div class="pad">
          <div><h2 class="t xl">History</h2><div class="muted">${esc(h.name)} · ${leg === 'all' ? 'all legs' : L[leg].toLowerCase()}, last ${weeks} weeks</div></div>
          <div class="seg" role="tablist">${seg}</div>
          <div class="card pad-c">${chart}</div>
          <div class="card list">${rows}</div>
        </div>
        ${tabs('history')}
      </section>`;
    }
  };

  // ---------- BASELINE ----------
  S.baseline = {
    full: true,
    render() {
      const h = GC.active(), p = GC.P(h);
      const all = GC.checksOf(h);
      const n = Math.min(all.length, GC.BASELINE_CHECKS);
      const ready = !!GC.baselineOf(h) && !h.baseline;
      const lastAt = all.length ? all[all.length - 1].at : Date.now() - 7 * GC.DAY;
      const rows = [0, 1, 2, 3].map(i => {
        const c = all[i];
        if (c) return `<div class="li"><span class="okc">${I.check({ s: 20, stroke: '#4F5E33', w: 2.5 })}</span><span class="grow">Week ${i + 1}</span><span class="muted">${ch.fmtDate(c.at)}</span></div>`;
        const due = i === n ? (GC.dueInfo(h).due ? 'Due today' : 'Due ' + new Date(lastAt + 7 * GC.DAY).toLocaleDateString('en-GB', { weekday: 'long' })) : '';
        return `<div class="li"><span class="ring"></span><span class="grow b">Week ${i + 1}</span><span class="green b">${due}</span></div>`;
      }).join('');
      return `<section class="scr baseline">
        ${heroFor(h, 'hero bl-hero')}
        <button class="round light abs-tl" data-go="${ready ? 'today' : 'horses'}" aria-label="Back">${I.chevL({ stroke: '#FFF' })}</button>
        <div class="sheet-card bl">
          <div class="green b sm">${ready ? 'All 4 checks done' : `Check ${n} of ${GC.BASELINE_CHECKS} done`}</div>
          <h2 class="t">${ready ? `${esc(h.name)}'s range is ready` : `Getting to know ${esc(h.name)}`}</h2>
          <p class="muted m0">${ready ? `From now on, GaitCheck compares every trot with ${p.pos} own normal and alerts you when a leg moves differently.` : `Every horse moves a little differently. GaitCheck compares ${esc(h.name)} only with ${p.obj}self, so it first learns ${p.pos} normal range.`}</p>
          <div class="bars">${[0, 1, 2, 3].map(i => `<span class="bar ${i < n ? 'on' : ''}"></span>`).join('')}</div>
          <div class="card list">${rows}</div>
          ${ready ? '' : `<p class="muted sm m0">Until ${p.pos} range is ready you'll see each result, but no alerts.</p>`}
          ${ready ? `<button class="btn green mt-auto" data-go="result">See ${p.pos} first result</button>` : `<button class="btn green mt-auto" data-go="record">Record check ${n + 1} of ${GC.BASELINE_CHECKS}</button>`}
        </div>
      </section>`;
    }
  };

  // ---------- BACK TO TRAINING ----------
  let pickedLoad = 'light';
  S.training = {
    full: true,
    render() {
      const h = GC.active(), p = GC.P(h);
      if (!h.training) h.training = { startedAt: Date.now(), sessions: [] };
      const st = GC.streak(h);
      const fl = flaggedOf(h);
      const start = GC.startOfDay(h.training.startedAt).getTime();
      const checksSince = GC.checksOf(h).filter(c => c.at >= start);
      const weeks = [0, 1, 2, 3].map(w => {
        const from = start + w * 7 * GC.DAY, to = from + 7 * GC.DAY;
        const k = checksSince.filter(c => c.at >= from && c.at < to).length;
        const cur = Date.now() >= from && Date.now() < to;
        return `<div class="wk ${cur ? 'cur' : ''}"><span>Week ${w + 1}</span><span class="dots"><i class="${k > 0 ? 'f' : ''}"></i><i class="${k > 1 ? 'f' : ''}"></i></span></div>`;
      }).join('');
      const sess = h.training.sessions.slice().reverse().slice(0, 3).map(s => `<div class="li"><span class="grow">${{ walk: 'Walk only', light: 'Light trot', full: 'Full session' }[s.type]}</span><span class="muted sm">${ch.fmtDate(s.at)}</span></div>`).join('');
      const top = fl
        ? `<div class="hero-card bad"><div class="sm b op">${esc(h.name)}</div><h3>Hold off on more work</h3><p>${L[fl.leg]} is outside ${p.pos} range again. Film again tomorrow and talk to your vet before you build up.</p><button class="btn white" data-go="change">See the change</button></div>`
        : `<div class="hero-card"><div class="sm b op">${esc(h.name)}</div><h3>Back in ${p.pos} range</h3><p>${st} checks in a row, all four legs</p><div class="cks">${Array.from({ length: Math.min(6, Math.max(st, 0)) }).map(() => `<span>${I.check({ s: 18, w: 2.5 })}</span>`).join('')}</div></div>`;
      return `<section class="scr">
        <div class="pad nobar">
          ${back('today', 'Back to training')}
          ${top}
          <div class="card pad-c"><b>Check twice a week while ${p.sub} builds up</b><p class="muted m0">${h.history ? esc(h.history) + " This time you'll see it in the data first." : "Small changes show up in the data before you can see them."}</p><div class="wks">${weeks}</div></div>
          <div class="sec">Log today's session</div>
          <div class="loads">${[['walk', 'Walk only'], ['light', 'Light trot'], ['full', 'Full session']].map(([k, n]) => `<button class="load ${pickedLoad === k ? 'on' : ''}" data-load="${k}">${n}</button>`).join('')}</div>
          ${sess ? `<div class="card list">${sess}</div>` : ''}
          <button class="btn green mt-auto" id="logS">Log session</button>
          <p class="muted sm center m0">Agree the training plan with your vet. GaitCheck shows whether ${p.pos} movement stays in range.</p>
        </div>
      </section>`;
    },
    mount(el) {
      const h = GC.active();
      el.querySelectorAll('[data-load]').forEach(b => b.onclick = () => { pickedLoad = b.dataset.load; el.querySelectorAll('[data-load]').forEach(x => x.classList.toggle('on', x === b)); });
      el.querySelector('#logS').onclick = () => {
        h.training.sessions.push({ at: Date.now(), type: pickedLoad }); GC.commit();
        GC.ui.snack('Session logged · next check ' + GC.nextCheckDay(h));
        GC.router.refresh();
      };
    }
  };

  // ---------- HORSES (stable view) ----------
  S.horses = {
    tab: 'horses',
    render() {
      const hs = GC.state.horses;
      const checkedWeek = hs.filter(h => { const lc = GC.lastCheck(h); return lc && Date.now() - lc.at < 7 * GC.DAY && GC.startOfDay(lc.at) > Date.now() - 7 * GC.DAY; }).length;
      const cards = hs.map(h => {
        const b = GC.baselineOf(h), d = GC.dueInfo(h), lc = GC.lastCheck(h), fl = b && flaggedOf(h);
        let line, right;
        if (!b) {
          line = `<span class="muted">Learning ${GC.P(h).pos} baseline · ${h.checks.length} of ${GC.BASELINE_CHECKS}</span><span class="bars sm">${[0, 1, 2, 3].map(i => `<span class="bar ${i < h.checks.length ? 'on' : ''}"></span>`).join('')}</span>`;
          right = d.due ? `<span class="pill" data-rec="${h.id}">Record</span>` : I.chevR({ s: 20 });
        } else if (fl) {
          line = `<span class="red"><span class="dot flag"></span>${L[fl.leg]} flagged · ${ch.fmtDate(fl.check.at).toLowerCase()}</span>`;
          right = `<span class="num s red">${GC.score(lc)}</span>`;
        } else if (d.due) {
          line = `<span class="amber"><span class="dot amber"></span>${esc(d.label)}</span>`;
          right = `<span class="pill" data-rec="${h.id}">Record</span>`;
        } else {
          line = `<span class="okl"><span class="dot ok"></span>In range · ${esc(d.label)}</span>`;
          right = `<span class="num s">${GC.score(lc)}</span>`;
        }
        return `<button class="card horse ${h.id === GC.state.activeId ? 'act' : ''}" data-horse="${h.id}">${avatar(h, 52)}<span class="grow"><b class="h-name">${esc(h.name)}</b><span class="hl">${line}</span></span>${right}</button>`;
      }).join('');
      return `<section class="scr">
        <div class="pad">
          <div><h2 class="t xl">Your horses</h2><div class="muted">This week: ${checkedWeek} of ${hs.length} checked</div></div>
          ${cards}
          <button class="addh" data-act="add-horse">${I.plus()}Add a horse</button>
          <div class="share-card mt-auto"><b>Share with your stable or trainer</b><p class="muted m0">Let the people who see your horses every day record checks and get the same alerts.</p><button class="btn black auto" data-act="invite">Invite someone</button></div>
        </div>
        ${tabs('horses')}
      </section>`;
    },
    mount(el) {
      el.querySelectorAll('[data-horse]').forEach(c => c.onclick = e => {
        const id = c.dataset.horse; GC.state.activeId = id; GC.commit();
        if (e.target.closest('[data-rec]')) return GC.router.go('record');
        GC.router.go(GC.baselineOf(GC.horse(id)) ? 'today' : 'baseline');
      });
      el.querySelector('[data-act="add-horse"]').onclick = addHorseSheet;
      el.querySelector('[data-act="invite"]').onclick = inviteSheet;
    }
  };

  function addHorseSheet() {
    let pr = 'she';
    GC.ui.sheet(`<h3>Add a horse</h3>
      <label class="fld"><span>Name</span><input id="hName" placeholder="e.g. Fritzi" maxlength="24" autocomplete="off"></label>
      <div class="fld"><span>Pronoun</span><div class="seg two"><button class="on" data-pr="she">She</button><button data-pr="he">He</button></div></div>
      <p class="muted sm m0">GaitCheck first learns this horse's normal from 4 weekly checks.</p>
      <button class="btn green" id="hSave">Add and start learning</button>`, panel => {
      panel.querySelectorAll('[data-pr]').forEach(b => b.onclick = () => { pr = b.dataset.pr; panel.querySelectorAll('[data-pr]').forEach(x => x.classList.toggle('on', x === b)); });
      const save = () => {
        const n = panel.querySelector('#hName').value.trim(); if (!n) { panel.querySelector('#hName').focus(); return; }
        const id = GC.addHorse(n, pr); GC.state.activeId = id; GC.commit(); GC.ui.closeSheet(); GC.router.go('baseline');
      };
      panel.querySelector('#hSave').onclick = save;
      panel.querySelector('#hName').onkeydown = e => { if (e.key === 'Enter') save(); };
    });
  }
  function inviteSheet() {
    let role = 'Stable';
    GC.ui.sheet(`<h3>Invite someone</h3>
      <p class="muted m0">They can record checks for your horses and get the same alerts. You can remove them any time.</p>
      <div class="fld"><span>They are your…</span><div class="seg three"><button class="on" data-role="Stable">Stable</button><button data-role="Trainer">Trainer</button><button data-role="Vet">Vet</button></div></div>
      <button class="btn black" id="iCopy">${I.link({ s: 18, stroke: '#FFF' })}Copy invite link</button>`, panel => {
      panel.querySelectorAll('[data-role]').forEach(b => b.onclick = () => { role = b.dataset.role; panel.querySelectorAll('[data-role]').forEach(x => x.classList.toggle('on', x === b)); });
      panel.querySelector('#iCopy').onclick = async () => {
        const link = 'https://gaitcheck.app/join/' + Math.random().toString(36).slice(2, 8);
        try { await navigator.clipboard.writeText(link); } catch (e) { }
        GC.state.invites.push({ role, at: Date.now() }); GC.commit();
        GC.ui.closeSheet(); GC.ui.snack(role + ' invite link copied');
      };
    });
  }

  function switchHorseSheet() {
    const hs = GC.state.horses;
    if (hs.length < 2) return;
    GC.ui.sheet(`<h3>Switch horse</h3><div class="card list">${hs.map(h => `<button class="li tap" data-pick="${h.id}">${avatar(h, 36)}<span class="grow b">${esc(h.name)}</span>${h.id === GC.state.activeId ? I.check({ s: 18, stroke: '#4F5E33' }) : ''}</button>`).join('')}</div>`, panel => {
      panel.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { GC.state.activeId = b.dataset.pick; GC.commit(); GC.ui.closeSheet(); GC.router.refresh(); });
    });
  }

  GC.screens = S;
  GC.sheets = { switchHorse: switchHorseSheet, addHorse: addHorseSheet, invite: inviteSheet };
})();
