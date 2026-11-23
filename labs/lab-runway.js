Book.lab("lab-runway", function (root, K) {
  const L = K.layout(root), st = L.stats(), usd = v => "$" + K.fmt(v * 1000);
  const p1 = L.plot("Cash balance over time", "Twenty-five simulated companies. A path ends when the cash hits zero or when revenue reaches expenses.");
  const p2 = L.plot("When the cash runs out", "Share of all simulated companies that run out in each month. Companies that break even first are not shown.");
  const S = K.controls(L.side, [
    { id: "cash", label: "Cash in the bank", min: 0.3, max: 6, step: 0.1, value: 1.8, fmt: v => "$" + v.toFixed(1) + "M" },
    { id: "exp", label: "Monthly expenses", min: 50, max: 500, step: 10, value: 150, fmt: usd },
    { id: "rev", label: "Monthly revenue today", min: 0, max: 300, step: 5, value: 30, fmt: usd },
    { id: "g", label: "Expected revenue growth per month", min: 0, max: 0.2, step: 0.005, value: 0.08, fmt: v => K.pct(v, 1) },
    { id: "gs", label: "Uncertainty about that growth rate", min: 0, max: 0.1, step: 0.005, value: 0.04, fmt: v => "±" + K.pct(v, 1) },
    { id: "vol", label: "Month-to-month swing in cash flow", min: 0, max: 250, step: 10, value: 60, fmt: v => "±" + usd(v) },
    { id: "go", type: "button", label: "Simulate again" }], run);
  function run() {
    const r = K.rng(21 + S.go), R = 1500, T = 60, dead = [], paths = []; let alive = 0;
    for (let k = 0; k < R; k++) {
      const gi = S.g + S.gs * r.normal(); let cash = S.cash * 1000; const pth = k < 25 ? [cash / 1000] : null;
      for (let t = 1; t <= T; t++) {
        const rev = S.rev * Math.exp(gi * t);
        if (rev >= S.exp) { alive++; break; }
        cash += rev - S.exp + S.vol * r.normal(); if (pth) pth.push(Math.max(0, cash) / 1000);
        if (cash <= 0) { dead.push(t); break; }
      }
      if (pth) paths.push(pth);
    }
    const naive = S.exp > S.rev ? S.cash * 1000 / (S.exp - S.rev) : Infinity, counts = new Array(T).fill(0); dead.forEach(t => counts[t - 1]++);
    const sortedDead = dead.slice().sort((a, b) => a - b), p10 = dead.length >= R * 0.1 ? sortedDead[Math.floor(R * 0.1)] : null;
    K.stats(st, [
      { value: K.pct(dead.length / R), label: "Run out of cash before breaking even" },
      { value: K.pct(alive / R), label: "Reach break-even first" },
      { value: isFinite(naive) ? naive.toFixed(0) + " mo" : "–", label: "Spreadsheet runway: cash ÷ today's burn" },
      { value: p10 ? "month " + p10 : "–", label: "Month by which 1 company in 10 is out of cash", note: p10 ? "Plan to this, less the time it takes to raise." : "Fewer than 1 in 10 run out." }]);
    p1({ x: { label: "Months from now" }, y: { label: "Cash ($ million)" }, series: paths.map(p => ({ type: "line", x: p.map((_, i) => i), y: p, color: 1, width: 1.2, alpha: 0.55 })), marks: [{ type: "hline", y: 0 }], height: 270 });
    p2({ x: { label: "Month" }, y: { label: "Share of companies", fmt: "pct" }, series: [{ type: "bars", x: counts.map((_, i) => i + 1), y: counts.map(c => c / R), color: 2 }],
      marks: isFinite(naive) && naive <= T ? [{ type: "vline", x: naive, label: "spreadsheet runway" }] : [], height: 230 });
  }
  run();
});
