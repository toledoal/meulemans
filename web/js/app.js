// Arranque de Meulemans: nav de plataforma, tema, stats, y router → páginas.
import { API } from "./api.js";
import { onRoute, parse, go } from "./router.js";
import { num, mount } from "./dom.js";
import * as search from "./pages/search.js";
import * as formpage from "./pages/form.js";
import * as about from "./pages/about.js";
import * as legal from "./pages/legal.js";
import * as compare from "./pages/compare.js";
import * as genealogy from "./pages/genealogy.js";

// Registro de páginas (nav). Las futuras van marcadas "pronto" — así se ve la plataforma y añadir una es trivial.
const PAGES = [
  { id: "search", label: "Buscar", route: "/", icon: "⌕" },
  { id: "compare", label: "Comparar", route: "/compare", icon: "⇄" },
  { id: "coderiv", label: "Coderivados", soon: true, icon: "◕" },
  { id: "genealogy", label: "Genealogía", route: "/genealogy", icon: "⋔" },
  { id: "classes", label: "Clases", soon: true, icon: "◧" },
  { id: "map", label: "Mapa", soon: true, icon: "◎" },
];
const SECONDARY = [
  { id: "about", label: "Acerca de", route: "/about" },
  { id: "legal", label: "Legal", route: "/legal" },
];

function navItem(p, active) {
  return `<a class="navitem ${p.soon ? "soon" : ""} ${active === p.id ? "on" : ""}" ${p.soon ? "" : `data-route="${p.route}"`}>
    ${p.icon ? `<span class="ic">${p.icon}</span>` : ""}<span class="lb">${p.label}</span>${p.soon ? '<span class="badge">pronto</span>' : ""}</a>`;
}
function nav(active) {
  mount("#nav", `<div class="navsec">Explorar</div>${PAGES.map(p => navItem(p, active)).join("")}
    <div class="navsep"></div>${SECONDARY.map(p => navItem(p, active)).join("")}`);
  document.querySelectorAll("#nav [data-route]").forEach(n => n.onclick = e => { e.preventDefault(); go(n.dataset.route, {}); });
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
  if (path === "/compare") { nav("compare"); return compare.render(params); }
  if (path === "/genealogy") { nav("genealogy"); return genealogy.render(params); }
  nav("search"); return search.render(params);
}

initTheme(); initStats();
onRoute(route);
