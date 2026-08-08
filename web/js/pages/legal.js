// Página LEGAL: cómo citar, cómo usar, atribuciones (vivas desde /api/sources), licencias, copyright.
import { API } from "../api.js";
import { esc, mount } from "../dom.js";

const YEAR = 2026;

export async function render() {
  mount("#toolbar", "");
  mount("#view", `<div class="page"><h1>Legal · fuentes, licencias y cómo citar</h1><div class="hint">cargando fuentes…</div></div>`);
  let srcs = [];
  try { srcs = await API.sources(); } catch {}

  const badge = r => `<span class="badge2 ${r.redistributable ? "b-src" : "b-loan"}">${esc(r.license || "?")}</span>`;
  const srcRows = srcs.map(r => `<tr>
    <td class="lc"><b>${esc(r.id)}</b></td>
    <td>${esc(r.citation || "")}${r.url ? ` · <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url.replace(/^https?:\/\//, ""))}</a>` : ""}</td>
    <td class="rt">${badge(r)}</td>
    <td class="rt">${r.redistributable ? "✔ redistribuible" : "⛔ cuarentena"}</td></tr>`).join("");

  mount("#view", `<div class="page">
    <h1>Legal · fuentes, licencias y cómo citar</h1>

    <h2>Qué es Meulemans (y qué no)</h2>
    <p>Meulemans <b>no genera datos lingüísticos primarios</b>: <b>integra</b> fuentes existentes —cada una con su
    autoría y licencia propias— en una base consultable para <b>investigación y experimentos</b> de lingüística
    histórica y comparada. Toda forma, sentido y arista de linaje conserva su procedencia (<code>source_id</code>).
    No redistribuimos las fuentes: las citamos y respetamos su licencia.</p>

    <h2>Cómo usar</h2>
    <ul>
      <li>Uso <b>académico y de investigación</b>. La consulta es de <b>solo lectura</b>.</li>
      <li>Al reutilizar datos, <b>atribuye</b> tanto a Meulemans como a la(s) fuente(s) originales de esos datos.</li>
      <li>Los datos con licencia <b>ShareAlike (CC-BY-SA)</b> obligan a publicar los derivados bajo la misma licencia.</li>
      <li>Los datos <b>en cuarentena</b> (copyright / CC-BY-NC-ND) son para uso interno; <b>no se redistribuyen</b>.</li>
    </ul>

    <h2>Cómo citar</h2>
    <div class="cite">
      <div class="mut">Herramienta / corpus:</div>
      Toledo Martínez, A. (${YEAR}). <i>Meulemans — corpus léxico integrativo</i>. Capa de consulta sobre el Corpus
      Integrativo. En honor a la Dra. Christiane S. Meulemans y el Dr. José Ángel Elías (Fundación Dr. J. Meulemans).
      <div class="mut" style="margin-top:8px">Y además, cita la <b>fuente específica</b> de cada dato que uses (tabla de abajo).</div>
    </div>

    <h2>Atribuciones y licencias de las fuentes</h2>
    <p class="mut">Lista viva desde la base de datos. Las marcadas <b>⛔ cuarentena</b> se excluyen de cualquier
    publicación/exportación de datos.</p>
    <table><tr><td class="mut" style="text-transform:uppercase;font-size:11px">fuente</td><td class="mut" style="text-transform:uppercase;font-size:11px">cita</td><td class="rt mut" style="text-transform:uppercase;font-size:11px">licencia</td><td class="rt mut" style="text-transform:uppercase;font-size:11px">estado</td></tr>${srcRows}</table>

    <h2>Copyright</h2>
    <p>El código de Meulemans es del autor. Los <b>datos</b> pertenecen a sus fuentes respectivas y se usan bajo sus
    licencias. Nada aquí transfiere derechos sobre esos datos. Las obras bajo copyright (p.ej. diccionarios
    etimológicos comerciales) se emplean solo como referencia interna de investigación y no se distribuyen.</p>

    <h2>Reconocimiento</h2>
    <p>La disciplina que este proyecto sirve fue fundada por la Dra. Christiane S. Meulemans y el Dr. José Ángel Elías
    (Fundación Dr. J. Meulemans). Ver <a href="#/about">Acerca de</a>.</p>
  </div>`);
}
