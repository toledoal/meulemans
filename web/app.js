"use strict";
const $ = s => document.querySelector(s);
const esc = s => (s == null ? "" : "" + s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const api = async u => (await fetch(u)).json();
const SRCLBL = { "kaikki-cog": "cog", "kaikki-etymology": "etim", "iecor-gold": "iecor★", "liv": "LIV²", "kaikki-tree": "árbol", "kaikki-prose": "prosa", "pokorny": "Pokorny" };
let CBACK = null;

async function init() {
  const st = await api("/api/stats");
  $("#statline").textContent = `${(+st.forms).toLocaleString()} formas · ${(+st.langs).toLocaleString()} lenguas · ${(+st.concepts).toLocaleString()} conceptos`;
  const fams = await api("/api/families");
  const fs = $("#family");
  fams.forEach(f => { const o = document.createElement("option"); o.value = f.family; o.textContent = `${f.family} (${f.lenguas})`; fs.appendChild(o); });
  await loadLects("");
  $("#family").addEventListener("change", e => loadLects(e.target.value));
  $("#mode").addEventListener("change", e => {
    const cm = e.target.value === "concept";
    $("#q").placeholder = cm ? "concepto en inglés (water, dog, mother…)" : "busca una palabra (cualquier alfabeto)…";
    $("#lect").style.display = cm ? "none" : ""; $("#family").style.display = cm ? "none" : "";
  });
  $("#searchform").addEventListener("submit", e => { e.preventDefault(); go(); });
}

async function loadLects(family) {
  const ls = await api("/api/lects?family=" + encodeURIComponent(family || ""));
  const sel = $("#lect"); sel.innerHTML = '<option value="">todas las lenguas</option>';
  ls.forEach(l => { const o = document.createElement("option"); o.value = l.id; o.textContent = `${l.name} — ${l.subgroup || l.family} (${l.n})`; sel.appendChild(o); });
}

async function go() {
  const q = $("#q").value.trim(); if (!q) return;
  if ($("#mode").value === "concept") return goConcept(q);
  const rs = await api(`/api/search?q=${encodeURIComponent(q)}&lect=${encodeURIComponent($("#lect").value)}&family=${encodeURIComponent($("#family").value)}`);
  const R = $("#results"); R.innerHTML = rs.length ? "" : '<div class="hint">sin resultados</div>';
  rs.forEach(r => {
    const d = document.createElement("div"); d.className = "r";
    d.innerHTML = `<b>${esc(r.orthography)}</b><span class="tagn">${esc(r.lect_id)}</span><div class="sub">${esc(r.lect_name || r.lect_id)} · ${esc(r.subgroup || r.family || "")}</div>`;
    d.onclick = () => { sel(d); show(r.id, false); }; R.appendChild(d);
  });
  if (rs.length) R.firstChild.click();
}

async function goConcept(q) {
  const cs = await api("/api/concepts?q=" + encodeURIComponent(q));
  const R = $("#results"); R.innerHTML = cs.length ? "" : '<div class="hint">sin conceptos</div>';
  cs.forEach(c => {
    const d = document.createElement("div"); d.className = "r";
    d.innerHTML = `<b>${esc(c.gloss)}</b><span class="tagn">${c.n}</span>${c.field ? `<div class="sub">${esc(c.field)}</div>` : ""}`;
    d.onclick = () => { sel(d); showConcept(c.id, ""); }; R.appendChild(d);
  });
  if (cs.length) R.firstChild.click();
}

function sel(d) { [...$("#results").children].forEach(x => x.classList.remove("sel")); d.classList.add("sel"); }
const ln = (lc, nm) => `${esc(nm || lc)} <span class="iso">${esc(lc)}</span>`;

async function showConcept(cid, family) {
  const d = await api(`/api/concept/${cid}?family=${encodeURIComponent(family || "")}`);
  CBACK = window.CBACK = { cid, family: family || "", gloss: d.gloss };
  const byFam = {}; (d.forms || []).forEach(r => (byFam[r.family] = byFam[r.family] || []).push(r));
  const famsel = `<select onchange="showConcept(${cid},this.value)"><option value="">— todas las familias (${d.forms.length}${d.truncated ? "+" : ""}) —</option>` +
    (d.families || []).map(f => `<option value="${esc(f)}"${f === family ? " selected" : ""}>${esc(f)}</option>`).join("") + "</select>";
  const body = Object.keys(byFam).map(fam =>
    `<div class="cfam">${esc(fam)} <span class="mut">(${byFam[fam].length})</span></div><table>` +
    byFam[fam].map(r => `<tr onclick="show('${r.id.replace(/'/g, "\\'")}',1)" style="cursor:pointer"><td class="lc">${ln(r.lect, r.lect_name)}</td><td><b>${esc(r.orthography)}</b></td><td class="srccol"><span class="src2">${esc(r.source)}</span></td></tr>`).join("") + "</table>").join("");
  $("#detail").innerHTML = `<div class="word">${esc(d.gloss)}</div>` +
    `<div class="meta">concepto Concepticon${d.ccid ? " #" + esc(d.ccid) : ""}${d.field ? " · <b>" + esc(d.field) + "</b>" : ""} · ${d.forms.length}${d.truncated ? "+" : ""} formas${d.truncated ? ' <span class="mut">(tope — filtra por familia)</span>' : ""}</div>` +
    `<div class="sec">Formas por lengua ${famsel}</div>${body}`;
}

async function show(id, back) {
  const d = await api("/api/form?id=" + encodeURIComponent(id));
  const D = $("#detail"); const sk = d.skeleton || {};
  const sens = (d.senses || []).map((g, i) => `<div class="sens"><span class="i">${i + 1}</span>${esc(g)}</div>`).join("") || '<span class="mut">—</span>';
  const lin = (d.lineage || []).map(e => `<div class="lin" style="margin-left:${(e.order || 0) * 16}px"><span class="mut">↑</span> <span class="k">${esc(e.kind || "")}</span>${ln(e.lect, e.lect_name)} <i>${esc(e.form)}</i>${e.lect === "ine-pro" ? ' <span class="pie">PIE</span>' : ""}${e.src ? ` <span class="iso">· ${esc(e.src)}</span>` : ""}</div>`).join("");
  const srcb = s => (s || "").split(", ").map(x => `<span class="src2">${esc(SRCLBL[x] || x)}</span>`).join(" ");
  const cg = d.cognates || [], cm = d.cognate_meta || {};
  const cogs = cg.length ? `<div class="cog"><h4>${cg.length} coderivados <span class="src">· ${cm.n_sets > 1 ? cm.n_sets + " conjuntos · " : ""}${esc(cm.sources || "")}</span></h4><table>` +
    cg.map(m => `<tr><td class="lc">${ln(m.lect, m.lect_name)}</td><td>${esc(m.word)}</td><td class="gl">${esc(m.gloss || "")}</td><td class="srccol">${srcb(m.srcs)}</td></tr>`).join("") + "</table></div>" : '<span class="mut">no ligado a cognados</span>';
  const CC = d.concepts || [];
  const colex = CC.length ? `<div class="colx"><div>${CC.map(g => `<span class="cxlead">${esc(g)}</span>`).join(' <span class="mut">+</span> ')}${CC.length > 1 ? ` <span class="mut">(colexifica ${CC.length} conceptos)</span>` : ""}</div>` +
    ((d.colex || []).length ? `<div style="margin-top:4px"><span class="mut">se colexifica con</span> ` + d.colex.map(x => `<span class="cxchip">${esc(x.concept)} <span class="cxn">${x.langs} leng${x.families > 1 ? " · " + x.families + " fam" : ""}</span></span>`).join("") + "</div>" : '<div class="mut">— sin colexificaciones</div>') + "</div>" : "";
  const segs = (d.segments || []).map(s => `<span class="seg${s.stress ? " st" : ""}">${esc(s.ipa)}</span>`).join("") || '<span class="mut">—</span>';
  const morphs = d.morphemes || [];
  let endo;
  if (morphs.length) {
    const chips = morphs.map(m => `<span class="mchip${m.role === "root" ? " root" : ""}">${esc(m.surface)} <code>${esc(m.code || "∅")}</code>${m.role === "root" ? ' <span class="rlbl">raíz</span>' : ""}</span>`).join('<span class="plus">+</span>');
    endo = `<div class="anal">${d.root_code ? `<div style="margin-bottom:8px"><span class="lbl">código de la raíz</span> <span class="mut">(${esc(d.root_surface)})</span> <code class="big">${esc(d.root_code)}</code></div>` : ""}<div class="mbreak">${chips}</div><div style="margin-top:8px"><span class="lbl">núcleo</span> <code>${esc(sk.core || "—")}</code> · <span class="lbl">forma completa</span> <code>${esc(sk.code || "—")}</code>${sk.compound ? ' <span class="src2">univerbación</span>' : ""} · <span class="lbl">vocales</span> <code>${esc(sk.vowels || "—")}</code>${d.self_info != null ? ` · <span class="lbl">self-info</span> <code>${d.self_info.toFixed(2)}</code>` : ""}</div></div>`;
  } else {
    endo = `<div class="anal"><span class="lbl">código (forma superficial)</span> <code class="big">${esc(sk.code || "—")}</code> <span class="mut">— raíz sin segmentar</span> · <span class="lbl">esqueleto</span> <code>${esc(sk.cons || "—")}</code>${d.self_info != null ? ` · <span class="lbl">self-info</span> <code>${d.self_info.toFixed(2)}</code>` : ""}</div>`;
  }
  D.innerHTML =
    (back && CBACK ? `<div class="back" onclick="showConcept(CBACK.cid,CBACK.family)">← volver a «${esc(CBACK.gloss)}»</div>` : "") +
    `<div class="word">${esc(d.word)}</div>` +
    `<div class="meta"><b>${esc(d.lect_name || d.lect_id)}</b> <span class="iso">${esc(d.lect_id)}</span> · ${esc(d.family || "")}${d.subgroup ? " / " + esc(d.subgroup) : ""} · ${esc(d.pos || "")}${d.is_loan ? ' · <span class="src2">préstamo</span>' : ""} · <span class="mut">fuente ${esc(d.source)}</span></div>` +
    `<div class="sec">Sentidos</div>${sens}` +
    (CC.length ? `<div class="sec">Red de significado <span class="n">(colexificación · todas las fuentes)</span></div>${colex}` : "") +
    `<div class="sec">Etimología · toda la historia ${d.reaches_pie ? '<span class="pie">llega a PIE ✓</span>' : (d.deepest ? `<span class="n">(hasta ${esc(d.deepest)})</span>` : "")}</div>` +
    (d.etymology_text ? `<div class="prose">${esc(d.etymology_text)}</div>` : "") +
    (lin ? `<div style="margin-top:6px">${lin}</div>` : (d.etymology_text ? "" : '<span class="mut">—</span>')) +
    `<div class="sec">Cognados / coderivados</div>${cogs}` +
    `<div class="sec">Fonética</div><div class="meta">IPA: ${d.ipa_raw ? `<code>${esc(d.ipa_raw)}</code> <span class="mut">fuente</span>` : ""}${d.ipa_elab ? ` <code>${esc(d.ipa_elab)}</code> <span class="mut">G2P</span>` : ""}${!d.ipa_raw && !d.ipa_elab ? '<span class="mut">— sin IPA</span>' : ""}</div><div style="margin-top:6px">${segs}</div>` +
    `<div class="sec">Análisis endolingüístico <span class="n">(capa derivada · el código va sobre la RAÍZ)</span></div>${endo}`;
}

window.showConcept = showConcept; window.show = show; window.CBACK = null;
init();
