/* labkit.js: shared toolkit for the book's figures and interactive labs.
   Seeded random numbers, small statistics helpers, slider controls and a canvas plotter. */
(function (root) {
  "use strict";
  const K = {};

  /* ---------- seeded random numbers (reproducible runs) ---------- */
  K.rng = function (seed) {
    let a = (seed >>> 0) || 1, spare = null;
    const r = function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.normal = function () {
      if (spare !== null) { const s = spare; spare = null; return s; }
      let u, v, s;
      do { u = 2 * r() - 1; v = 2 * r() - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
      const m = Math.sqrt(-2 * Math.log(s) / s);
      spare = v * m; return u * m;
    };
    r.lognormal = (mu, sig) => Math.exp(mu + sig * r.normal());
    r.pareto = (alpha, xm) => (xm || 1) / Math.pow(1 - r(), 1 / alpha);
    r.exp = (mean) => -(mean || 1) * Math.log(1 - r());
    r.int = (n) => Math.floor(r() * n);
    return r;
  };

  /* ---------- statistics helpers ---------- */
  K.sum = a => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
  K.mean = a => K.sum(a) / a.length;
  K.quantile = (a, q) => {
    const s = Float64Array.from(a).sort(), p = (s.length - 1) * q, i = Math.floor(p);
    return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i);
  };
  K.median = a => K.quantile(a, 0.5);
  K.linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
  K.logspace = (a, b, n) => K.linspace(Math.log(a), Math.log(b), n).map(Math.exp);
  K.phi = z => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  K.Phi = z => {
    const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
    const e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2);
    return z >= 0 ? 0.5 * (1 + e) : 0.5 * (1 - e);
  };
  K.PhiInv = p => {
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.3577518672690, -30.66479806614716, 2.506628277459239],
      b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
      c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
      d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    let q, r;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  };
  /* histogram: returns bin centres and the fraction of samples in each bin */
  K.hist = (data, o) => {
    o = o || {}; const n = o.bins || 40, log = !!o.log, f = log ? Math.log10 : (v => v);
    let lo = o.min !== undefined ? f(o.min) : Infinity, hi = o.max !== undefined ? f(o.max) : -Infinity;
    if (o.min === undefined || o.max === undefined) for (let i = 0; i < data.length; i++) {
      const t = f(data[i]); if (!isFinite(t)) continue;
      if (o.min === undefined && t < lo) lo = t; if (o.max === undefined && t > hi) hi = t;
    }
    if (!(hi > lo)) hi = lo + 1;
    const w = (hi - lo) / n, c = new Array(n).fill(0);
    for (let i = 0; i < data.length; i++) { const t = f(data[i]); if (!(t >= lo && t <= hi)) continue; c[Math.min(n - 1, Math.floor((t - lo) / w))]++; }
    return { x: c.map((_, i) => log ? Math.pow(10, lo + (i + 0.5) * w) : lo + (i + 0.5) * w), y: c.map(v => v / Math.max(1, data.length)) };
  };

  /* ---------- number formatting ---------- */
  K.fmt = (v, d) => {
    if (v === null || v === undefined || !isFinite(v)) return "–";
    const a = Math.abs(v); d = d === undefined ? 3 : d;
    if (a === 0) return "0";
    if (a >= 1e9) return +(v / 1e9).toPrecision(d) + "B";
    if (a >= 1e6) return +(v / 1e6).toPrecision(d) + "M";
    if (a >= 1e4) return +(v / 1e3).toPrecision(d) + "k";
    if (a < 1e-3) return v.toExponential(1).replace("e-", "e−");
    return String(+v.toPrecision(d));
  };
  K.pct = (v, d) => (v * 100).toFixed(d === undefined ? 0 : d) + "%";
  const axFmt = (ax, v, d) => typeof ax.fmt === "function" ? ax.fmt(v) : ax.fmt === "pct" ? K.pct(v, Math.abs(v) < 0.1 && v !== 0 ? 1 : 0) : K.fmt(v, d);

  K.theme = () => {
    const cs = getComputedStyle(document.documentElement), g = n => cs.getPropertyValue(n).trim();
    return { s: [g("--muted"), g("--s1"), g("--s2"), g("--s3"), g("--s4")], ink: g("--ink"), ink2: g("--ink-2"), muted: g("--muted"), grid: g("--grid"), axis: g("--axis"), paper: g("--plot"), ui: g("--font-ui") || "system-ui, sans-serif" };
  };

  /* ---------- controls: sliders, selects, checkboxes, buttons ---------- */
  let uid = 0;
  K.controls = (el, defs, onChange) => {
    const state = {}, wrap = document.createElement("div"); wrap.className = "ctl"; el.appendChild(wrap);
    const u = ++uid; let pending = false;
    const fire = () => { if (pending || !onChange) return; pending = true; requestAnimationFrame(() => { pending = false; onChange(state); }); };
    defs.forEach(d => {
      const id = "ctl" + u + "-" + d.id, row = document.createElement("div"); row.className = "ctl-row ctl-" + (d.type || "range");
      if (d.type === "button") {
        state[d.id] = 0;
        const b = document.createElement("button"); b.id = id; b.type = "button"; b.textContent = d.label;
        b.addEventListener("click", () => { state[d.id]++; fire(); }); row.appendChild(b);
      } else if (d.type === "select") {
        row.innerHTML = '<label for="' + id + '">' + d.label + '</label><select id="' + id + '">' + d.options.map(o => '<option value="' + o[0] + '">' + o[1] + "</option>").join("") + "</select>";
        const s = row.querySelector("select"); s.value = d.value; state[d.id] = d.value;
        s.addEventListener("change", () => { state[d.id] = s.value; fire(); });
      } else if (d.type === "check") {
        row.innerHTML = '<label for="' + id + '"><input type="checkbox" id="' + id + '"> ' + d.label + "</label>";
        const c = row.querySelector("input"); c.checked = !!d.value; state[d.id] = !!d.value;
        c.addEventListener("change", () => { state[d.id] = c.checked; fire(); });
      } else {
        const toV = t => d.log ? Math.pow(10, t) : t, toT = v => d.log ? Math.log10(v) : v;
        row.innerHTML = '<label for="' + id + '">' + d.label + '</label><output for="' + id + '"></output><input type="range" id="' + id + '">';
        const inp = row.querySelector("input"), out = row.querySelector("output");
        inp.min = toT(d.min); inp.max = toT(d.max); inp.step = d.log ? (d.step || 0.01) : (d.step || 1); inp.value = toT(d.value);
        const read = () => { let v = toV(+inp.value); if (d.int) v = Math.round(v); state[d.id] = v; out.textContent = d.fmt ? d.fmt(v) : K.fmt(v); };
        inp.addEventListener("input", () => { read(); fire(); }); read();
      }
      if (d.hint) { const h = document.createElement("div"); h.className = "ctl-hint"; h.textContent = d.hint; row.appendChild(h); }
      wrap.appendChild(row);
    });
    return state;
  };

  K.stats = (el, items) => {
    el.className = "stats";
    el.innerHTML = items.map(i => '<div class="stat"><div class="stat-v">' + i.value + '</div><div class="stat-l">' + i.label + "</div>" + (i.note ? '<div class="stat-n">' + i.note + "</div>" : "") + "</div>").join("");
  };

  /* a bare canvas that stays crisp and redraws on resize or theme change */
  const live = new Set();
  K.reset = () => { live.forEach(p => p.destroy()); live.clear(); };
  K.redrawAll = () => live.forEach(p => p.draw());
  K.canvas = (el, height, paint) => {
    const cv = document.createElement("canvas"); cv.className = "free-canvas"; el.appendChild(cv);
    const ctx = cv.getContext("2d");
    const P = {
      cv, ctx, draw() {
        const W = el.clientWidth, dpr = window.devicePixelRatio || 1; if (!W) return;
        cv.width = Math.round(W * dpr); cv.height = Math.round(height * dpr); cv.style.height = height + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, height); paint(ctx, W, height, K.theme());
      }, destroy() { ro.disconnect(); }
    };
    const ro = new ResizeObserver(() => P.draw()); ro.observe(el); live.add(P); P.draw(); return P;
  };

  /* ---------- plotting ---------- */
  function niceStep(span, n) { const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; }
  function ticksLin(lo, hi, n) {
    const st = niceStep(hi - lo, n), out = [];
    for (let v = Math.ceil(lo / st - 1e-9) * st; v <= hi + st * 1e-9; v += st) out.push(Math.abs(v) < st * 1e-9 ? 0 : +v.toPrecision(12));
    return out;
  }
  function ticksLog(lo, hi, n) {
    const a = Math.floor(Math.log10(lo) + 1e-9), b = Math.ceil(Math.log10(hi) - 1e-9), out = [];
    let every = Math.max(1, Math.ceil((b - a) / n)); if (every > 1 && Math.floor((b - a) / every) < 2) every = Math.max(1, Math.floor((b - a) / 2));
    for (let k = a; k <= b; k += every) for (const m of (b - a <= 2 ? [1, 2, 5] : [1])) { const v = m * Math.pow(10, k); if (v >= lo * 0.999 && v <= hi * 1.001) out.push(v); }
    return out;
  }
  const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const tickFmt = (ax, v) => {
    if (!ax.log || ax.fmt) return axFmt(ax, v);
    const e = Math.round(Math.log10(v));
    if (Math.abs(v / Math.pow(10, e) - 1) > 1e-6 || (e > -4 && e < 6)) return K.fmt(v);
    return "10" + (e < 0 ? "⁻" : "") + String(Math.abs(e)).split("").map(c => SUP[+c]).join("");
  };
  function domain(vals, ax, isY) {
    let lo = Infinity, hi = -Infinity;
    for (const arr of vals) for (let i = 0; i < arr.length; i++) { const v = arr[i]; if (!isFinite(v) || (ax.log && v <= 0)) continue; if (v < lo) lo = v; if (v > hi) hi = v; }
    if (!isFinite(lo)) { lo = ax.log ? 0.1 : 0; hi = 1; }
    if (ax.log) { if (hi <= lo) hi = lo * 10; }
    else {
      if (hi <= lo) { hi = lo + 1; }
      const pad = (hi - lo) * 0.05;
      if (isY) { lo = lo >= 0 ? 0 : lo - pad; hi += pad; }
    }
    if (ax.min !== undefined) lo = ax.min; if (ax.max !== undefined) hi = ax.max;
    return [lo, hi];
  }

  K.plot = (el, spec) => {
    el.classList.add("plot");
    el.innerHTML = '<div class="plot-legend"></div><div class="plot-box"><canvas></canvas><div class="plot-tip" hidden></div></div>';
    const leg = el.children[0], box = el.children[1], cv = box.children[0], tip = box.children[1], ctx = cv.getContext("2d");
    let hover = null;
    const P = { spec, draw, update(s) { P.spec = s; draw(); }, destroy() { ro.disconnect(); } };
    const ro = new ResizeObserver(() => draw()); ro.observe(box);
    cv.addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); hover = { x: e.clientX - r.left, y: e.clientY - r.top }; draw(); });
    cv.addEventListener("pointerleave", () => { hover = null; tip.hidden = true; draw(); });
    live.add(P); draw(); return P;

    function draw() {
      const s = P.spec, T = K.theme(), W = box.clientWidth, H = s.height || 300; if (!W) return;
      const dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + "px"; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const ser = s.series || [], X = s.x || {}, Y = s.y || {}, cats = X.cats, marks = s.marks || [];
      const col = (q, i) => T.s[q.color === undefined ? (i % 4) + 1 : q.color];
      const font = (px, w) => { ctx.font = (w || 400) + " " + px + "px " + T.ui; };

      /* legend: one entry per labelled series, shown when there are two or more */
      const named = ser.filter(q => q.label);
      leg.innerHTML = named.length >= 2 ? named.map(q => '<span class="lg"><i class="lg-' + (q.type === "dots" ? "dot" : q.type === "bars" || q.type === "steps" ? "bar" : "line") + '" style="--c:' + col(q, ser.indexOf(q)) + '"></i>' + q.label + "</span>").join("") : "";

      /* direct labels at the right-hand end of lines */
      font(12);
      const ends = (s.endLabels !== false && W >= 460) ? ser.filter(q => q.label && (!q.type || q.type === "line")) : [];
      const useEnds = ends.length >= 2 && ends.length <= 5;
      const mr = useEnds ? Math.min(W * 0.3, Math.max.apply(null, ends.map(q => ctx.measureText(q.label).width)) + 14) : 16;
      const mt = 12, mb = X.label ? 44 : 26, ph = H - mt - mb;
      const xd = cats ? [0, cats.length] : domain(ser.map(q => q.x || []).concat([marks.filter(m => m.type === "vline" || m.type === "point" || m.type === "text").map(m => m.x)]), X, false);
      const yd = domain(ser.map(q => q.y || []).concat(ser.map(q => q.lo || []), ser.map(q => q.hi || []), [marks.filter(m => m.type !== "vline").map(m => m.y)]), Y, true);
      const yt = Y.log ? ticksLog(yd[0], yd[1], 6) : ticksLin(yd[0], yd[1], Math.max(3, Math.round(ph / 55)));
      font(11.5); const ytl = yt.map(v => tickFmt(Y, v));
      const ml = Math.max(38, Math.max.apply(null, ytl.map(t => ctx.measureText(t).width)) + 14 + (Y.label ? 24 : 0)), pw = W - ml - mr;
      leg.style.marginLeft = ml + "px";
      const mk = (d, ax, a, b) => ax.log ? (v => a + (Math.log(v) - Math.log(d[0])) / (Math.log(d[1]) - Math.log(d[0])) * (b - a)) : (v => a + (v - d[0]) / (d[1] - d[0]) * (b - a));
      const sxn = mk(xd, cats ? {} : X, ml, ml + pw), sy = mk(yd, Y, mt + ph, mt);
      const sx = cats ? (i => sxn(i + 0.5)) : sxn;
      const ok = (v, ax) => isFinite(v) && !(ax.log && v <= 0);

      /* grid and axes */
      const xt = cats ? [] : X.log ? ticksLog(xd[0], xd[1], Math.max(3, Math.round(pw / 90))) : ticksLin(xd[0], xd[1], Math.max(3, Math.round(pw / 90)));
      ctx.lineWidth = 1; ctx.strokeStyle = T.grid; ctx.fillStyle = T.muted; font(11.5);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      yt.forEach((v, i) => { const y = Math.round(sy(v)) + 0.5; ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(ml + pw, y); ctx.stroke(); ctx.fillText(ytl[i], ml - 8, y); });
      ctx.strokeStyle = T.axis; ctx.beginPath(); ctx.moveTo(ml, mt + ph + 0.5); ctx.lineTo(ml + pw, mt + ph + 0.5); ctx.stroke();
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      xt.forEach(v => { const x = sx(v); ctx.beginPath(); ctx.moveTo(x, mt + ph); ctx.lineTo(x, mt + ph + 4); ctx.stroke(); ctx.fillText(tickFmt(X, v), x, mt + ph + 7); });
      if (cats) cats.forEach((c, i) => ctx.fillText(c, sx(i), mt + ph + 7));
      ctx.fillStyle = T.ink2; font(12);
      if (X.label) ctx.fillText(X.label, ml + pw / 2, H - 16);
      if (Y.label) { ctx.save(); ctx.translate(11, mt + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = "middle"; ctx.fillText(Y.label, 0, 0); ctx.restore(); }

      /* series */
      ctx.save(); ctx.beginPath(); ctx.rect(ml, mt - 2, pw, ph + 2); ctx.clip();
      const y0 = sy(Y.log ? yd[0] : Math.max(yd[0], Math.min(0, yd[1])));
      const nb = ser.filter(q => q.type === "bars").length; let bi = 0;
      ser.forEach((q, i) => {
        const c = col(q, i), xs = q.x || (cats ? cats.map((_, j) => j) : []), n = xs.length;
        ctx.globalAlpha = q.alpha === undefined ? 1 : q.alpha; ctx.strokeStyle = c; ctx.fillStyle = c;
        ctx.lineWidth = q.width || 2; ctx.lineJoin = "round"; ctx.setLineDash(q.dash ? [5, 4] : []);
        if (q.type === "band") {
          ctx.globalAlpha = q.alpha === undefined ? 0.18 : q.alpha; ctx.beginPath();
          for (let j = 0; j < n; j++) ctx[j ? "lineTo" : "moveTo"](sx(xs[j]), sy(q.hi[j]));
          for (let j = n - 1; j >= 0; j--) ctx.lineTo(sx(xs[j]), sy(q.lo[j]));
          ctx.closePath(); ctx.fill();
        } else if (q.type === "dots") {
          if (q.alpha === undefined) ctx.globalAlpha = 0.6;
          for (let j = 0; j < n; j++) if (ok(xs[j], X) && ok(q.y[j], Y)) { ctx.beginPath(); ctx.arc(sx(xs[j]), sy(q.y[j]), q.r || 2.5, 0, 6.2832); ctx.fill(); }
        } else if (q.type === "bars") {
          let w; if (cats) w = pw / cats.length * 0.62 / nb; else { let g = Infinity; for (let j = 1; j < n; j++) g = Math.min(g, Math.abs(sx(xs[j]) - sx(xs[j - 1]))); w = Math.max(1, (isFinite(g) ? g : pw / 4) - 2); }
          const off = cats ? (bi - (nb - 1) / 2) * (w + 2) : 0; bi++;
          for (let j = 0; j < n; j++) {
            if (!ok(q.y[j], Y)) continue; const x = sx(xs[j]) + off - w / 2, y = sy(q.y[j]), h = y0 - y, r = Math.min(3, w / 2, Math.abs(h));
            ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y0); ctx.closePath(); ctx.fill();
          }
        } else if (q.type === "steps") {
          ctx.beginPath(); let px = null;
          for (let j = 0; j < n; j++) {
            const xl = j ? (sx(xs[j - 1]) + sx(xs[j])) / 2 : sx(xs[0]) - (n > 1 ? (sx(xs[1]) - sx(xs[0])) / 2 : 5);
            const xr = j < n - 1 ? (sx(xs[j]) + sx(xs[j + 1])) / 2 : sx(xs[j]) + (n > 1 ? (sx(xs[j]) - sx(xs[j - 1])) / 2 : 5);
            const y = ok(q.y[j], Y) ? sy(q.y[j]) : y0;
            if (px === null) ctx.moveTo(xl, y0); ctx.lineTo(xl, y); ctx.lineTo(xr, y); px = xr;
          }
          if (px !== null) ctx.lineTo(px, y0);
          ctx.stroke(); ctx.globalAlpha *= 0.14; ctx.fill();
        } else {
          ctx.beginPath(); let pen = false;
          for (let j = 0; j < n; j++) { if (!ok(xs[j], X) || !ok(q.y[j], Y)) { pen = false; continue; } ctx[pen ? "lineTo" : "moveTo"](sx(xs[j]), sy(q.y[j])); pen = true; }
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1; ctx.setLineDash([]);

      /* marks: reference lines, points and notes */
      font(11.5, 500);
      marks.forEach(m => {
        ctx.strokeStyle = T.ink2; ctx.fillStyle = T.ink2; ctx.lineWidth = 1;
        if (m.type === "vline") {
          const x = Math.round(sx(m.x)) + 0.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, mt); ctx.lineTo(x, mt + ph); ctx.stroke(); ctx.setLineDash([]);
          if (m.label) { const left = x > ml + pw * 0.7; ctx.textAlign = left ? "right" : "left"; ctx.textBaseline = "top"; ctx.fillText(m.label, x + (left ? -5 : 5), mt + 3 + (m.row || 0) * 15); }
        } else if (m.type === "hline") {
          const y = Math.round(sy(m.y)) + 0.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(ml + pw, y); ctx.stroke(); ctx.setLineDash([]);
          if (m.label) { ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(m.label, ml + pw - 5, y - 3); }
        } else {
          const x = sx(m.x), y = sy(m.y);
          if (m.type === "point") { ctx.fillStyle = T.paper; ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 6.2832); ctx.fill(); ctx.stroke(); ctx.fillStyle = T.ink2; }
          const t = m.label || m.text; if (t) { const left = m.anchor === "right" || (m.anchor !== "left" && x > ml + pw * 0.7); ctx.textAlign = left ? "right" : "left"; ctx.textBaseline = "bottom"; ctx.fillText(t, x + (left ? -8 : 8), y - 5); }
        }
      });
      ctx.restore();

      if (useEnds) {
        const pts = ends.map(q => { let j = q.x.length - 1; while (j > 0 && !(ok(q.x[j], X) && ok(q.y[j], Y) && q.x[j] <= xd[1])) j--; const yy = sy(q.y[j]); return (yy < mt - 1 || yy > mt + ph + 1 || sx(q.x[j]) < ml + pw - 14) ? null : { q, y: Math.max(mt + 6, Math.min(mt + ph - 6, yy)) }; }).filter(Boolean).sort((a, b) => a.y - b.y);
        for (let j = 1; j < pts.length; j++) if (pts[j].y - pts[j - 1].y < 14) pts[j].y = pts[j - 1].y + 14;
        ctx.textAlign = "left"; ctx.textBaseline = "middle"; font(12, 500); ctx.fillStyle = T.ink2;
        pts.forEach(p => ctx.fillText(p.q.label, ml + pw + 7, p.y));
      }
      if (s.values) { /* value labels on a single bar series */
        const q = ser.find(z => z.type === "bars"); if (q) { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; font(11.5, 500); ctx.fillStyle = T.ink2; (q.x || cats).forEach((_, j) => ctx.fillText(axFmt(Y, q.y[j]), sx(q.x ? q.x[j] : j), sy(q.y[j]) - 4)); }
      }

      /* hover: crosshair and tooltip */
      if (hover && hover.x >= ml && hover.x <= ml + pw && hover.y >= mt && hover.y <= mt + ph) {
        const rows = []; let hx = null, hv = null;
        ser.forEach((q, i) => {
          if (!q.y || q.type === "band" || (!q.label && ser.length > 1 && q.type !== "dots")) return;
          const xs = q.x || cats.map((_, j) => j); let best = -1, bd = Infinity;
          for (let j = 0; j < xs.length; j++) { if (!ok(q.y[j], Y) || (!cats && !ok(xs[j], X))) continue; const dx = sx(xs[j]) - hover.x, dy = q.type === "dots" ? sy(q.y[j]) - hover.y : 0, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = j; } }
          if (best < 0 || (q.type === "dots" && bd > 196)) return;
          if (hx === null || q.type === "dots") { hx = sx(xs[best]); hv = cats ? cats[best] : axFmt(X, xs[best], 4); }
          rows.push({ c: col(q, i), l: q.label || Y.label || "value", v: axFmt(Y, q.y[best], 4), px: sx(xs[best]), py: sy(q.y[best]) });
        });
        if (rows.length) {
          ctx.strokeStyle = T.axis; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.round(hx) + 0.5, mt); ctx.lineTo(Math.round(hx) + 0.5, mt + ph); ctx.stroke();
          rows.forEach(r => { ctx.fillStyle = r.c; ctx.strokeStyle = T.paper; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.px, r.py, 4, 0, 6.2832); ctx.fill(); ctx.stroke(); });
          tip.innerHTML = '<div class="tip-x">' + (X.label && !cats ? X.label + ": " : "") + hv + "</div>" + rows.map(r => '<div><i style="background:' + r.c + '"></i>' + r.l + " <b>" + r.v + "</b></div>").join("");
          tip.hidden = false; const tw = tip.offsetWidth;
          tip.style.left = Math.max(4, hover.x + 14 + tw > W ? hover.x - tw - 14 : hover.x + 14) + "px"; tip.style.top = Math.max(4, hover.y - 10) + "px";
        } else tip.hidden = true;
      } else tip.hidden = true;
    }
  };

  /* redraw everything when the theme or the fonts change */
  if (root.matchMedia) root.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => K.redrawAll());
  new MutationObserver(() => K.redrawAll()).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => K.redrawAll());

  root.Kit = K;
})(window);
