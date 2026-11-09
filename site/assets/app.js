// Collin Browse — portfolio interactions. No dependencies.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };

  // ---- Scene: the page takes on the colors of whichever section is in view.
  const scenes = $$('[data-scene-section]');
  if (scenes.length) {
    const base = document.body.dataset.scene || '';
    const pick = () => {
      const mid = innerHeight * 0.45;
      let current = base;
      for (const s of scenes) {
        const r = s.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) current = s.dataset.sceneSection;
      }
      if (document.body.dataset.scene !== current) document.body.dataset.scene = current;
    };
    addEventListener('scroll', pick, { passive: true });
    addEventListener('resize', pick);
    pick();
  }

  // ---- Reveal on scroll.
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  // ---- Videos play only while visible.
  const vio = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting && !reduced) v.play().catch(() => {});
    else v.pause();
  }), { threshold: 0.35 });
  $$('video[data-auto]').forEach((v) => vio.observe(v));
  if (reduced) $$('video[data-auto]').forEach((v) => { v.controls = true; });

  // ---- Clip switchers (tabs that swap a phone's video).
  $$('[data-switcher]').forEach((root) => {
    const video = $('video', root);
    const cap = $('.caption', root);
    const tabs = $$('[role=tab]', root);
    const select = (tab) => {
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      if (video.getAttribute('src') !== tab.dataset.src) {
        video.poster = tab.dataset.poster || '';
        video.src = tab.dataset.src;
        if (!reduced) video.play().catch(() => {});
      }
      if (cap) cap.innerHTML = `<b>${tab.dataset.title || ''}</b><span>${tab.dataset.text || ''}</span>`;
    };
    tabs.forEach((t) => t.addEventListener('click', () => select(t)));
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      n.focus(); select(n);
    });
  });

  // ---- Silver Screen: half-point rating.
  $$('[data-rate]').forEach((root) => {
    const input = $('input', root), score = $('.rate-score', root), say = $('.rate-say', root);
    const lines = [[2, 'Walked out.'], [4, 'Fell asleep on the couch.'], [6, 'Fine for a plane.'], [7.5, 'Would recommend.'], [9, 'Telling everyone at dinner.'], [9.5, 'Rewatch tonight.'], [10, 'Best Picture.']];
    const draw = () => {
      const v = Number(input.value) / 2;
      score.textContent = v.toFixed(1);
      say.textContent = lines.find(([max]) => v <= max)[1];
    };
    input.addEventListener('input', draw); draw();
  });

  // ---- CrewCue: pace planner on a made-up course.
  $$('[data-pace]').forEach((root) => {
    const profile = [[0, 6600], [3, 7250], [6.8, 8100], [10, 7700], [14.1, 9300], [18, 10250], [22.5, 9000], [26, 9900], [30.4, 11500], [34, 10300], [38.9, 8800], [43, 9350], [46.5, 7900], [50, 6700]];
    const aids = [['Dry Fork', 6.8], ['Overlook', 14.1], ['Hermosa', 22.5], ['The Pass', 30.4], ['La Plata', 38.9], ['Finish', 50]];
    const total = 50, dwell = 4, start = 6 * 60;
    const elevAt = (m) => {
      for (let i = 1; i < profile.length; i++) {
        const [m0, e0] = profile[i - 1], [m1, e1] = profile[i];
        if (m <= m1) return e0 + (e1 - e0) * (m - m0) / (m1 - m0);
      }
      return profile.at(-1)[1];
    };
    // Effort per tenth of a mile: distance, plus climbing, less a little for descent, plus fatigue.
    const step = 0.1, effort = [0];
    for (let m = step; m <= total + 1e-6; m += step) {
      const d = elevAt(m) - elevAt(m - step);
      const grade = step + (d > 0 ? d / 600 : d / 3200);
      effort.push(effort.at(-1) + Math.max(grade, step * 0.6) * (1 + 0.22 * (m / total)));
    }
    const effortAt = (m) => effort[Math.round(m / step)];
    const W = 560, H = 190, padB = 26, padT = 12;
    const x = (m) => (m / total) * W;
    const y = (e) => padT + (1 - (e - 6200) / (11900 - 6200)) * (H - padT - padB);
    const chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Elevation profile of a fictional 50 mile course with six aid stations' });
    $('.pace-chart', root).appendChild(chart);
    const pts = []; for (let m = 0; m <= total + 1e-6; m += 0.5) pts.push([x(m), y(elevAt(m))]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    svg('path', { class: 'area', d: `${d}L${W} ${H - padB}L0 ${H - padB}Z` }, chart);
    svg('path', { class: 'line', d }, chart);
    const done = svg('path', { class: 'done', d: '' }, chart);
    const aidEls = aids.map(([name, m]) => {
      const g = svg('g', { class: 'aid' }, chart);
      svg('line', { x1: x(m), x2: x(m), y1: y(elevAt(m)), y2: H - padB + 4 }, g);
      svg('circle', { cx: x(m), cy: y(elevAt(m)), r: 4.5 }, g);
      const t = svg('text', { x: Math.min(x(m), W - 2), y: H - 6, 'text-anchor': m > 46 ? 'end' : 'middle', 'font-size': 10.5, fill: 'currentColor', opacity: .7 }, g);
      t.textContent = name;
      return g;
    });
    const runner = svg('circle', { class: 'runner', r: 7 }, chart);

    const goal = $('[data-goal]', root), clock = $('[data-clock]', root);
    const fmtDur = (min) => `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m`;
    const fmtClock = (min) => { const t = Math.round(start + min); const h = Math.floor(t / 60) % 24; return `${((h + 11) % 12) + 1}:${String(t % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
    const fmtPace = (p) => `${Math.floor(p)}:${String(Math.round((p % 1) * 60) % 60).padStart(2, '0')}`;
    const body = $('tbody', root);

    const draw = () => {
      const goalMin = Number(goal.value);
      const moving = goalMin - dwell * (aids.length - 1);
      const k = moving / effort.at(-1);
      // Arrival at each aid station (minutes after the start).
      let prevM = 0;
      const rows = aids.map(([name, m], i) => {
        const arr = effortAt(m) * k + dwell * i;
        const seg = (effortAt(m) - effortAt(prevM)) * k;
        const pace = seg / (m - prevM);
        prevM = m;
        return { name, m, arr, pace };
      });
      // Where is the runner at the chosen race clock?
      const now = (Number(clock.value) / 1000) * goalMin;
      let mile = total;
      for (let i = 0; i < rows.length; i++) {
        const from = i ? rows[i - 1].arr + dwell : 0, m0 = i ? rows[i - 1].m : 0;
        if (now < from) { mile = m0; break; }
        if (now <= rows[i].arr) {
          const target = effortAt(m0) + (now - from) / k;
          let lo = m0, hi = rows[i].m;
          for (let j = 0; j < 22; j++) { const mid = (lo + hi) / 2; (effortAt(mid) < target ? (lo = mid) : (hi = mid)); }
          mile = lo; break;
        }
      }
      const next = rows.find((r) => r.arr > now) || rows.at(-1);
      $('.pace-big', root).textContent = fmtDur(goalMin);
      $('[data-goal-out]', root).textContent = `Finish ${fmtClock(goalMin)}`;
      $('[data-clock-out]', root).textContent = fmtClock(now);
      body.innerHTML = rows.map((r) => `<tr class="${r.arr <= now ? 'passed' : r === next ? 'next' : ''}"><td>${r.name}</td><td>${r.m.toFixed(1)}</td><td>${fmtPace(r.pace)}</td><td>${fmtClock(r.arr)}</td></tr>`).join('');
      aidEls.forEach((g, i) => g.classList.toggle('passed', rows[i].arr <= now));
      runner.setAttribute('cx', x(mile)); runner.setAttribute('cy', y(elevAt(mile)));
      const dp = pts.filter((p) => p[0] <= x(mile)); dp.push([x(mile), y(elevAt(mile))]);
      done.setAttribute('d', dp.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(''));
      const left = next.arr - now;
      $('.pace-next', root).innerHTML = now >= goalMin - 0.5
        ? `<b>Finished.</b> ${fmtDur(goalMin)} on the clock.`
        : `<b>Mile ${mile.toFixed(1)}.</b> Next: ${next.name}, ${(next.m - mile).toFixed(1)} mi away. Crew should be ready by <b>${fmtClock(next.arr)}</b> (${Math.max(1, Math.round(left))} min).`;
    };
    goal.addEventListener('input', draw); clock.addEventListener('input', draw); draw();
  });

  // ---- Cash Flow: cumulative net chart with press-and-drag scrubbing.
  $$('[data-cash]').forEach((root) => {
    // Deterministic demo ledger: 180 days ending today.
    let seed = 20260921; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const days = 180, today = new Date(); today.setHours(12, 0, 0, 0);
    const ledger = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today); date.setDate(today.getDate() - i);
      let inc = 0, out = 18 + rnd() * 74;
      if (date.getDate() === 1) out += 1650;
      if (date.getDate() === 15 || date.getDate() === 28) inc += 2380;
      if (date.getDay() === 6) out += 60 + rnd() * 90;
      if (rnd() < 0.045) out += 180 + rnd() * 520;
      if (rnd() < 0.02) inc += 120 + rnd() * 400;
      ledger.push({ date, inc, out });
    }
    const W = 560, H = 200, pad = 10;
    const chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Cumulative net cash flow for the selected range. Drag to inspect a day.' });
    $('.cash-chart', root).appendChild(chart);
    const fill = svg('path', { class: 'fill' }, chart);
    const zero = svg('line', { class: 'zero', x1: 0, x2: W }, chart);
    const line = svg('path', { class: 'line' }, chart);
    const scrub = svg('g', { class: 'scrub', visibility: 'hidden' }, chart);
    const sLine = svg('line', { y1: 0, y2: H }, scrub), sDot = svg('circle', { r: 6 }, scrub);
    const money = (n, sign) => (sign ? (n < 0 ? '−' : '+') : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
    const day = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    let series = [], range = 30, xs, ys;

    const show = (i) => {
      const live = i == null; if (live) i = series.length - 1;
      const p = series[i];
      const net = $('.cash-net', root);
      net.textContent = money(p.net, true); net.className = 'cash-net ' + (p.net >= 0 ? 'pos' : 'neg');
      $('[data-in]', root).textContent = money(p.inc); $('[data-out]', root).textContent = money(p.out);
      $('.cash-verdict', root).textContent = live
        ? (p.net >= 0 ? `Yes. You're ${money(p.net)} ahead over the last ${range} days.` : `Not yet. You're ${money(p.net)} behind over the last ${range} days.`)
        : `${day(series[0].date)} – ${day(p.date)}`;
      scrub.setAttribute('visibility', live ? 'hidden' : 'visible');
      if (!live) { sLine.setAttribute('x1', xs(i)); sLine.setAttribute('x2', xs(i)); sDot.setAttribute('cx', xs(i)); sDot.setAttribute('cy', ys(p.net)); }
    };
    const build = () => {
      let net = 0, inc = 0, out = 0;
      series = ledger.slice(-range).map((d) => { inc += d.inc; out += d.out; net += d.inc - d.out; return { date: d.date, net, inc, out }; });
      const lo = Math.min(0, ...series.map((p) => p.net)), hi = Math.max(0, ...series.map((p) => p.net));
      xs = (i) => (i / (series.length - 1)) * W;
      ys = (v) => pad + (1 - (v - lo) / (hi - lo || 1)) * (H - 2 * pad);
      const d = series.map((p, i) => (i ? 'L' : 'M') + xs(i).toFixed(1) + ' ' + ys(p.net).toFixed(1)).join('');
      line.setAttribute('d', d); fill.setAttribute('d', `${d}L${W} ${ys(0)}L0 ${ys(0)}Z`);
      zero.setAttribute('y1', ys(0)); zero.setAttribute('y2', ys(0));
      show(null);
    };
    const at = (e) => { const r = chart.getBoundingClientRect(); return Math.max(0, Math.min(series.length - 1, Math.round(((e.clientX - r.left) / r.width) * (series.length - 1)))); };
    chart.addEventListener('pointerdown', (e) => { chart.setPointerCapture(e.pointerId); show(at(e)); });
    chart.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons) show(at(e)); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => chart.addEventListener(t, () => show(null)));
    $$('[data-range]', root).forEach((b) => b.addEventListener('click', () => {
      range = Number(b.dataset.range);
      $$('[data-range]', root).forEach((o) => o.setAttribute('aria-selected', String(o === b)));
      build();
    }));
    build();
  });

  // ---- AMV ConnEx: an illustration of joint tracking on a squat.
  $$('[data-cv]').forEach((root) => {
    const s = svg('svg', { viewBox: '0 0 320 400', 'aria-hidden': 'true' });
    root.prepend(s);
    const grid = svg('g', { class: 'grid' }, s);
    for (let i = 40; i < 400; i += 40) svg('line', { x1: 0, x2: 320, y1: i, y2: i }, grid);
    for (let i = 40; i < 320; i += 40) svg('line', { x1: i, x2: i, y1: 0, y2: 400 }, grid);
    svg('line', { x1: 60, x2: 260, y1: 340, y2: 340, stroke: '#3a4a70', 'stroke-width': 2 }, s);
    const bones = Array.from({ length: 5 }, () => svg('line', { class: 'bone' }, s));
    const arc = svg('path', { class: 'arc' }, s);
    const head = svg('circle', { class: 'joint', r: 16 }, s);
    const joints = Array.from({ length: 5 }, () => svg('circle', { class: 'joint', r: 6.5 }, s));
    const angleOut = $('[data-angle]', root), cue = $('[data-cue]', root), reps = $('[data-reps]', root);
    const rad = (deg) => (deg * Math.PI) / 180, lerp = (a, b, t) => a + (b - a) * t;
    const L1 = 86, L2 = 92, L3 = 104, ankle = [150, 336];
    let count = 0, wasDeep = false;
    const frame = (p) => {
      const sh = rad(lerp(3, 30, p)), th = rad(lerp(2, 84, p)), to = rad(lerp(2, 38, p));
      const knee = [ankle[0] + L1 * Math.sin(sh), ankle[1] - L1 * Math.cos(sh)];
      const hip = [knee[0] - L2 * Math.sin(th), knee[1] - L2 * Math.cos(th)];
      const shoulder = [hip[0] + L3 * Math.sin(to), hip[1] - L3 * Math.cos(to)];
      const hand = [shoulder[0] + 70, shoulder[1] + lerp(60, 6, p)];
      const toe = [ankle[0] + 40, ankle[1] + 2];
      const segs = [[toe, ankle], [ankle, knee], [knee, hip], [hip, shoulder], [shoulder, hand]];
      segs.forEach(([a, b], i) => { const l = bones[i]; l.setAttribute('x1', a[0]); l.setAttribute('y1', a[1]); l.setAttribute('x2', b[0]); l.setAttribute('y2', b[1]); });
      [ankle, knee, hip, shoulder, hand].forEach((j, i) => { joints[i].setAttribute('cx', j[0]); joints[i].setAttribute('cy', j[1]); });
      head.setAttribute('cx', shoulder[0] + 8 * Math.sin(to)); head.setAttribute('cy', shoulder[1] - 30);
      const angle = Math.round(180 - lerp(3, 30, p) - lerp(2, 84, p));
      const a0 = Math.atan2(ankle[1] - knee[1], ankle[0] - knee[0]), a1 = Math.atan2(hip[1] - knee[1], hip[0] - knee[0]), r = 26;
      arc.setAttribute('d', `M${knee[0] + r * Math.cos(a0)} ${knee[1] + r * Math.sin(a0)}A${r} ${r} 0 0 1 ${knee[0] + r * Math.cos(a1)} ${knee[1] + r * Math.sin(a1)}`);
      const deep = angle <= 95;
      arc.classList.toggle('good', deep);
      angleOut.textContent = angle + '°';
      cue.textContent = deep ? 'Good depth' : angle < 150 ? 'Keep going' : 'Ready';
      cue.classList.toggle('good', deep);
      if (deep && !wasDeep) reps.textContent = `Rep ${++count}`;
      wasDeep = deep;
    };
    if (reduced) { frame(0.9); reps.textContent = 'Rep 1'; return; }
    let visible = false, t0 = 0;
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(tick); }).observe(root);
    const tick = (t) => {
      if (!visible) return;
      if (!t0) t0 = t;
      const c = ((t - t0) / 3600) % 1;                       // one rep every 3.6s
      const p = c < 0.42 ? c / 0.42 : c < 0.55 ? 1 : c < 0.9 ? 1 - (c - 0.55) / 0.35 : 0;
      frame(p * p * (3 - 2 * p));
      requestAnimationFrame(tick);
    };
  });
})();
