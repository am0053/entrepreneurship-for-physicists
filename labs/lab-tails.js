Book.lab("lab-tails", function (root, K) {
  const L = K.layout(root), st = L.stats();
  const p1 = L.plot("Running average as the sample grows", "The dashed line is the true mean. Fat-tailed samples sit below it for long stretches and then jump.");
  const p2 = L.plot("Share of draws above each value", "Logarithmic axes. A straight line is a power law. A cliff is a thin tail.");
  const S = K.controls(L.side, [
    { id: "dist", type: "select", label: "Where the randomness comes from", value: "pareto", options: [["normal", "Gaussian: errors add"], ["lognormal", "Log-normal: factors multiply"], ["pareto", "Power law: success feeds itself"]] },
    { id: "w", label: "Tail weight", min: 0, max: 1, step: 0.01, value: 0.9, hint: "0 is the thinnest tail this family allows, 1 the fattest." },
    { id: "n", label: "Number of draws", min: 10, max: 100000, value: 3000, log: true, int: true },
    { id: "go", type: "button", label: "Draw a new sample" }
  ], run);
  function run() {
    const r = K.rng(11 + S.go), n = S.n, d = S.dist, x = new Float64Array(n), cum = new Float64Array(n);
    const p = d === "normal" ? 0.05 + 0.45 * S.w : d === "lognormal" ? 0.2 + 2.3 * S.w : 3 - 1.95 * S.w;
    const mean = d === "normal" ? 1 : d === "lognormal" ? Math.exp(p * p / 2) : p / (p - 1);
    let s = 0;
    for (let i = 0; i < n; i++) {
      x[i] = d === "normal" ? Math.max(0.001, 1 + p * r.normal()) : d === "lognormal" ? r.lognormal(0, p) : r.pareto(p);
      s += x[i]; cum[i] = s / (i + 1);
    }
    const sorted = Float64Array.from(x).sort().reverse(), top = Math.max(1, Math.round(n / 100));
    let ts = 0; for (let i = 0; i < top; i++) ts += sorted[i];
    K.stats(st, [
      { value: (d === "normal" ? "sd = " : d === "lognormal" ? "σ = " : "α = ") + p.toFixed(2), label: "Tail parameter in use" },
      { value: K.fmt(s / n / mean), label: "Sample mean ÷ true mean" },
      { value: K.pct(sorted[0] / s, 1), label: "Largest single draw, as a share of the total" },
      { value: K.pct(ts / s), label: "Top 1% of draws, as a share of the total" }]);
    const idx = Array.from(new Set(K.logspace(1, n, 140).map(Math.round)));
    p1({ x: { label: "Number of draws so far", log: true }, y: { label: "Running average ÷ true mean", min: 0, max: 3 }, series: [{ type: "line", x: idx, y: idx.map(i => cum[i - 1] / mean), color: 1 }], marks: [{ type: "hline", y: 1, label: "true mean" }], height: 250 });
    p2({ x: { label: "Value", log: true }, y: { label: "Share of draws above this value", log: true }, series: [{ type: "line", x: idx.map(i => sorted[i - 1]), y: idx.map(i => i / n), color: 2 }], height: 250 });
  }
  run();
});
