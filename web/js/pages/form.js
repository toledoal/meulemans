// Página de ficha independiente (#/form/<id>) — deep-link compartible a una forma.
import { API } from "../api.js";
import { mount } from "../dom.js";
import { formCard } from "../render.js";

export async function render(id) {
  mount("#toolbar", "");
  mount("#view", `<section id="detail" style="padding:26px 32px;max-width:960px;margin:0 auto"><div class="hint">cargando…</div></section>`);
  document.getElementById("detail").innerHTML = formCard(await API.form(id), {
    backHtml: `<div class="back" onclick="history.length>1?history.back():location.hash='#/'">← volver</div>`,
  });
}
