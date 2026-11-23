/* Lab: Guess the Distribution.
   Each round draws a hidden distribution (Gaussian, log-normal, or power law with 1 < alpha < 2),
   shows the reader raw values and a histogram, and asks them to name the family. */
Book.lab("lab-guess", function (root, K) {
  const L = K.layout(root), st = L.stats();
  const answerBox = L.card("Your guess", "Which family did these numbers come from?");
  const p1 = L.plot("Histogram of the values", "Counts per bin. Switch to logarithmic bins in the panel on the left to spread out the small values.");
  const tableBox = L.card("The raw values, in the order they were drawn", "");
  const MAX = 1000, NAMES = { g: "Gaussian", l: "Log-normal", p: "Power law" };
  const S = K.controls(L.side, [
    { id: "n", label: "Number of data points to show", min: 10, max: MAX, value: 20, log: true, int: true, hint: "Showing more points reveals more of the same hidden sample." },
    { id: "logbins", type: "check", label: "Logarithmic bins in the histogram", value: false },
    { id: "clues", type: "check", label: "Show summary statistics", value: false },
    { id: "go", type: "button", label: "New mystery sample" }
  ], update);
  let round = -1, lastGo = -1, hidden = null, data = null, guessed = null;
  const score = { right: 0, played: 0 };

  function newRound() {
    round++;
    const r = K.rng(4211 + 97 * round), kind = ["g", "l", "p"][r.int(3)], scale = Math.pow(10, 1 + 2.5 * r());
    let p, draw;
    if (kind === "g") { p = 0.1 + 0.25 * r(); draw = () => { let v; do { v = 1 + p * r.normal(); } while (v <= 0); return v; }; }
    else if (kind === "l") { p = 0.5 + 1.0 * r(); draw = () => r.lognormal(0, p); }
    else { p = 1.1 + 0.8 * r(); draw = () => r.pareto(p); }
    data = Array.from({ length: MAX }, () => scale * draw());
    hidden = { kind, p }; guessed = null;
  }
  const fmt = v => v >= 1e5 ? v.toExponential(2).replace("e+", "e") : v >= 100 ? Math.round(v).toLocaleString("en-US") : v.toPrecision(3);
  const param = h => h.kind === "g" ? "spread " + Math.round(100 * h.p) + "% of the mean" : h.kind === "l" ? "σ = " + h.p.toFixed(2) : "α = " + h.p.toFixed(2);

  function renderAnswer() {
    if (!guessed) {
      answerBox.innerHTML = '<div class="guess-btns">' + ["g", "l", "p"].map(k => '<button type="button" data-k="' + k + '">' + NAMES[k] + (k === "p" ? " (α < 2)" : "") + "</button>").join("") + "</div>";
      answerBox.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
        guessed = b.dataset.k; score.played++; if (guessed === hidden.kind) score.right++; update(S);
      }));
    } else {
      const ok = guessed === hidden.kind;
      answerBox.innerHTML = '<p class="guess-result ' + (ok ? "is-right" : "is-wrong") + '"><strong>' + (ok ? "Correct." : "Not this time.") + "</strong> It was a " + NAMES[hidden.kind].toLowerCase() +
        " distribution (" + param(hidden) + ")" + (ok ? "." : ", and you guessed " + NAMES[guessed].toLowerCase() + ".") +
        " Raise the number of data points to see how the evidence looks with more data, or draw a new mystery sample.</p>";
    }
  }

  function update(state) {
    if (state.go !== lastGo) { lastGo = state.go; newRound(); }
    const x = data.slice(0, state.n), s = x.slice().sort((a, b) => a - b), med = K.median(x), mean = K.mean(x);
    let total = 0; x.forEach(v => total += v);
    const tiles = [{ value: score.right + " of " + score.played, label: "Your score so far" }];
    if (state.clues) tiles.push(
      { value: (mean / med).toFixed(2), label: "Mean ÷ median" },
      { value: K.fmt(s[s.length - 1] / med), label: "Largest value ÷ median" },
      { value: K.pct(s[s.length - 1] / total, 1), label: "Largest value's share of the total" });
    K.stats(st, tiles);
    renderAnswer();
    const h = K.hist(x, { bins: Math.max(6, Math.min(40, Math.round(2 * Math.sqrt(x.length)))), log: state.logbins, min: state.logbins ? s[0] : 0 });
    p1({ x: { label: "Value", log: state.logbins, min: state.logbins ? undefined : 0 }, y: { label: "Number of values" },
      series: [{ type: "steps", x: h.x, y: h.y.map(v => Math.round(v * x.length)), color: 1 }], height: 240 });
    tableBox.innerHTML = '<div class="data-grid">' + x.map((v, i) => '<span title="value ' + (i + 1) + '">' + fmt(v) + "</span>").join("") + "</div>";
  }
  update(S);
});
