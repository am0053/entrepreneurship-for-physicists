/* book.js: draws the figures and mounts the interactive labs inside Quarto's pages.
   Figures: any <div class="book-fig" data-fig="f15-share"> is drawn from figures/ch15.json.
   Labs:    any <div class="lab-mount" data-lab="lab-hours"> runs labs/lab-hours.js.
   The plotting and control code lives in labkit.js (unchanged from the original web book). */
(function () {
  "use strict";
  const K = window.Kit;
  const B = (window.Book = window.Book || {});
  B.labs = {};
  B.lab = (id, fn) => { B.labs[id] = fn; };

  // Pages all sit at the top level of the site, so these relative paths work locally and on GitHub Pages.
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const loaded = {};
  const load = src => loaded[src] || (loaded[src] = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = src; s.onload = res;
    s.onerror = () => rej(new Error("Could not load " + src)); document.head.appendChild(s);
  }));
  const json = {};
  const getJSON = src => json[src] || (json[src] = fetch(src).then(r => { if (!r.ok) throw new Error(src + " " + r.status); return r.json(); }));

  /* layout helper used by every lab: controls on the left, cards on the right */
  K.layout = root => {
    root.innerHTML = '<div class="lab-body"><div class="lab-side"></div><div class="lab-main"></div></div>';
    const side = root.querySelector(".lab-side"), main = root.querySelector(".lab-main");
    return {
      side, main,
      stats() { const d = document.createElement("div"); main.appendChild(d); return d; },
      plot(title, cap) { const el = this.card(title, cap); let p; return spec => { if (p) p.update(spec); else p = K.plot(el, spec); }; },
      card(title, cap) {
        const c = document.createElement("div"); c.className = "card";
        c.innerHTML = "<h4>" + title + "</h4>" + (cap ? '<p class="cap">' + cap + "</p>" : "") + "<div></div>";
        main.appendChild(c); return c.lastChild;
      }
    };
  };

  function drawFig(el) {
    const id = el.dataset.fig, ch = "ch" + id.slice(1, 3);
    el.classList.add("fig-frame");
    getJSON("figures/" + ch + ".json").then(figs => {
      const spec = figs[id];
      if (!spec) { el.textContent = "Figure data missing: " + id; return; }
      if (spec.panels) {
        el.classList.add("fig-panels");
        spec.panels.forEach(ps => { const d = document.createElement("div"); d.innerHTML = '<div class="panel-title">' + esc(ps.title || "") + "</div><div></div>"; el.appendChild(d); K.plot(d.lastChild, ps); });
      } else { const d = document.createElement("div"); el.appendChild(d); K.plot(d, spec); }
    }).catch(e => { el.textContent = "Figure did not load (" + e.message + "). Use quarto preview rather than opening the HTML file directly."; });
  }

  function mountLab(el) {
    const id = el.dataset.lab;
    load("labs/" + id + ".js").then(() => B.labs[id](el, K))
      .catch(e => { el.textContent = "Lab did not load: " + e.message; });
  }

  /* the log-log picture on the welcome page */
  function hero(el) {
    const Q = z => z < 3 ? 1 - K.Phi(z) : K.phi(z) / z * (1 - 1 / (z * z) + 3 / Math.pow(z, 4));
    K.canvas(el, 340, (ctx, W, H, T) => {
      const ml = 96, mr = 18, mt = 16, mb = 46, pw = W - ml - mr, ph = H - mt - mb, X = v => ml + Math.log10(v) / 3 * pw, Y = p => mt + (-Math.log10(p)) / 9 * ph;
      ctx.lineWidth = 1;
      for (let d = 0; d <= 3; d++) for (let m = 1; m <= (d < 3 ? 9 : 1); m++) { ctx.strokeStyle = m === 1 ? T.axis : T.grid; const x = Math.round(X(m * Math.pow(10, d))) + 0.5; ctx.beginPath(); ctx.moveTo(x, mt); ctx.lineTo(x, mt + ph); ctx.stroke(); }
      for (let d = 0; d <= 9; d++) { ctx.strokeStyle = d % 3 === 0 ? T.axis : T.grid; const y = Math.round(Y(Math.pow(10, -d))) + 0.5; ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(ml + pw, y); ctx.stroke(); }
      ctx.font = "11.5px " + T.ui; ctx.fillStyle = T.muted; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      [["every time", 1], ["1 in 1,000", 1e-3], ["1 in a million", 1e-6], ["1 in a billion", 1e-9]].forEach(a => ctx.fillText(a[0], ml - 8, Y(a[1])));
      ctx.textAlign = "center"; ctx.textBaseline = "top"; [1, 10, 100, 1000].forEach(v => ctx.fillText(v + "×", X(v), mt + ph + 7));
      ctx.fillStyle = T.ink2; ctx.font = "12px " + T.ui; ctx.fillText("Outcome, as a multiple of the typical outcome", ml + pw / 2, H - 17);
      const curves = [["Gaussian", 1, x => Q((x - 1) / 0.5)], ["Log-normal", 3, x => Q(Math.log(x))], ["Power law", 2, x => Math.min(1, 0.5 * Math.pow(x, -1.16))]];
      ctx.save(); ctx.beginPath(); ctx.rect(ml, mt, pw, ph); ctx.clip();
      curves.forEach(c => {
        ctx.strokeStyle = T.s[c[1]]; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let i = 0; i <= 300; i++) { const x = Math.pow(10, 3 * i / 300), p = Math.max(1e-12, c[2](x)); ctx[i ? "lineTo" : "moveTo"](X(x), Y(p)); }
        ctx.stroke();
      });
      ctx.font = "600 12.5px " + T.ui; ctx.fillStyle = T.ink; ctx.textBaseline = "bottom"; ctx.textAlign = "left";
      ctx.fillText("Gaussian", X(3.1) + 8, Y(1e-5)); ctx.fillText("Log-normal", X(70), Y(1e-5) - 14); ctx.textAlign = "right"; ctx.fillText("Power law", X(900), Y(2.2e-4) - 8);
      ctx.restore();
    });
  }

  function init() {
    document.querySelectorAll(".book-fig[data-fig]").forEach(drawFig);
    document.querySelectorAll(".lab-mount[data-lab]").forEach(mountLab);
    document.querySelectorAll(".book-hero").forEach(hero);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
