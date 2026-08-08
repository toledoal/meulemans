// Página P5: Mapa isoglósico — la distribución geográfica de las formas de un concepto.
// Proyección equirectangular propia (sin d3); contornos del mundo desde TopoJSON vendorizado.
// Colorea por familia; al filtrar por una familia, colorea por rama (subgrupo).
import { API } from "../api.js";
import { esc, mount } from "../dom.js";
import { patch } from "../router.js";

const W = 960, H = 480;
const px = lon => (lon + 180) / 360 * W;
const py = lat => (90 - lat) / 180 * H;
const PAL = ["#2f6feb", "#e8710a", "#1a9e5c", "#c0399f", "#8a63d2", "#0e9bb5", "#d2b400", "#d24b4b"];
const GREY = "#9aa3af";
let topoFeatures, landPath, timer;

async function loadWorld() {
  if (landPath) return;
  const t = await fetch("/vendor/countries-110m.json").then(r => r.json());
  topoFeatures = window.topojson.feature(t, t.objects.countries).features;
  const parts = [];
  for (const f of topoFeatures) {
    const g = f.geometry; if (!g) continue;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    for (const poly of polys) for (const ring of poly)
      parts.push("M" + ring.map(([lon, lat]) => px(lon).toFixed(1) + "," + py(lat).toFixed(1)).join("L") + "Z");
  }
  landPath = parts.join("");
}

const UNK = "—";  // sin rama/familia asignada → siempre gris, nunca un color destacado
function colorize(points, keyfn) {
  const cnt = {};
  for (const p of points) { const k = keyfn(p) || UNK; cnt[k] = (cnt[k] || 0) + 1; }
  const ranked = Object.entries(cnt).filter(([k]) => k !== UNK).sort((a, b) => b[1] - a[1]);
  const color = { [UNK]: GREY }, legend = [];
  ranked.forEach(([k, n], i) => {
    const c = i < PAL.length ? PAL[i] : GREY;
    color[k] = c;
    if (i < PAL.length) legend.push({ k, n, c });
  });
  const restN = ranked.slice(PAL.length).reduce((s, [, n]) => s + n, 0);
  if (restN) legend.push({ k: "otras", n: restN, c: GREY });
  const unkN = cnt[UNK] || 0;
  if (unkN) legend.push({ k: "sin clasificar", n: unkN, c: GREY });
  return { color, legend, keyfn };
}

function conceptPicker() {
  return `<input id="mq" placeholder="concepto (p.ej. mother, water, hand)…" style="min-width:260px">
          <div id="madd" class="adddrop"></div><span id="mfilters"></span>`;
}
function wirePicker() {
  const q = document.getElementById("mq"), box = document.getElementById("madd");
  q.oninput = () => {
    clearTimeout(timer); const v = q.value.trim(); if (!v) { box.innerHTML = ""; return; }
    timer = setTimeout(async () => {
      const rs = await API.concepts(v);
      box.innerHTML = rs.slice(0, 10).map(r => `<div class="addrow" data-id="${esc(r.id)}"><b>${esc(r.gloss)}</b> <span class="mut">${esc(r.field || "")} · ${r.n} formas</span></div>`).join("");
      box.querySelectorAll(".addrow").forEach(a => a.onclick = () => { patch({ cid: a.dataset.id, family: "", branch: "" }); box.innerHTML = ""; });
    }, 250);
  };
}

export async function render(p) {
  mount("#toolbar", conceptPicker()); wirePicker();
  if (!p.cid) {
    mount("#view", `<div class="page"><h1>Mapa</h1><p class="lead">Elige un <b>concepto</b> (arriba) para ver la <b>distribución geográfica</b> de sus formas a través de las lenguas del mundo. Cada punto es una lengua en su ubicación; el color agrupa por <b>familia</b>, y al filtrar por una familia se colorea por <b>rama</b>. Pasa el cursor para ver la forma y su esqueleto; clic para abrir la ficha.</p></div>`);
    return;
  }
  mount("#view", `<div class="mapwrap"><div class="hint">cargando mapa…</div></div>`);
  const [, d] = await Promise.all([loadWorld(), API.mapconcept(p.cid, p.family, p.branch)]);
  draw(d, p);
}

function draw(d, p) {
  const pts = d.points || [];
  const byBranch = !!p.family;
  const { color, legend } = colorize(pts, x => byBranch ? x.subgroup : x.family);

  const famOpts = ['<option value="">todas las familias</option>']
    .concat((d.families || []).map(f => `<option value="${esc(f)}"${f === p.family ? " selected" : ""}>${esc(f)}</option>`)).join("");
  const brOpts = p.family
    ? ['<option value="">todas las ramas</option>'].concat((d.branches || []).map(b => `<option value="${esc(b)}"${b === p.branch ? " selected" : ""}>${esc(b)}</option>`)).join("")
    : "";

  const dots = pts.map(x => {
    const c = color[(byBranch ? x.subgroup : x.family) || "—"] || GREY;
    return `<circle class="mdot" cx="${px(x.lon).toFixed(1)}" cy="${py(x.lat).toFixed(1)}" r="2.6" fill="${c}"
      data-id="${esc(x.id)}" data-form="${esc(x.form)}" data-lect="${esc(x.lect_name || x.lect)}"
      data-grp="${esc(x.subgroup || x.family || "")}" data-cons="${esc(x.cons || "")}"></circle>`;
  }).join("");

  const leg = legend.map(l => `<span class="mleg"><i style="background:${l.c}"></i>${esc(l.k)} <span class="num mut">${l.n}</span></span>`).join("");

  mount("#view", `<div class="mapwrap">
    <div class="ctitle"><span class="word">${esc(d.gloss)}</span>
      <span class="mut">· ${pts.length} lenguas${d.field ? " · " + esc(d.field) : ""}</span></div>
    <div class="mapbar">
      <select id="mfam" class="fsel">${famOpts}</select>
      ${brOpts ? `<select id="mbr" class="fsel">${brOpts}</select>` : ""}
      <span class="mut" style="font-size:12px">color por ${byBranch ? "rama" : "familia"}</span>
    </div>
    <div class="maplegend">${leg}</div>
    <div class="mapframe">
      <svg viewBox="0 0 ${W} ${H}" class="wmap" preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width="${W}" height="${H}" class="mocean"/>
        <path d="${landPath}" class="mland"/>
        <g class="mdots">${dots}</g>
      </svg>
      <div id="mtip" class="mtip" hidden></div>
    </div>
    <p class="mut cnote">Punto = una lengua en su ubicación (Glottolog). Color = ${byBranch ? "rama dentro de la familia" : "familia lingüística"} (top ${PAL.length}; el resto en gris). Clic en un punto abre su ficha.</p>
  </div>`);

  const fam = document.getElementById("mfam");
  if (fam) fam.onchange = () => patch({ family: fam.value, branch: "" });
  const br = document.getElementById("mbr");
  if (br) br.onchange = () => patch({ branch: br.value });

  const frame = document.querySelector(".mapframe"), tip = document.getElementById("mtip");
  document.querySelectorAll(".mdot").forEach(el => {
    el.onclick = () => { location.hash = "#/form/" + encodeURIComponent(el.dataset.id); };
    el.onmouseenter = () => {
      const d = el.dataset;
      tip.innerHTML = `<div class="mtform">${esc(d.form)}</div>
        <div class="mtlect">${esc(d.lect)}</div>
        <div class="mtmeta">${d.cons ? `<code>${esc(d.cons)}</code> · ` : ""}${esc(d.grp)}</div>`;
      tip.hidden = false;
    };
    el.onmousemove = e => {
      const r = frame.getBoundingClientRect();
      let x = e.clientX - r.left + 12, y = e.clientY - r.top + 12;
      if (x + 190 > r.width) x = e.clientX - r.left - 190;
      tip.style.left = x + "px"; tip.style.top = y + "px";
    };
    el.onmouseleave = () => { tip.hidden = true; };
  });
}
