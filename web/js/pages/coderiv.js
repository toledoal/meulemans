// Página P3: Coderivados — red de resonancia de los cognados de una forma.
// Tesis: dentro de un cognado verdadero el esqueleto consonántico tiende a conservarse.
// Los nodos que CONSERVAN el esqueleto del centro (resonan) se agrupan cerca; los que divergen, lejos.
// Grafo de fuerzas propio (sin dependencias externas), coherente con «vanilla, sin build».
import { API } from "../api.js";
import { esc, mount } from "../dom.js";
import { patch } from "../router.js";

const NS = "http://www.w3.org/2000/svg";
const MAX = 80;
let raf, timer;

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

function pickbar() {
  return `<input id="cq" placeholder="elige una forma para ver su red de coderivados (palabra)…" style="min-width:340px">
          <div id="cadd" class="adddrop"></div>`;
}
function wirePick() {
  const q = document.getElementById("cq"), box = document.getElementById("cadd");
  q.oninput = () => {
    clearTimeout(timer); const v = q.value.trim(); if (!v) { box.innerHTML = ""; return; }
    timer = setTimeout(async () => {
      const rs = await API.search(v);
      box.innerHTML = rs.slice(0, 8).map(r => `<div class="addrow" data-id="${esc(r.id)}"><b>${esc(r.orthography)}</b> <span class="mut">${esc(r.lect_name || r.lect_id)} · ${esc(r.subgroup || r.family || "")}</span></div>`).join("");
      box.querySelectorAll(".addrow").forEach(a => a.onclick = () => { patch({ id: a.dataset.id }); box.innerHTML = ""; });
    }, 250);
  };
}

export async function render(p) {
  cancelAnimationFrame(raf);
  mount("#toolbar", pickbar()); wirePick();
  if (!p.id) {
    mount("#view", `<div class="page"><h1>Coderivados</h1><p class="lead">Elige una forma (arriba) para ver su <b>red de coderivados</b>: sus cognados a través de las lenguas, cada uno con su <b>esqueleto consonántico</b>. Los que <b>conservan</b> el esqueleto del centro resuenan y se agrupan cerca; los que divergen quedan lejos. Es la tesis de los códigos coderivados: dentro de un cognado verdadero el código tiende a conservarse, y las divergencias son informativas.</p></div>`);
    return;
  }
  mount("#view", `<div class="cwrap"><div class="hint">cargando red…</div></div>`);
  const d = await API.coderivatives(p.id);
  if (d.error) { mount("#view", `<div class="cwrap"><div class="hint">forma no encontrada</div></div>`); return; }
  draw(d);
}

function draw(d) {
  const W = 940, H = 640, cx = W / 2, cy = H / 2;
  const center = d.center, all = d.nodes || [], m = d.meta || {};
  const shown = all.slice(0, MAX);
  const shell = `<div class="cwrap">
    <div class="ctitle"><span class="word">${esc(center.word)}</span>
      <span class="mut">· ${esc(center.lect_name || center.lect)}${center.subgroup ? " / " + esc(center.subgroup) : ""}</span>
      ${center.code ? `<code class="gcode">${esc(center.code)}</code>` : ""}${center.cons ? `<code class="gcode lit">${esc(center.cons)}</code>` : ""}</div>
    <div class="csum">${m.total} coderivados · <b class="cres">${m.resonantes}</b> resonan <span class="mut">(mismo esqueleto</span> <code class="gcode lit">${esc(center.cons || "—")}</code><span class="mut">)</span>${m.sources ? ` · <span class="mut">${esc(m.sources)}</span>` : ""}</div>
    ${all.length ? `<div id="cgraphwrap"></div>` : '<div class="hint">esta forma no está ligada a cognados</div>'}
    ${all.length > MAX ? `<p class="mut cnote">Mostrando ${MAX} de ${all.length} coderivados.</p>` : ""}
    ${all.length ? `<p class="mut cnote">Nodos <b>llenos</b> cerca del centro (línea sólida) = conservan el esqueleto <i>(resonancia)</i>. Nodos <b>tenues</b> (línea punteada) = divergen. Clic en un nodo abre su ficha.</p>` : ""}
  </div>`;
  mount("#view", shell);
  if (!all.length) return;

  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "cgraph" });
  const gl = el("g"), gn = el("g");
  svg.append(gl, gn);
  document.getElementById("cgraphwrap").appendChild(svg);

  // nodos de simulación (el centro está fijo en el medio)
  const N = shown.map((n, i) => {
    const a = i / shown.length * Math.PI * 2, r = n.resonates ? 120 : 240;
    return { ...n, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: 0, vy: 0 };
  });
  const links = N.map(n => { const L = el("line", { class: "clink " + (n.resonates ? "res" : "div") }); gl.appendChild(L); return L; });
  const nodes = N.map(n => {
    const g = el("g", { class: "cn " + (n.resonates ? "res" : "div"), tabindex: 0 });
    g.appendChild(el("circle", { r: n.resonates ? 7 : 5 }));
    const t = el("text", { class: "clabel", dy: "-11" }); t.textContent = n.form; g.appendChild(t);
    const ti = el("title"); ti.textContent = `${n.form} · ${n.lect_name || n.lect}${n.cons ? " · " + n.cons : ""}${n.gloss ? " · " + n.gloss : ""}`; g.appendChild(ti);
    const open = () => { location.hash = "#/form/" + encodeURIComponent(n.id); };
    g.addEventListener("click", open);
    g.addEventListener("keydown", e => { if (e.key === "Enter") open(); });
    gn.appendChild(g); return g;
  });
  // centro
  const cg = el("g", { class: "cn center" });
  cg.appendChild(el("circle", { r: 13, cx, cy }));
  const ct = el("text", { class: "clabel big", x: cx, y: cy, dy: "-19" }); ct.textContent = center.word; cg.appendChild(ct);
  gn.appendChild(cg);

  function tick() {
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
      let dx = N[i].x - N[j].x, dy = N[i].y - N[j].y, d2 = dx * dx + dy * dy || 0.01, dist = Math.sqrt(d2), f = 5200 / d2;
      dx /= dist; dy /= dist; N[i].vx += dx * f; N[i].vy += dy * f; N[j].vx -= dx * f; N[j].vy -= dy * f;
    }
    for (const n of N) {
      let dx = n.x - cx, dy = n.y - cy, dist = Math.sqrt(dx * dx + dy * dy) || 0.01, L = n.resonates ? 150 : 280, f = (dist - L) * 0.03;
      dx /= dist; dy /= dist; n.vx -= dx * f; n.vy -= dy * f;
    }
    for (const n of N) {
      n.vx *= 0.84; n.vy *= 0.84; n.x += n.vx; n.y += n.vy;
      n.x = Math.max(24, Math.min(W - 24, n.x)); n.y = Math.max(24, Math.min(H - 24, n.y));
    }
    N.forEach((n, i) => {
      links[i].setAttribute("x1", cx); links[i].setAttribute("y1", cy);
      links[i].setAttribute("x2", n.x); links[i].setAttribute("y2", n.y);
      const c = nodes[i].firstChild, t = nodes[i].childNodes[1];
      c.setAttribute("cx", n.x); c.setAttribute("cy", n.y); t.setAttribute("x", n.x); t.setAttribute("y", n.y);
    });
  }
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  if (reduce) { for (let k = 0; k < 320; k++) tick(); }
  else { let f = 0; (function loop() { tick(); if (++f < 280) raf = requestAnimationFrame(loop); })(); }
}
