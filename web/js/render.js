// Componentes de render reutilizables (se usan en la ficha y, luego, en Comparar/Rutas).
import { esc, lname, srcbadge, num } from "./dom.js";

export function lineageLadder(d) {
  const head = d.reaches_pie ? '<span class="badge2 b-pie">llega a PIE ✓</span>'
    : (d.deepest ? `<span class="n">(hasta ${esc(d.deepest)})</span>` : "");
  const steps = (d.lineage || []).map(e => {
    const loan = e.kind === "prestamo" || e.kind === "sustrato";
    return `<div class="step" style="margin-left:${(e.order || 0) * 15}px">
      <span class="k${loan ? " loan" : ""}">${esc(e.kind || "")}</span>
      <span class="lv">${lname(e.lect, e.lect_name)}</span>
      <span class="fm">${esc(e.form)}</span>
      ${e.lect === "ine-pro" ? '<span class="badge2 b-pie">PIE</span>' : ""}
      ${e.src ? `<span class="iso">· ${esc(e.src)}</span>` : ""}</div>`;
  }).join("");
  const prose = d.etymology_text ? `<div class="prose">${esc(d.etymology_text)}</div>` : "";
  const body = steps ? `<div class="ladder">${steps}</div>` : (prose ? "" : '<span class="mut">—</span>');
  return `<div class="sec">Etimología · toda la historia ${head}</div>${prose}${body}`;
}

export function cognateTable(d) {
  const cg = d.cognates || [], m = d.cognate_meta || {};
  if (!cg.length) return '<div class="sec">Cognados / coderivados</div><span class="mut">no ligado a cognados</span>';
  const rows = cg.map(c => `<tr><td class="lc">${lname(c.lect, c.lect_name)}</td><td>${esc(c.word)}</td>
    <td class="gl">${esc(c.gloss || "")}</td><td class="rt">${srcbadge(c.srcs)}</td></tr>`).join("");
  return `<div class="sec">Cognados / coderivados <span class="n">${cg.length}${m.n_sets > 1 ? " · " + m.n_sets + " conjuntos" : ""} · ${esc(m.sources || "")}</span></div><table>${rows}</table>`;
}

export function meaningNet(d) {
  const CC = d.concepts || [];
  if (!CC.length) return "";
  const lead = CC.map(g => `<span class="cxlead">${esc(g)}</span>`).join(' <span class="mut">+</span> ');
  const partners = (d.colex || []).length
    ? `<div style="margin-top:5px"><span class="mut">se colexifica con</span> ` +
      d.colex.map(x => `<span class="cxchip">${esc(x.concept)} <span class="cxn num">${x.langs} leng${x.families > 1 ? " · " + x.families + " fam" : ""}</span></span>`).join("") + "</div>"
    : '<div class="mut">— sin colexificaciones</div>';
  return `<div class="sec">Red de significado <span class="n">colexificación · todas las fuentes</span></div>
    <div>${lead}${CC.length > 1 ? ` <span class="mut">(colexifica ${CC.length} conceptos)</span>` : ""}</div>${partners}`;
}

export function phonetics(d) {
  const segs = (d.segments || []).map(s => `<span class="seg${s.stress ? " st" : ""}">${esc(s.ipa)}</span>`).join("") || '<span class="mut">—</span>';
  const ipa = d.ipa_raw ? `<span class="chipcode">${esc(d.ipa_raw)}</span> <span class="mut">fuente</span>`
    : (d.ipa_elab ? `<span class="chipcode">${esc(d.ipa_elab)}</span> <span class="mut">G2P</span>` : '<span class="mut">— sin IPA</span>');
  return `<div class="sec">Fonética</div><div class="meta">IPA: ${ipa}</div><div style="margin-top:6px">${segs}</div>`;
}

export function endoAnalysis(d) {
  const sk = d.skeleton || {}, mo = d.morphemes || [];
  let inner;
  if (mo.length) {
    const chips = mo.map(m => `<span class="mchip${m.role === "root" ? " root" : ""}">${esc(m.surface)} <code>${esc(m.code || "∅")}</code>${m.role === "root" ? ' <span class="rlbl">raíz</span>' : ""}</span>`).join('<span class="plus">+</span>');
    inner = `${d.root_code ? `<div style="margin-bottom:8px"><span class="lbl">código de la raíz</span> <span class="mut">(${esc(d.root_surface)})</span> <code class="big">${esc(d.root_code)}</code></div>` : ""}
      <div class="mbreak">${chips}</div>
      <div style="margin-top:8px"><span class="lbl">núcleo</span> <code>${esc(sk.core || "—")}</code> · <span class="lbl">forma completa</span> <code>${esc(sk.code || "—")}</code>${sk.compound ? ' <span class="badge2 b-src">univerbación</span>' : ""} · <span class="lbl">vocales</span> <code>${esc(sk.vowels || "—")}</code>${d.self_info != null ? ` · <span class="lbl">self-info</span> <code class="num">${d.self_info.toFixed(2)}</code>` : ""}</div>`;
  } else {
    inner = `<span class="lbl">código (forma superficial)</span> <code class="big">${esc(sk.code || "—")}</code> <span class="mut">— raíz sin segmentar</span> · <span class="lbl">esqueleto</span> <code>${esc(sk.cons || "—")}</code>${d.self_info != null ? ` · <span class="lbl">self-info</span> <code class="num">${d.self_info.toFixed(2)}</code>` : ""}`;
  }
  return `<div class="sec">Análisis endolingüístico <span class="n">capa derivada · el código va sobre la RAÍZ</span></div><div class="anal">${inner}</div>`;
}

export function senses(d) {
  const s = (d.senses || []).map((g, i) => `<div class="sens"><span class="i num">${i + 1}</span>${esc(g)}</div>`).join("") || '<span class="mut">—</span>';
  return `<div class="sec">Sentidos</div>${s}`;
}

export function formHeader(d) {
  return `<div class="whead"><div class="word">${esc(d.word)}</div>
      <a class="cmpadd" href="#/compare?ids=${encodeURIComponent(d.id)}">+ comparar</a>
      <a class="cmpadd" href="#/genealogy?id=${encodeURIComponent(d.id)}">⋔ genealogía</a></div>
    <div class="meta"><b>${lname(d.lect_id, d.lect_name)}</b> · ${esc(d.family || "")}${d.subgroup ? " / " + esc(d.subgroup) : ""}
      ${d.pos ? " · " + esc(d.pos) : ""}${d.is_loan ? ' · <span class="badge2 b-loan">préstamo</span>' : ""}
      · <span class="mut">fuente</span> ${srcbadge(d.source)}</div>`;
}

// ficha completa (equilibrada) — reutilizable
export function formCard(d, { backHtml = "" } = {}) {
  if (d.error) return `<div class="hint">forma no encontrada</div>`;
  return backHtml + formHeader(d) + senses(d) + meaningNet(d) + lineageLadder(d) + cognateTable(d) + phonetics(d) + endoAnalysis(d);
}
