// Página P2: Comparar N formas lado a lado (código OAS, esqueleto, linaje…). Resalta coincidencias (resonancia).
import { API } from "../api.js";
import { esc, lname, mount } from "../dom.js";
import { patch, parse } from "../router.js";

let timer;

function addbar() {
  return `<input id="cq" placeholder="añade una forma a comparar (palabra)…" style="min-width:280px">
          <div id="cadd" class="adddrop"></div>
          <span class="mut" style="font-size:12px">o abre una palabra y usa “+ comparar”</span>`;
}

function wireAdd(ids) {
  const q = document.getElementById("cq"), box = document.getElementById("cadd");
  q.oninput = () => {
    clearTimeout(timer);
    const v = q.value.trim(); if (!v) { box.innerHTML = ""; return; }
    timer = setTimeout(async () => {
      const rs = await API.search(v);
      box.innerHTML = rs.slice(0, 8).map(r => `<div class="addrow" data-id="${esc(r.id)}"><b>${esc(r.orthography)}</b> <span class="mut">${esc(r.lect_name || r.lect_id)} · ${esc(r.subgroup || r.family || "")}</span></div>`).join("");
      box.querySelectorAll(".addrow").forEach(el => el.onclick = () => {
        const next = ids.concat(el.dataset.id).filter((x, i, a) => a.indexOf(x) === i);
        patch({ ids: next.join(",") }); box.innerHTML = ""; q.value = "";
      });
    }, 250);
  };
}

// fila de atributo: resalta celdas cuyo valor se repite entre formas (resonancia)
function attrRow(label, forms, val, { highlight = false, mono = false } = {}) {
  const vals = forms.map(val);
  const counts = {}; vals.forEach(v => { if (v) counts[v] = (counts[v] || 0) + 1; });
  const tds = vals.map(v => {
    const hit = highlight && v && counts[v] > 1;
    return `<td class="${mono ? "mono" : ""} ${hit ? "match" : ""}">${esc(v || "—")}</td>`;
  }).join("");
  return `<tr><th>${esc(label)}</th>${tds}</tr>`;
}

const compactLineage = d => (d.lineage || []).map(e => `${e.lect}·${e.form}`).slice(-1).join("") || "";
const chainStr = d => (d.lineage || []).map(e => e.form).join(" → ") || "—";

export async function render(p) {
  const ids = (p.ids || "").split(",").filter(Boolean);
  mount("#toolbar", addbar()); wireAdd(ids);
  if (!ids.length) { mount("#view", `<div class="page"><h1>Comparar</h1><p class="lead">Añade dos o más formas (arriba) para compararlas lado a lado: su forma, IPA, <b>esqueleto</b> y <b>código endolingüístico</b>, y su linaje hasta PIE. Las coincidencias de código/esqueleto entre formas se resaltan (resonancia).</p></div>`); return; }
  mount("#view", `<div class="cmpwrap"><div class="hint">cargando…</div></div>`);
  const forms = (await API.compare(ids.join(","))).filter(d => d && !d.error);
  const head = `<tr><th></th>${forms.map((d, i) => `<td class="cmphead"><button class="rm" data-i="${i}">×</button><div class="w">${esc(d.word)}</div><div class="mut" style="font-size:12px">${lname(d.lect_id, d.lect_name)}</div></td>`).join("")}</tr>`;
  const rows = [
    attrRow("rama / familia", forms, d => (d.subgroup ? d.subgroup + " / " : "") + (d.family || "")),
    attrRow("IPA", forms, d => d.ipa_raw || d.ipa_elab || "", { mono: true }),
    attrRow("esqueleto", forms, d => (d.skeleton || {}).cons || "", { mono: true, highlight: true }),
    attrRow("código raíz", forms, d => d.root_code || "", { mono: true, highlight: true }),
    attrRow("código forma", forms, d => (d.skeleton || {}).code || "", { mono: true, highlight: true }),
    attrRow("self-info", forms, d => d.self_info != null ? d.self_info.toFixed(2) : "", { mono: true }),
    attrRow("¿llega a PIE?", forms, d => d.reaches_pie ? "sí — " + (d.deepest || "PIE") : (d.deepest || "—")),
    attrRow("linaje", forms, chainStr),
    attrRow("concepto(s)", forms, d => (d.concepts || []).join(", ")),
    attrRow("sentido", forms, d => (d.senses || [])[0] || ""),
  ].join("");
  mount("#view", `<div class="cmpwrap"><table class="cmp">${head}${rows}</table>
    <p class="mut" style="padding:12px 4px;font-size:12px">Las celdas resaltadas comparten valor entre formas — resonancia de esqueleto/código. Clic en una columna abre su ficha.</p></div>`);
  document.querySelectorAll(".cmp .rm").forEach(b => b.onclick = () => {
    const next = ids.filter((_, i) => i !== +b.dataset.i); patch({ ids: next.join(",") });
  });
  document.querySelectorAll(".cmphead .w").forEach((w, i) => { w.style.cursor = "pointer"; w.onclick = () => location.hash = "#/form/" + encodeURIComponent(forms[i].id); });
}
