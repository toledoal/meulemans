// Página P1: Buscar + Ficha. Estado 100% en la URL (mode,q,family,lang,sel,cid,cfam).
// Optimizado: al cambiar solo la selección no se reconsulta ni se reconstruye la lista (se conserva scroll/foco).
import { API } from "../api.js";
import { esc, lname, mount, num } from "../dom.js";
import { patch } from "../router.js";
import { formCard } from "../render.js";

function toolbar(p) {
  const mode = p.mode || "word";
  return `
    <span class="toggle">
      <button data-mode="word" class="${mode === "word" ? "on" : ""}">palabra</button>
      <button data-mode="concept" class="${mode === "concept" ? "on" : ""}">concepto (EN)</button>
    </span>
    <input id="q" placeholder="${mode === "concept" ? "concepto en inglés (water, dog, mother…)" : "busca una palabra (cualquier alfabeto)…"}" value="${esc(p.q || "")}">
    <select id="family" ${mode === "concept" ? "hidden" : ""}><option value="">todas las familias</option></select>
    <select id="lect" ${mode === "concept" ? "hidden" : ""}><option value="">todas las lenguas</option></select>
    <button class="btn" id="dobtn">Buscar</button>`;
}

async function fillFilters(p) {
  const fam = document.getElementById("family"); if (!fam) return;
  (await API.families()).forEach(f => fam.add(new Option(`${f.family} (${num(f.lenguas)})`, f.family)));
  fam.value = p.family || "";
  fam.onchange = () => { loadLects(fam.value); patch({ family: fam.value, lang: "" }); };
  await loadLects(p.family || "", p.lang || "");
}
async function loadLects(family, val = "") {
  const sel = document.getElementById("lect"); if (!sel) return;
  sel.length = 1;
  (await API.lects(family)).forEach(l => sel.add(new Option(`${l.name} — ${l.subgroup || l.family} (${num(l.n)})`, l.id)));
  sel.value = val; sel.onchange = () => patch({ lang: sel.value });
}
function wireToolbar() {
  document.querySelectorAll(".toggle button[data-mode]").forEach(b => b.onclick = () => patch({ mode: b.dataset.mode, q: "", sel: "", cid: "", cfam: "" }));
  const run = () => patch({ q: document.getElementById("q").value.trim(), sel: "", cid: "", cfam: "" });
  document.getElementById("dobtn").onclick = run;
  document.getElementById("q").addEventListener("keydown", e => { if (e.key === "Enter") run(); });
}
const highlight = (R, id) => R.querySelectorAll(".row").forEach(x => x.classList.toggle("on", x.dataset.id === String(id)));

export async function render(p) {
  const mode = p.mode || "word";
  const listKey = [mode, p.q || "", p.family || "", p.lang || ""].join("|");
  const tb = document.getElementById("toolbar");
  // (re)construir shell solo si no existe o cambió el modo (preserva foco/scroll en cambios de selección)
  if (!document.querySelector("#view .split") || tb.dataset.tbmode !== mode) {
    mount("#toolbar", toolbar(p)); tb.dataset.tbmode = mode; wireToolbar();
    if (mode === "word") await fillFilters(p);
    mount("#view", `<div class="split"><aside id="results"></aside><section id="detail"></section></div>`);
    document.getElementById("results").dataset.key = "";
  } else {
    const qi = document.getElementById("q"); if (qi && document.activeElement !== qi) qi.value = p.q || "";
  }
  const R = document.getElementById("results"), D = document.getElementById("detail");
  if (!p.q) { R.innerHTML = '<div class="hint">Busca una palabra o un concepto.</div>'; D.innerHTML = '<div class="hint">Selecciona un resultado para ver toda su historia.</div>'; R.dataset.key = ""; return; }
  const needList = R.dataset.key !== listKey;
  return mode === "concept" ? renderConcept(p, R, D, needList, listKey) : renderWord(p, R, D, needList, listKey);
}

async function renderWord(p, R, D, needList, key) {
  if (needList) {
    R.innerHTML = '<div class="count">buscando…</div>';
    const rs = await API.search(p.q, p.lang || "", p.family || "");
    R.dataset.key = key;
    R.innerHTML = `<div class="count num">${rs.length} resultado${rs.length !== 1 ? "s" : ""}</div>`;
    rs.forEach(r => { const d = document.createElement("div"); d.className = "row"; d.dataset.id = r.id;
      d.innerHTML = `<div class="w">${esc(r.orthography)}</div><div class="s">${esc(r.lect_name || r.lect_id)} · ${esc(r.subgroup || r.family || "")}</div>`;
      d.onclick = () => patch({ sel: r.id }); R.appendChild(d); });
    if (!p.sel && rs.length) return patch({ sel: rs[0].id }, { replace: true });
  }
  highlight(R, p.sel);
  if (!p.sel) { D.innerHTML = '<div class="hint">Selecciona un resultado.</div>'; return; }
  D.innerHTML = '<div class="hint">cargando…</div>';
  D.innerHTML = formCard(await API.form(p.sel));
}

async function renderConcept(p, R, D, needList, key) {
  if (needList) {
    R.innerHTML = '<div class="count">buscando conceptos…</div>';
    const cs = await API.concepts(p.q);
    R.dataset.key = key;
    R.innerHTML = `<div class="count num">${cs.length} conceptos</div>`;
    cs.forEach(c => { const d = document.createElement("div"); d.className = "row"; d.dataset.id = c.id;
      d.innerHTML = `<div class="w">${esc(c.gloss)}<span class="code num">${num(c.n)}</span></div>${c.field ? `<div class="s">${esc(c.field)}</div>` : ""}`;
      d.onclick = () => patch({ cid: c.id, sel: "", cfam: "" }); R.appendChild(d); });
    if (!p.cid && cs.length) return patch({ cid: cs[0].id }, { replace: true });
  }
  highlight(R, p.cid);
  if (!p.cid) { D.innerHTML = '<div class="hint">Selecciona un concepto.</div>'; return; }
  if (p.sel) {
    D.innerHTML = '<div class="hint">cargando…</div>';
    const back = `<div class="back" id="cback">← volver al concepto</div>`;
    D.innerHTML = formCard(await API.form(p.sel), { backHtml: back });
    document.getElementById("cback").onclick = () => patch({ sel: "" });
    return;
  }
  D.innerHTML = '<div class="hint">cargando…</div>';
  const d = await API.concept(p.cid, p.cfam || "", p.cbranch || "");
  const byGrp = {};                          // agrupa por familia, o por rama si hay familia elegida
  const grpKey = r => p.cfam ? (r.subgroup || "—") : r.family;
  (d.forms || []).forEach(r => (byGrp[grpKey(r)] = byGrp[grpKey(r)] || []).push(r));
  const famsel = `<select id="cfam"><option value="">todas las familias (${d.forms.length}${d.truncated ? "+" : ""})</option>${(d.families || []).map(f => `<option value="${esc(f)}"${f === (p.cfam || "") ? " selected" : ""}>${esc(f)}</option>`).join("")}</select>`;
  // selector de RAMA: solo cuando hay familia elegida
  const brsel = p.cfam && (d.branches || []).length
    ? `<select id="cbr"><option value="">todas las ramas</option>${d.branches.map(b => `<option value="${esc(b)}"${b === (p.cbranch || "") ? " selected" : ""}>${esc(b)}</option>`).join("")}</select>` : "";
  const th = `<tr><td class="mut" style="font-size:11px;text-transform:uppercase">lengua</td><td class="mut" style="font-size:11px;text-transform:uppercase">forma</td><td class="mut" style="font-size:11px;text-transform:uppercase">esqueleto</td><td class="mut" style="font-size:11px;text-transform:uppercase">código</td><td class="rt mut" style="font-size:11px;text-transform:uppercase">fuente</td></tr>`;
  const body = Object.keys(byGrp).map(g => `<div class="cfam">${esc(g)} <span class="mut num">(${byGrp[g].length})</span></div><table>${th}` +
    byGrp[g].map(r => `<tr data-fid="${esc(r.id)}" style="cursor:pointer"><td class="lc">${lname(r.lect, r.lect_name)}</td><td><b>${esc(r.orthography)}</b></td><td class="mono">${esc(r.skeleton || "")}</td><td class="mono">${esc(r.code || "")}</td><td class="rt"><span class="badge2 b-src">${esc(r.source)}</span></td></tr>`).join("") + "</table>").join("");
  D.innerHTML = `<div class="word">${esc(d.gloss)}</div>
    <div class="meta">concepto${d.ccid ? " #" + esc(d.ccid) : ""}${d.field ? " · <b>" + esc(d.field) + "</b>" : ""} · <span class="num">${d.forms.length}${d.truncated ? "+" : ""}</span> formas${d.truncated ? ' <span class="mut">(tope — filtra por familia/rama)</span>' : ""}</div>
    <div class="sec">Formas por lengua ${famsel} ${brsel}</div>${body}`;
  document.getElementById("cfam").onchange = e => patch({ cfam: e.target.value, cbranch: "" });
  const cb = document.getElementById("cbr"); if (cb) cb.onchange = e => patch({ cbranch: e.target.value });
  D.querySelectorAll("tr[data-fid]").forEach(tr => tr.onclick = () => patch({ sel: tr.dataset.fid }));
}
