Book.lab("lab-shots", function (root, K) {
  const L = K.layout(root), st = L.stats();
  const p1 = L.plot("What you take home", "Return multiple of the whole portfolio over 2,000 simulated tries. A multiple of 1 means you got your money back.");
  const p2 = L.plot("More bets pull the typical result up toward the average", "Median portfolio multiple, with the band from the 10th to the 90th percentile, against the number of bets.");
  const S = K.controls(L.side, [
    { id: "n", label: "Bets the budget is split into", min: 1, max: 200, value: 10, log: true, int: true },
    { id: "m", label: "Average return multiple of one bet", min: 0.5, max: 3, step: 0.05, value: 1.2, fmt: v => v.toFixed(2) + "×" },
    { id: "s", label: "Uncertainty of each bet (σ)", min: 0.2, max: 3, step: 0.05, value: 1.8, hint: "Each bet can lose at most its stake. Around 2 resembles venture outcomes." },
    { id: "go", type: "button", label: "Run again" }], run);
  function sim(n, R, r) {
    const mu = Math.log(S.m) - S.s * S.s / 2, out = new Float64Array(R), best = new Float64Array(R);
    for (let k = 0; k < R; k++) { let t = 0, b = 0; for (let i = 0; i < n; i++) { const v = r.lognormal(mu, S.s); t += v; if (v > b) b = v; } out[k] = t / n; best[k] = b / t; }
    return { out, best };
  }
  function run() {
    const r = K.rng(5 + S.go), a = sim(S.n, 2000, r), h = K.hist(a.out, { bins: 44, log: true, min: 0.01, max: 100 });
    let lose = 0, dbl = 0; a.out.forEach(v => { if (v < 1) lose++; if (v >= 2) dbl++; });
    K.stats(st, [
      { value: K.median(a.out).toFixed(2) + "×", label: "Typical (median) portfolio multiple" },
      { value: K.pct(lose / 2000), label: "Chance the portfolio loses money" },
      { value: K.pct(dbl / 2000), label: "Chance it at least doubles" },
      { value: K.pct(K.median(a.best)), label: "Share of the proceeds from the single best bet (median)" }]);
    p1({ x: { label: "Portfolio return multiple", log: true, min: 0.01, max: 100 }, y: { label: "Share of tries", fmt: "pct" }, series: [{ type: "steps", x: h.x, y: h.y, color: 1 }],
      marks: [{ type: "vline", x: 1, label: "break even" }, { type: "vline", x: S.m, label: "average", row: 1 }], height: 250 });
    const ns = [1, 2, 5, 10, 20, 50, 100, 200], q = ns.map(n => { const o = sim(n, 500, r).out; return [K.quantile(o, 0.1), K.quantile(o, 0.5), K.quantile(o, 0.9)]; });
    p2({ x: { label: "Number of bets", log: true }, y: { label: "Portfolio return multiple", log: true }, series: [
      { type: "band", x: ns, lo: q.map(v => v[0]), hi: q.map(v => v[2]), color: 1 }, { type: "line", x: ns, y: q.map(v => v[1]), color: 1, label: "Median" }],
      marks: [{ type: "hline", y: S.m, label: "average of one bet" }], height: 250 });
  }
  run();
});
