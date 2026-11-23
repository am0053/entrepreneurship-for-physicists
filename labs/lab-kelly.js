/* Lab: Size the Bet.
   Each round shows a coin game with its own odds, gain and loss. The reader picks the fraction of
   wealth to stake every flip, locks it in, and then sees how it compares with the Kelly stake:
   the growth-rate curve, one simulated run with both stakes on the same flips, and a score. */
Book.lab("lab-kelly", function (root, K) {
  const L = K.layout(root), st = L.stats();
  const gameBox = L.card("This round's game", "");
  const resultBox = L.card("How your stake did", "");
  const curveEl = L.card("Long-run growth against the fraction staked", "The peak is the Kelly stake. Below zero, the typical player is ruined in the long run, even when the odds favor them."),
    pathEl = L.card("One player, 300 flips, both stakes on the same coin", "Luck can make either stake look better on a single run. The growth curve above is what wins over time.");
  const S = K.controls(L.side, [
    { id: "f", label: "Fraction of wealth to stake on every flip", min: 0, max: 1, step: 0.01, value: 0.5, fmt: v => K.pct(v) },
    { id: "lock", type: "button", label: "Lock in my stake" },
    { id: "next", type: "button", label: "New game" },
    { id: "hints", type: "check", label: "Show the edge and the spread before choosing", value: false,
      hint: "For small bets, the Kelly stake is roughly the edge divided by the variance." }
  ], update);

  let round = -1, lastNext = -1, lastLock = 0, game = null, locked = null, pCurve, pPath;
  const score = { total: 0, played: 0 };
  const growth = (g, f) => g.p * Math.log(1 + g.b * f) + (1 - g.p) * Math.log(Math.max(1e-300, 1 - g.a * f));

  function newGame() {
    round++;
    const r = K.rng(9137 + 71 * round), wantLoser = round > 1 && r() < 0.15;
    const B = [0.25, 0.5, 0.75, 1, 1.5, 2, 3], A = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
    let g;
    for (let tries = 0; tries < 500; tries++) {
      g = { p: Math.round(20 * (0.3 + 0.45 * r())) / 20, b: B[r.int(B.length)], a: A[r.int(A.length)] };
      const k = g.p / g.a - (1 - g.p) / g.b;
      if (wantLoser ? (k < 0 && k > -0.6) : (k >= 0.04 && k <= 0.65 && Math.abs(k - 0.5) > 0.04 && r() < 1.15 - 1.4 * k)) break;
    }
    g.edge = g.p * g.b - (1 - g.p) * g.a;
    g.vari = g.p * g.b * g.b + (1 - g.p) * g.a * g.a - g.edge * g.edge;
    g.kelly = Math.max(0, Math.min(1, g.p / g.a - (1 - g.p) / g.b));
    const flip = K.rng(5003 + 13 * round);
    g.flips = Array.from({ length: 300 }, () => flip() < g.p);
    game = g; locked = null;
  }

  const money = v => "$" + (v < 0.005 ? "0" : v.toFixed(2));
  const perRound = v => (v >= 0 ? "+" : "−") + K.pct(Math.abs(v), Math.abs(v) < 0.1 ? 2 : 1);

  function verdict(g, f) {
    const gf = growth(g, f), gk = growth(g, g.kelly), typ = Math.exp(gf) - 1;
    if (g.kelly === 0) return f <= 0.01
      ? { ok: true, pts: 100, text: "<strong>Correct: don't play.</strong> The expected value of this game is negative, so every stake above zero loses money in the long run. The best bet is no bet." }
      : { ok: false, pts: 0, text: "<strong>This game can't be won.</strong> The expected value is negative (" + perRound(g.edge) + " per dollar staked), so the best stake is zero. At " + K.pct(f) + " the typical player changes " + perRound(typ) + " a round." };
    const ratio = gf / gk, pts = Math.max(0, Math.round(100 * ratio));
    const cap = "You kept " + K.pct(Math.max(ratio, -9.99)) + " of the best possible long-run growth.";
    if (ratio >= 0.95) return { ok: true, pts, text: "<strong>Excellent.</strong> " + cap + " Near the peak the curve is flat, so being a little off costs almost nothing." };
    if (ratio >= 0.8) return { ok: true, pts, text: "<strong>Close.</strong> " + cap + " You were a little " + (f < g.kelly ? "cautious" : "aggressive") + ", but near the peak the curve is flat, so it cost you little." };
    if (gf <= 0) return { ok: false, pts, text: "<strong>Ruinous.</strong> The odds favor you, yet at " + K.pct(f) + " the typical player changes " + perRound(typ) + " a round. Overbetting has turned a winning game into a losing one." };
    if (f < g.kelly) return { ok: false, pts, text: "<strong>Too cautious.</strong> " + cap + " Underbetting is the gentle mistake: you grow more slowly, but you never risk ruin." };
    return { ok: false, pts, text: "<strong>Too aggressive.</strong> " + cap + " Past the peak the curve falls steeply: every extra point of stake costs more growth than the last, and at about twice the Kelly stake growth reaches zero." };
  }

  function show(el, on) { el.parentNode.style.display = on ? "" : "none"; }

  function update(state) {
    if (state.next !== lastNext) { lastNext = state.next; newGame(); }
    if (state.lock !== lastLock) {
      lastLock = state.lock;
      if (locked === null) { locked = state.f; const v = verdict(game, locked); score.played++; score.total += v.pts; }
    }
    const g = game, f = state.f, revealed = locked !== null;

    gameBox.innerHTML = '<p class="kelly-game">A coin lands heads <b>' + K.pct(g.p) + "</b> of the time. On heads, each dollar you stake <b>comes back as " + money(1 + g.b) + "</b> (a gain of " + money(g.b) +
      "). On tails, each dollar you stake <b>comes back as " + money(1 - g.a) + "</b> (" + (g.a >= 1 ? "you lose the whole dollar" : "a loss of " + money(g.a)) + "). You stake the same fraction of your current wealth on every flip, forever. " +
      "What fraction maximizes your wealth in the long run?</p>";

    const tiles = [{ value: score.played ? Math.round(score.total / score.played) + " / 100" : "–", label: "Your average score (" + score.played + " played)" }];
    if (state.hints || revealed) tiles.push(
      { value: perRound(g.edge), label: "Edge: expected gain per dollar staked" },
      { value: g.vari.toFixed(3), label: "Variance of the gain per dollar staked" },
      { value: K.pct(Math.max(0, g.edge / g.vari)), label: "Edge ÷ variance (rough guide)" });
    if (revealed) tiles.push({ value: K.pct(g.kelly), label: "Kelly stake, exact" });
    K.stats(st, tiles);

    show(resultBox, revealed); show(curveEl, revealed); show(pathEl, revealed);
    if (!revealed) return;

    const v = verdict(g, locked);
    resultBox.innerHTML = '<p class="guess-result ' + (v.ok ? "is-right" : "is-wrong") + '">You locked in <b>' + K.pct(locked) + "</b>; the Kelly stake is <b>" + K.pct(g.kelly) + "</b>. " + v.text +
      " Score: <b>" + v.pts + " / 100</b>.</p><p class=\"cap\">Move the slider to explore other stakes on this game, then press New game. Typical growth per round at the slider's stake: <b>" +
      perRound(Math.exp(growth(g, f)) - 1) + "</b>; at the Kelly stake: <b>" + perRound(Math.exp(growth(g, g.kelly)) - 1) + "</b>.</p>";

    const fs = K.linspace(0, g.a >= 1 ? 0.99 : 1, 151), gs = fs.map(x => 100 * growth(g, x)), gk = 100 * growth(g, g.kelly);
    const lo = Math.max(Math.min.apply(null, gs), g.kelly > 0 ? -4 * Math.max(gk, 0.2) : -6);
    const side = x => x < g.kelly ? "right" : "left";   /* put each label on the far side from the Kelly point */
    const marks = [{ type: "hline", y: 0 }, { type: "point", x: g.kelly, y: gk, label: "Kelly", anchor: locked < g.kelly ? "left" : "right" },
      { type: "point", x: locked, y: Math.max(lo, 100 * growth(g, locked)), label: "locked in", anchor: side(locked) }];
    if (Math.abs(f - locked) > 0.005) marks.push({ type: "point", x: f, y: Math.max(lo, 100 * growth(g, f)), label: "slider", anchor: side(f) });
    const curveSpec = { x: { label: "Fraction staked", fmt: "pct", min: 0, max: 1 }, y: { label: "Growth per round (%)", min: lo, max: Math.max(0.5, 1.3 * gk + 0.2) },
      series: [{ type: "line", x: fs, y: gs.map(y => Math.max(lo, y)), color: 1 }], marks, height: 240 };
    if (pCurve) pCurve.update(curveSpec); else pCurve = K.plot(curveEl, curveSpec);

    const run = s => { let w = 1; const out = [1]; g.flips.forEach(h => { w *= h ? 1 + g.b * s : 1 - g.a * s; out.push(Math.max(w, 1e-12)); }); return out; };
    const t = Array.from({ length: 301 }, (_, i) => i), yours = run(f), kel = run(g.kelly);
    const all = yours.concat(kel), ymin = Math.max(1e-12, Math.min.apply(null, all)), ymax = Math.max.apply(null, all);
    const pathSpec = { x: { label: "Flip" }, y: { label: "Wealth (start = 1)", log: true, min: Math.min(0.5, ymin), max: Math.max(2, ymax) },
      series: [{ type: "line", x: t, y: kel, label: "Kelly stake, " + K.pct(g.kelly), color: 3 },
               { type: "line", x: t, y: yours, label: "Slider stake, " + K.pct(f), color: 2 }], height: 260, endLabels: false };
    if (pPath) pPath.update(pathSpec); else pPath = K.plot(pathEl, pathSpec);
  }
  update(S);
});
