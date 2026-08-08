// Página P4: Genealogía — árbol de linaje de una forma hasta PIE, mostrando el código en cada estadio.
import { API } from "../api.js";
import { esc, mount } from "../dom.js";
import { patch } from "../router.js";

let timer;
const LEVEL = { pie: "PIE", proto_rama: "proto-rama", estadio: "estadio", lengua: "lengua", subfamilia: "subfamilia", dialecto: "dialecto" };

function pickbar() {
  return `<input id="gq" placeholder="elige una forma para ver su genealogía (palabra)…" style="min-width:320px">
          <div id="gadd" class="adddrop"></div>`;
}
function wirePick() {
  const q = document.getElementById("gq"), box = document.getElementById("gadd");
  q.oninput = () => {
    clearTimeout(timer); const v = q.value.trim(); if (!v) { box.innerHTML = ""; return; }
    timer = setTimeout(async () => {
      const rs = await API.search(v);
      box.innerHTML = rs.slice(0, 8).map(r => `<div class="addrow" data-id="${esc(r.id)}"><b>${esc(r.orthography)}</b> <span class="mut">${esc(r.lect_name || r.lect_id)} · ${esc(r.subgroup || r.family || "")}</span></div>`).join("");
      box.querySelectorAll(".addrow").forEach(el => el.onclick = () => { patch({ id: el.dataset.id }); box.innerHTML = ""; });
    }, 250);
  };
}

const codeChip = c => c ? `<code class="gcode">${esc(c)}</code>` : `<span class="mut" style="font-size:12px">— sin código</span>`;

function nodeCard(n, { root = false, pie = false, kind = "", conserved = false } = {}) {
  return `<div class="gnode ${root ? "groot" : ""} ${pie ? "gpie" : ""}">
    ${kind ? `<div class="gedge"><span class="gk ${kind === "prestamo" ? "loan" : ""}">↑ ${esc(kind)}</span></div>` : ""}
    <div class="gcard">
      <div class="ghead"><span class="glevel">${esc(LEVEL[n.level] || n.level || "")}</span>
        <span class="glang">${esc(n.lect_name || n.lect)}</span>${pie ? '<span class="badge2 b-pie">PIE</span>' : ""}${root ? '<span class="badge2 b-src">consultada</span>' : ""}</div>
      <div class="gform">${esc(n.form || n.word)}</div>
      <div class="gcodeline">${codeChip(n.code)} ${conserved ? '<span class="gcons">código conservado</span>' : ""}</div>
    </div></div>`;
}

export async function render(p) {
  mount("#toolbar", pickbar()); wirePick();
  if (!p.id) { mount("#view", `<div class="page"><h1>Genealogía</h1><p class="lead">Elige una forma (arriba) para ver su <b>árbol de linaje hasta el proto-indoeuropeo</b>: cada estadio, la transición (herencia / reconstruido) y cómo el <b>código endolingüístico</b> se conserva o muta camino a PIE. No se trepa por préstamos.</p></div>`); return; }
  mount("#view", `<div class="gwrap"><div class="hint">cargando…</div></div>`);
  const d = await API.genealogy(p.id);
  if (d.error) { mount("#view", `<div class="gwrap"><div class="hint">forma no encontrada</div></div>`); return; }
  // top→bottom: PIE (rango alto) arriba, la forma consultada abajo
  const anc = (d.ancestors || []).slice().sort((a, b) => b.rank - a.rank || a.depth - b.depth);
  const chain = anc.concat([d.root]);   // el root (la palabra) al final/abajo
  let prevCode = null;
  const cards = chain.map((n, i) => {
    const root = n === d.root, pie = n.lect === "ine-pro";
    const conserved = i > 0 && n.code && n.code === prevCode;
    prevCode = n.code || prevCode;
    return nodeCard(n, { root, pie, kind: root ? "" : n.kind, conserved });
  }).join("");
  const head = `<div class="gtitle"><span class="word">${esc(d.root.word)}</span>
    <span class="mut">· ${esc(d.root.lect_name || d.root.lect)}${d.root.subgroup ? " / " + esc(d.root.subgroup) : ""}</span>
    ${d.reaches_pie ? '<span class="badge2 b-pie">llega a PIE ✓</span>' : '<span class="mut">— sin étimo PIE documentado</span>'}</div>`;
  mount("#view", `<div class="gwrap">${head}<div class="gtree">${cards}</div>
    <p class="mut" style="max-width:640px;margin:16px auto;font-size:12px;text-align:center">Se lee de arriba (más antiguo / PIE) hacia abajo (la forma consultada). «código conservado» marca los estadios donde el esqueleto no cambió de clase.</p></div>`);
}
