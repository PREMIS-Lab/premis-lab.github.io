import * as THREE from "three";
import { CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import { MindARThree } from "./vendor/mindar-image-three.prod.js";

const A = "assets/";
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, html = "") => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (html) e.innerHTML = html;
  return e;
};
const fmt = (x, d = 3) => Number(x).toFixed(d);

// The five poster figures, in the order of the image targets in targets.mind.
const FIGS = [
  { fig: "Figure 1", title: "How ESPWA reads a slide", blurb: "From a whole slide to tiles, features, attention and a prediction, on a real slide.", aspect: 1440 / 1806, render: renderMIL, teaser: teaserMIL },
  { fig: "Figure 2", title: "Why train on Haitian slides?", blurb: "A model trained on US slides loses accuracy in Haiti; the slides look different to it.", aspect: 2400 / 3600, render: renderShift, teaser: teaserShift },
  { fig: "Figure 3", title: "Can you tell ER status from H&E?", blurb: "Six hard cases that ESPWA got wrong. Try them yourself.", aspect: 2040 / 4290, render: renderQuiz, teaser: teaserQuiz },
  { fig: "Figure 4", title: "Artifacts on real slides", blurb: "Folds, dark spots and blur on slides made in Haiti, and where ESPWA looked.", aspect: 871 / 2184, render: renderArtifacts, teaser: teaserArtifacts },
  { fig: "Figure 5", title: "Where ESPWA looks, and what it would change", blurb: "Explore attention on six slides and how a threshold would change treatment.", aspect: 541 / 1428, render: renderLooks, teaser: teaserLooks },
];

/* ---------- Home ---------- */
const menu = $("#menu");
FIGS.forEach((f, i) => {
  const c = el("button", { class: "card" },
    `<img src="${A}targets/fig${i + 1}_thumb.jpg" alt=""><div><p class="eyebrow">Poster ${f.fig}</p><h3>${f.title}</h3><p>${f.blurb}</p></div>`);
  c.onclick = () => openSheet(i);
  menu.appendChild(c);
});

/* ---------- Sheet ---------- */
let arWasOn = false;
function openSheet(i) {
  if (mindar) { arWasOn = true; stopAR(); }
  $("#sheetFig").textContent = `Poster ${FIGS[i].fig}`;
  const body = $("#sheetBody");
  body.innerHTML = "";
  FIGS[i].render(body);
  $("#sheet").hidden = false;
  $("#sheet").scrollTop = 0;
}
$("#sheetClose").onclick = () => {
  $("#sheet").hidden = true;
  $("#sheetBody").innerHTML = "";
  if (arWasOn) { arWasOn = false; startAR(); }
};

/* ---------- Colors ---------- */
function jet(t) {
  const c = (x) => Math.max(0, Math.min(1, x));
  const r = c(1.5 - Math.abs(4 * t - 3)), g = c(1.5 - Math.abs(4 * t - 2)), b = c(1.5 - Math.abs(4 * t - 1));
  return `rgba(${r * 255 | 0},${g * 255 | 0},${b * 255 | 0},0.42)`;
}
function featureView(tiles) {
  // Standardize each of the 768 dimensions across the twelve tiles, and sort the dimensions by
  // how much they separate the six highest-attention tiles from the three lowest.
  const n = tiles[0].feat.length, k = tiles.length;
  const mu = [], sd = [], diff = [];
  for (let d = 0; d < n; d++) {
    const xs = tiles.map((t) => t.feat[d]);
    const m = xs.reduce((a, b) => a + b, 0) / k;
    mu.push(m);
    sd.push(Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / k) || 1);
    const hi = xs.slice(0, 6).reduce((a, b) => a + b, 0) / 6, lo = xs.slice(-3).reduce((a, b) => a + b, 0) / 3;
    diff.push(hi - lo);
  }
  const order = [...Array(n).keys()].sort((a, b) => diff[b] / sd[b] - diff[a] / sd[a]);
  return { order, mu, sd };
}
function drawFeatures(canvas, v, fv) {
  const cols = 32, rows = Math.ceil(v.length / cols);
  canvas.width = cols; canvas.height = rows;
  const ctx = canvas.getContext("2d");
  const mix = (a, b, t) => Math.round(a + (b - a) * t);
  fv.order.forEach((d, k) => {
    const z = Math.max(-2, Math.min(2, (v[d] - fv.mu[d]) / fv.sd[d])) / 2;
    const [r, g, b] = z >= 0 ? [mix(255, 106, z), mix(255, 27, z), mix(255, 154, z)]
                             : [mix(255, 224, -z), mix(255, 138, -z), mix(255, 60, -z)];
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(k % cols, Math.floor(k / cols), 1, 1);
  });
}

/* ---------- 1. MIL ---------- */
let MIL = null;
async function milData() {
  if (!MIL) MIL = await (await fetch(`${A}mil/mil.json`)).json();
  return MIL;
}

function teaserMIL() {
  return el("div", { class: "teaser" }, `
    <div class="tt">How ESPWA reads a slide</div>
    <div class="tb"><img src="${A}mil/wsi.jpg" alt=""><img class="fade" src="${A}mil/wsi_att.jpg" alt=""></div>
    <div class="tap">A real slide from Haiti: red is where ESPWA paid attention. Tap Open to follow it step by step.</div>`);
}

async function renderMIL(body) {
  const m = await milData();
  const gpx = (m.wsi_mm[0] * 1000 / 0.2448) * (m.wsi_mm[1] * 1000 / 0.2448) / 1e9;
  body.appendChild(el("h2", {}, "How ESPWA reads a slide"));
  body.appendChild(el("p", { class: "muted" }, "Multiple instance learning on one real slide from Zanmi Lasante: ER-negative invasive ductal carcinoma, grade 3."));
  const stepper = el("div", { class: "stepper" });
  const back = el("button", { class: "btn ghost" }, "Back");
  const next = el("button", { class: "btn primary" }, "Next");
  const dots = el("div", { class: "dots" });
  stepper.append(back, dots, next);
  const view = el("div");
  body.append(stepper, view);

  const tilesHTML = (withBars) => `<div class="tiles">${m.tiles.map((t) => `
      <figure><img src="${A}mil/tiles/${t.file}" alt="">
      ${withBars ? `<div class="w" style="width:${Math.max(4, t.pct * 100)}%"></div><figcaption>${rank(t.pct)}</figcaption>`
                 : `<canvas data-k="${t.file}"></canvas>`}</figure>`).join("")}</div>`;
  const z = m.zoom;
  const fv = featureView(m.tiles);
  const rank = (p) => p >= 0.99 ? "top 1%" : p <= 0.01 ? "bottom 1%" : Math.abs(p - 0.5) < 0.02 ? "median" : `${Math.round(p * 100)}th pct`;
  const steps = [
    () => `<h3>1 · One whole slide</h3>
      <div class="stage"><img src="${A}mil/wsi.jpg" alt=""></div>
      <p>This H&amp;E slide holds ${m.wsi_mm[0]} × ${m.wsi_mm[1]} mm of tissue. Scanned at 40x it is about ${gpx.toFixed(1)} billion pixels, far too large for a neural network to read in one piece.</p>`,
    () => `<h3>2 · Zoom in</h3>
      <div class="stage"><img src="${A}mil/wsi.jpg" alt=""><div class="zbox" style="left:${z.x * 100}%;top:${z.y * 100}%;width:${z.w * 100}%;height:${z.h * 100}%"></div></div>
      <div class="stage" style="margin-top:8px"><img src="${A}mil/zoom.jpg" alt=""></div>
      <p>The black square is ${(z.um / 1000).toFixed(1)} mm wide and sits on the border of the tumor. At 20x, the tumor cells and the stroma around them become visible.</p>`,
    () => `<h3>3 · Cut into tiles</h3>
      <div class="stage"><img src="${A}mil/zoom.jpg" alt=""><div class="grid">${m.grid.map((g) =>
        `<div style="left:${g.x * 100}%;top:${g.y * 100}%;width:${g.s * 100}%;height:${g.s * 100}%"></div>`).join("")}</div></div>
      <p>ESPWA cuts the tissue into tiles of 256 × 256 pixels at 20x (${Math.round(m.tile_um)} µm per side). This slide gives ${m.n_tiles.toLocaleString("en-US")} tiles; the square above holds ${m.grid.length}. The slide has one label, ER-negative by IHC, but no tile has its own label: this is what <i>multiple instance learning</i> handles.</p>`,
    () => `<h3>4 · Each tile becomes ${m.feat_dim} numbers</h3>
      <div class="flow"><div class="node">Tile, 20x</div><div>→</div><div class="node">CONCH v1.5<br><span style="font-weight:400">frozen encoder</span></div></div>
      ${tilesHTML(false)}
      <p>A pathology foundation model (CONCH v1.5), trained on pathology images and their captions, turns each tile into ${m.feat_dim} numbers that describe what it shows. The strip under each tile shows its real ${m.feat_dim} numbers, purple when higher than in the other tiles and orange when lower, with the numbers sorted so that those that differ most between tumor and stroma come first. The six tumor tiles share one pattern; stroma and fat share the opposite one.</p>`,
    () => `<h3>5 · Attention: which tiles matter</h3>
      <div class="stage"><img src="${A}mil/zoom.jpg" alt=""><div class="grid">${m.grid.map((g) =>
        `<div style="left:${g.x * 100}%;top:${g.y * 100}%;width:${g.s * 100}%;height:${g.s * 100}%;background:${jet(g.p)}"></div>`).join("")}</div></div>
      ${tilesHTML(true)}
      <p>A small attention network gives every tile a weight. In the square above, attention is high on the tumor (red) and low on the stroma (blue). Over the whole slide, the top 10% of tiles hold ${Math.round(m.att_top10pct_share * 100)}% of the attention; the tiles ranked highest are tumor cells and the lowest are stroma and fat. Nobody told the model where the tumor was.</p>`,
    () => `<h3>6 · From ${m.n_tiles.toLocaleString("en-US")} tiles to one slide</h3>
      <div class="flow"><div class="node">${m.n_tiles.toLocaleString("en-US")} tile vectors</div><div>×</div><div class="node">attention weights</div></div>
      <div class="flow"><div></div><div>↓</div><div></div></div>
      <div class="flow"><div class="node">one slide vector<br><span style="font-weight:400">weighted average</span></div><div>→</div><div class="node">classifier<br><span style="font-weight:400">P(ER-positive)</span></div></div>
      <div class="stage"><img src="${A}mil/wsi_att.jpg" alt=""></div>
      <p>ESPWA averages the tile vectors, each weighted by its attention, into one vector for the whole slide. A small classifier turns that vector into the probability that the tumor is ER-positive. The attention network and the classifier are what ESPWA learned from the Haitian training slides; CONCH stays fixed.</p>`,
    () => `<h3>7 · Prediction</h3>
      <div class="gauge"><i style="left:calc(${m.prob_pos * 100}% - 2px)"></i><span style="left:0">0 · ER-negative</span><span style="right:0">ER-positive · 1</span></div>
      <p class="big" style="margin-top:28px">P(ER+) = ${fmt(m.prob_pos, 2)}</p>
      <div class="verdict ok"><b>ESPWA: ER-negative · IHC: ER-negative</b></div>
      <p>Endocrine therapy only helps ER-positive tumors. Where IHC is not available, this result would argue against giving it, sparing the patient its side effects.</p>
      <p class="cap">Out-of-fold prediction from ten-fold cross-validation: the slide was not used to train the model that scored it.</p>`,
  ];
  let i = 0;
  const show = () => {
    view.innerHTML = steps[i]();
    view.querySelectorAll("canvas[data-k]").forEach((c) => drawFeatures(c, m.tiles.find((t) => t.file === c.dataset.k).feat, fv));
    dots.innerHTML = steps.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("");
    back.disabled = i === 0;
    next.textContent = i === steps.length - 1 ? "Start over" : "Next";
  };
  back.onclick = () => { i = Math.max(0, i - 1); show(); };
  next.onclick = () => { i = i === steps.length - 1 ? 0 : i + 1; show(); };
  show();
}

/* ---------- 2. Domain shift ---------- */
const BARS = [
  ["TCGA model, tested on TCGA (US)", 0.846, "--tcga"],
  ["Same model, on Haitian slides (ZL)", 0.671, "--tcgazl"],
  ["ESPWA, trained on Haitian slides", 0.790, "--espwa"],
  ["ESPWA, same patients, slides made at BWH", 0.794, "--bwh"],
  ["ESPWA, same patients, slides made in Haiti", 0.805, "--mir"],
];
function teaserShift() {
  return el("div", { class: "teaser" }, `
    <div class="tt">Why train on Haitian slides?</div>
    <div class="tb" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 20px"><img src="${A}umap/dataset.png" alt=""><img src="${A}umap/er.png" alt=""></div>
    <div class="tap">Each dot is a slide. They group by where they were made, not by ER status. Tap Open.</div>`);
}
function renderShift(body) {
  body.innerHTML = `<h2>Why train on Haitian slides?</h2>
    <p class="muted">AUROC for ER status; bars start at 0.5 (chance) and end at 1.0 (perfect).</p>
    <div class="bars">${BARS.map(([l, v, c], k) => `<div class="row" data-k="${k}"><div class="lab">${l}</div>
      <div class="track"><div class="bar" style="background:var(${c})" data-v="${v}"></div></div><div class="val" style="color:var(${c})">${fmt(v)}</div></div>`).join("")}</div>
    <p class="cap">ESPWA vs the TCGA model on ZL: p = 0.005 (DeLong). BWH- vs Mirebalais-prepared slides: p = 0.753.</p>
    <h3>The slides look different to the model</h3>
    <div class="pair"><img src="${A}umap/dataset.png" alt="UMAP by dataset"><img src="${A}umap/er.png" alt="UMAP by ER status"></div>
    <p>Each dot is one slide, placed by the average of its tile features (UMAP). TCGA slides and Haitian slides form separate groups, and so do the slides of the same patients prepared in Mirebalais. Within each group, ER-positive and ER-negative slides are mixed: the largest differences come from where the slide was made, not from ER status.</p>
    <h3>Fixes that did not close the gap</h3>
    <table class="t"><tr><th>Method</th><th>AUROC</th></tr>
      <tr><td>TCGA model + domain adaptation to unlabeled Haitian slides (CORAL)</td><td class="n">0.708</td></tr>
      <tr><td>TCGA model without it</td><td class="n">0.698</td></tr>
      <tr><td>ESPWA with stain normalization (Macenko), 2,782 slides</td><td class="n">0.775</td></tr>
      <tr><td>ESPWA without it, same slides</td><td class="n">0.773</td></tr></table>
    <p>Neither method brings a US-trained model to ESPWA's level: the model needs Haitian training data.</p>`;
  const rows = body.querySelectorAll(".bars .row");
  rows.forEach((r, k) => setTimeout(() => {
    r.classList.add("on");
    const b = r.querySelector(".bar");
    b.style.width = `${(b.dataset.v - 0.5) / 0.5 * 100}%`;
  }, 300 + k * 900));
}

/* ---------- 3. Quiz ---------- */
const CASES = [
  { id: "fn1", pos: true, ihc: "ER-positive, low (10%)", desc: "Primary tumor, grade 3, invasive ductal carcinoma", p: 0.014 },
  { id: "fp1", pos: false, ihc: "ER-negative", desc: "Primary tumor, grade 2, invasive ductal carcinoma", p: 0.944 },
  { id: "fn2", pos: true, ihc: "ER-positive (20%)", desc: "Primary tumor, grade 3, invasive ductal carcinoma", p: 0.087 },
  { id: "fp2", pos: false, ihc: "ER-negative", desc: "Primary tumor, grade 3, invasive ductal carcinoma", p: 0.962 },
  { id: "fn3", pos: true, ihc: "ER-positive (95%)", desc: "Lymph node metastasis, grade 3, invasive ductal carcinoma", p: 0.136 },
  { id: "fp3", pos: false, ihc: "ER-negative", desc: "Lymph node metastasis, grade 2, invasive lobular carcinoma with signet ring cells", p: 0.907 },
];
function teaserQuiz() {
  return el("div", { class: "teaser" }, `
    <div class="tt">Can you tell ER status from H&amp;E?</div>
    <div class="quiz">${["fn1", "fp2", "fn3"].map((c) => `<div><img src="${A}cases/${c}_zoom.jpg" alt=""><span>?</span></div>`).join("")}</div>
    <div class="tap">Six hard cases that ESPWA got wrong. Tap Open and try them.</div>`);
}
function renderQuiz(body) {
  let i = 0, score = 0;
  const draw = () => {
    if (i === CASES.length) {
      body.innerHTML = `<h2>You got ${score} of ${CASES.length}</h2>
        <p>ESPWA got all six wrong: we picked them from its errors. These are slides where morphology and ER status disagree, such as ER-low tumors that look ER-negative.</p>
        <div class="stats"><div class="stat"><div class="big" style="color:var(--espwa)">0.726</div><div class="lab">ESPWA accuracy, 3,448 slides</div></div>
        <div class="stat"><div class="big" style="color:var(--path)">0.639</div><div class="lab">Breast pathologist (22 years of experience), 2,322 slides</div></div></div>
        <p class="cap">p &lt; 0.001 (McNemar). ESPWA was significantly more accurate in 8 of 11 subgroups.</p>
        <button class="btn ghost" id="again">Try again</button>`;
      $("#again", body).onclick = () => { i = 0; score = 0; draw(); };
      return;
    }
    const c = CASES[i];
    body.innerHTML = `<h2>Case ${i + 1} of ${CASES.length}</h2>
      <p class="muted">${c.desc}. Tumor at 20x, 100 µm scale bar.</p>
      <div class="quizimg"><img src="${A}cases/${c.id}_zoom.jpg" alt=""></div>
      <div class="answer"><button class="btn ghost" data-a="1">ER-positive</button><button class="btn ghost" data-a="0">ER-negative</button></div>
      <div id="reveal"></div>`;
    body.querySelectorAll("[data-a]").forEach((b) => b.onclick = () => {
      const right = (b.dataset.a === "1") === c.pos;
      if (right) score += 1;
      body.querySelectorAll("[data-a]").forEach((x) => x.disabled = true);
      $("#reveal", body).innerHTML = `
        <div class="verdict ${right ? "ok" : "no"}"><b>${right ? "Right" : "Not quite"}.</b> IHC: ${c.ihc}.</div>
        <p>ESPWA gave P(ER+) = ${fmt(c.p, 2)}, so it called this tumor <b>${c.p >= 0.5 ? "ER-positive" : "ER-negative"}</b>: wrong.</p>
        <div class="pair"><img src="${A}cases/${c.id}_he.jpg" alt=""><img src="${A}cases/${c.id}_att.jpg" alt=""></div>
        <p class="cap">Left: the whole slide. Right: ESPWA's attention (red high, blue low).</p>
        <button class="btn primary" id="nextCase">${i === CASES.length - 1 ? "See your score" : "Next case"}</button>`;
      $("#nextCase", body).onclick = () => { i += 1; draw(); $("#sheet").scrollTop = 0; };
    });
  };
  draw();
}

/* ---------- 4. Artifacts ---------- */
const ART = [
  ["a", "BWH-prepared, false negative", "Densely cellular tumor with necrosis in patch 4."],
  ["b", "BWH-prepared, false positive", "Single-cell necrosis and nuclei with prominent nucleoli at high power, in tissue that looks benign at low power."],
  ["c", "Mirebalais-prepared, false negative", "Poorly preserved cells with a high nuclear-to-cytoplasmic ratio; low-power architecture suspicious for carcinoma."],
  ["d", "Mirebalais-prepared, false positive", "Multinucleated cells at high power; the low-power architecture could not be assessed."],
];
function teaserArtifacts() {
  return el("div", { class: "teaser" }, `
    <div class="tt">Artifacts on real slides</div>
    <div class="tb"><img src="${A}artifacts/d.png" alt=""></div>
    <div class="tap">Yellow: tissue fold flagged by GrandQC. Tap Open for all four cases.</div>`);
}
function renderArtifacts(body) {
  body.innerHTML = `<h2>Slides made in Haiti carry more artifacts</h2>
    <p class="muted">Median share of tissue with each artifact, 134 patients with slides made at both sites (GrandQC).</p>
    <table class="t"><tr><th>Artifact</th><th class="n">Mirebalais</th><th class="n">BWH</th></tr>
      <tr><td>Tissue folds</td><td class="n">1.78%</td><td class="n">0.26%</td></tr>
      <tr><td>Dark spots or foreign material</td><td class="n">1.51%</td><td class="n">0.18%</td></tr>
      <tr><td>Edges or bubbles</td><td class="n">0.46%</td><td class="n">0.00%</td></tr>
      <tr><td>Out of focus</td><td class="n">2.32%</td><td class="n">0.02%</td></tr></table>
    <p class="cap">All differences p &lt; 0.001 (Mann-Whitney U).</p>
    <div class="tintbox"><p style="margin:0">Yet ESPWA's AUROC was <b>0.805</b> on the Mirebalais-prepared slides and <b>0.794</b> on the BWH-prepared slides of the same patients, and slides with more artifacts were not misclassified more often.</p></div>
    <h3>When ESPWA was wrong, was it the artifacts?</h3>
    <p>For each site and type of error, the misclassified slide where most of ESPWA's attention fell on artifacts, reviewed by a breast pathologist.</p>
    <div class="seg" id="artSeg">${ART.map(([k], n) => `<button data-k="${n}">${k.toUpperCase()}</button>`).join("")}</div>
    <div id="artView"></div>
    <img src="${A}artifacts/legend.png" alt="Legend" style="margin-top:8px">`;
  const show = (n) => {
    body.querySelectorAll("#artSeg button").forEach((b, k) => b.classList.toggle("on", k === n));
    const [k, t, note] = ART[n];
    $("#artView", body).innerHTML = `<h3>${t}</h3><div class="box"><img src="${A}artifacts/${k}.png" alt=""></div>
      <p><b>Pathologist review:</b> ${note}</p>`;
  };
  body.querySelectorAll("#artSeg button").forEach((b) => b.onclick = () => show(Number(b.dataset.k)));
  show(0);
  const p = el("p", {}, "On review, the ER-positive slides called ER-negative showed high-grade features, which suggests that these errors reflect tumor morphology rather than artifacts.");
  body.appendChild(p);
}

/* ---------- 5. Where ESPWA looks + clinical use ---------- */
const SLIDES = [
  { er: "ER-positive (95%)", site: "Primary tumor", grade: 2, p: 0.82, att: 90, tum: 32 },
  { er: "ER-negative", site: "Primary tumor", grade: 2, p: 0.38, att: 90, tum: 42 },
  { er: "ER-positive (100%)", site: "Primary tumor", grade: 3, p: 0.62, att: 98, tum: 20 },
  { er: "ER-negative", site: "Primary tumor", grade: 3, p: 0.16, att: 97, tum: 28 },
  { er: "ER-positive (95%)", site: "Lymph node metastasis", grade: 3, p: 0.90, att: 94, tum: 30 },
  { er: "ER-negative", site: "Lymph node metastasis", grade: 3, p: 0.29, att: 94, tum: 15 },
];
const LAYERS = [["att", "Attention"], ["tum", "Tumor"], ["both", "Attention + tumor outline"]];
// Supplemental Table 1: operating points on the ZL cohort (1,684 ER-positive and 1,764 ER-negative slides).
const CUTS = [
  { name: "Treat all (today)", cut: 0, sens: 100, spec: 0, fn: 0, tn: 0, nb: 0 },
  { name: "90% sensitivity", cut: 0.252, sens: 90.0, spec: 43.1, fn: 168, tn: 761, nb: 7.6 },
  { name: "80% sensitivity", cut: 0.415, sens: 80.0, spec: 63.7, fn: 336, tn: 1123, nb: 18.8 },
  { name: "Youden's J", cut: 0.482, sens: 74.5, spec: 71.5, fn: 430, tn: 1262, nb: 23.2 },
  { name: "Default", cut: 0.5, sens: 72.3, spec: 72.9, fn: 466, tn: 1286, nb: 23.8 },
  { name: "20% sensitivity", cut: 0.845, sens: 20.2, spec: 96.7, fn: 1344, tn: 1706, nb: 42.3 },
  { name: "10% sensitivity", cut: 0.899, sens: 10.5, spec: 98.0, fn: 1507, tn: 1729, nb: 45.3 },
];
function teaserLooks() {
  return el("div", { class: "teaser" }, `
    <div class="tt">Where ESPWA looks</div>
    <div class="tb"><img src="${A}slides/s5_he.jpg" alt=""><img class="fade" src="${A}slides/s5_both.jpg" alt=""></div>
    <div class="tap">Green outline: tumor; red: ESPWA's attention. Tap Open to explore six slides.</div>`);
}
function renderLooks(body) {
  body.innerHTML = `<h2>Where ESPWA looks</h2>
    <p class="muted">Six slides from the cross-validation. Slide the bar to blend the H&amp;E with a layer.</p>
    <div class="seg" id="sSeg">${SLIDES.map((_, k) => `<button data-k="${k}">Slide ${k + 1}</button>`).join("")}</div>
    <div class="seg" id="lSeg">${LAYERS.map(([k, l]) => `<button data-l="${k}">${l}</button>`).join("")}</div>
    <div class="stack" id="stack"><img id="sBase" alt=""><img class="top" id="sTop" alt=""></div>
    <input type="range" id="sMix" min="0" max="100" value="100" aria-label="Blend">
    <div id="sMeta"></div>
    <p class="cap">Attention: red high, blue low (percentile within the slide). Tumor: share of tumor in each tile from a separate segmentation model (BCSS), in orange, with its outline in green.</p>
    <div class="tintbox"><p style="margin:0">Across 3,412 slides, a median <b>53%</b> of ESPWA's attention fell on tumor tiles, which were a median <b>14%</b> of the tiles: about 3.3 times more than chance.</p></div>
    <h2 style="margin-top:28px">What would ESPWA change?</h2>
    <p>In Haiti today, every patient receives endocrine therapy ("treat all"), although it only helps ER-positive tumors. A decision threshold on ESPWA's probability trades sparing ER-negative patients against missing ER-positive ones.</p>
    <input type="range" id="cut" min="0" max="${CUTS.length - 1}" value="4" step="1" aria-label="Threshold">
    <div id="cutView"></div>
    <p class="cap">Slide-level results on the ZL cohort (Supplemental Table 1). Net benefit is relative to treating all, per 100 patients, weighted by the threshold (decision curve analysis).</p>`;
  let s = 0, layer = "both";
  const drawSlide = () => {
    body.querySelectorAll("#sSeg button").forEach((b, k) => b.classList.toggle("on", k === s));
    body.querySelectorAll("#lSeg button").forEach((b) => b.classList.toggle("on", b.dataset.l === layer));
    $("#sBase", body).src = `${A}slides/s${s + 1}_he.jpg`;
    $("#sTop", body).src = `${A}slides/s${s + 1}_${layer}.jpg`;
    const d = SLIDES[s];
    const call = d.p >= 0.5 ? "ER-positive" : "ER-negative";
    const ok = (d.p >= 0.5) === d.er.startsWith("ER-positive");
    $("#sMeta", body).innerHTML = `<div class="stats">
      <div class="stat"><div class="lab">IHC</div><b>${d.er}</b><div class="lab">${d.site}, grade ${d.grade}</div></div>
      <div class="stat"><div class="lab">ESPWA</div><b>P(ER+) = ${fmt(d.p, 2)}</b><div class="lab">${call} ${ok ? "✓" : "✗"}</div></div></div>
      <p class="cap">${d.att}% of the attention falls on tumor tiles, which are ${d.tum}% of the tiles.</p>`;
  };
  body.querySelectorAll("#sSeg button").forEach((b) => b.onclick = () => { s = Number(b.dataset.k); drawSlide(); });
  body.querySelectorAll("#lSeg button").forEach((b) => b.onclick = () => { layer = b.dataset.l; drawSlide(); });
  $("#sMix", body).oninput = (e) => { $("#sTop", body).style.opacity = e.target.value / 100; };
  drawSlide();

  const drawCut = () => {
    const c = CUTS[Number($("#cut", body).value)];
    const spared = c.tn, missed = c.fn;
    $("#cutView", body).innerHTML = `<p style="margin-bottom:4px"><b>${c.name}</b>${c.cut ? ` · threshold ${fmt(c.cut)}` : ""}</p>
      <div class="stats">
        <div class="stat"><div class="big" style="color:var(--ok)">${(spared / 1764 * 100).toFixed(0)}%</div><div class="lab">of ER-negative slides spared endocrine therapy (${spared.toLocaleString("en-US")} of 1,764)</div></div>
        <div class="stat"><div class="big" style="color:var(--bad)">${(missed / 1684 * 100).toFixed(0)}%</div><div class="lab">of ER-positive slides that would miss it (${missed.toLocaleString("en-US")} of 1,684)</div></div>
        <div class="stat"><div class="lab">Sensitivity / specificity</div><b>${c.sens.toFixed(1)}% / ${c.spec.toFixed(1)}%</b></div>
        <div class="stat"><div class="lab">Net benefit vs treat all</div><b>${c.nb.toFixed(1)} per 100</b></div></div>`;
  };
  $("#cut", body).oninput = drawCut;
  drawCut();
}

/* ---------- AR ---------- */
let mindar = null;
function stopAR() {
  if (!mindar) return;
  mindar.renderer.setAnimationLoop(null);
  mindar.stop();
  $("#ar").innerHTML = "";
  mindar = null;
  $("#ar").hidden = true;
  $("#arUI").hidden = true;
  $("#home").hidden = false;
}

$("#hintThumbs").innerHTML = FIGS.map((_, i) => `<img src="${A}targets/fig${i + 1}_thumb.jpg" alt="">`).join("");
let current = null;
$("#foundOpen").onclick = () => { if (current !== null) openSheet(current); };
$("#arClose").onclick = () => stopAR();
$("#startAR").onclick = () => startAR();

async function startAR() {
  $("#home").hidden = true;
  $("#ar").hidden = false;
  $("#arUI").hidden = false;
  $("#arHint").hidden = false;
  $("#arFound").hidden = true;
  const container = $("#ar");
  mindar = new MindARThree({ container, imageTargetSrc: "./targets/targets.mind", uiScanning: "no",
                             filterMinCF: 0.0005, filterBeta: 0.01 });
  const { renderer, cssRenderer, scene, cssScene, camera } = mindar;
  FIGS.forEach((f, i) => {
    const anchor = mindar.addAnchor(i);
    anchor.group.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.02, f.aspect + 0.02)),
      new THREE.LineBasicMaterial({ color: 0x7e22ce })));
    const css = mindar.addCSSAnchor(i);
    const obj = new CSS3DObject(f.teaser());
    obj.position.set(0, 0, 40);
    css.group.add(obj);
    css.onTargetFound = () => {
      current = i;
      $("#arHint").hidden = true;
      $("#arFound").hidden = false;
      $("#foundFig").textContent = `Poster ${f.fig}`;
      $("#foundTitle").textContent = f.title;
    };
  });
  await mindar.start();
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    cssRenderer.render(cssScene, camera);
  });
}
