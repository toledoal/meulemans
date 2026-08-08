// Arranque de Meulemans: nav de plataforma, tema, stats, y router → páginas.
import { API } from "./api.js";
import { onRoute, parse, go } from "./router.js";
import { num, mount } from "./dom.js";
import * as search from "./pages/search.js";
import * as formpage from "./pages/form.js";
import * as about from "./pages/about.js";
import * as legal from "./pages/legal.js";

// Registro de páginas (nav). Las futuras van marcadas "pronto" — así se ve la plataforma y añadir una es trivial.
const PAGES = [
  { id: "search", label: "Buscar", route: "/" },
  { id: "compare", label: "Comparar", soon: true },
  { id: "coderiv", label: "Coderivados", soon: true },
  { id: "genealogy", label: "Genealogía", soon: true },
  { id: "classes", label: "Clases OAS/Dolgo", soon: true },
  { id: "map", label: "Mapa", soon: true },
  { id: "about", label: "Acerca de", route: "/about" },
  { id: "legal", label: "Legal", route: "/legal" },
];

function nav(active) {
  mount("#nav", PAGES.map(p =>
    `<span class="navitem ${p.soon ? "soon" : ""} ${active === p.id ? "on" : ""}" ${p.soon ? "" : `data-route="${p.route}"`}>
       ${p.label}${p.soon ? '<span class="badge">pronto</span>' : ""}</span>`).join(""));
  document.querySelectorAll("#nav [data-route]").forEach(n => n.onclick = () => go(n.dataset.route, {}));
}

function initTheme() {
  const btn = document.getElementById("theme");
  const saved = localStorage.getItem("m-theme");
  if (saved) document.documentElement.dataset.theme = saved;
  btn.onclick = () => {
    const cur = document.documentElement.dataset.theme;
    const dark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme:dark)").matches;
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next; localStorage.setItem("m-theme", next);
  };
}

async function initStats() {
  try { const s = await API.stats(); document.getElementById("stats").textContent = `${num(s.forms)} formas · ${num(s.langs)} lenguas · ${num(s.concepts)} conceptos`; } catch {}
}

async function route({ path, params }) {
  if (path.startsWith("/form/")) { nav(null); return formpage.render(decodeURIComponent(path.slice(6))); }
  if (path === "/about") { nav("about"); return about.render(); }
  if (path === "/legal") { nav("legal"); return legal.render(); }
  nav("search"); return search.render(params);
}

initTheme(); initStats();
onRoute(route);
