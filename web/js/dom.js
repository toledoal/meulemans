// Helpers de render (sin dependencias). esc() para texto, h`` para plantillas seguras-ish, el() para nodos.
export const esc = s => (s == null ? "" : "" + s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const $ = (s, r = document) => r.querySelector(s);
export const num = n => (n == null ? "" : (+n).toLocaleString("es"));

// crea un nodo desde HTML string
export function node(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// setea el contenido de un contenedor
export function mount(sel, html) {
  const c = typeof sel === "string" ? $(sel) : sel;
  c.innerHTML = html;
  return c;
}

// nombre de lengua + iso
export const lname = (lc, nm) => `${esc(nm || lc)} <span class="iso">${esc(lc)}</span>`;

// badge de fuente abreviado
const SRC = { "kaikki-cog": "cog", "kaikki-etymology": "etim", "iecor-gold": "iecor★", "liv": "LIV²", "kaikki-tree": "árbol", "kaikki-prose": "prosa", "pokorny": "Pokorny", "kaikki": "kaikki", "lexibank": "lex", "ids": "ids", "nel": "nel", "iecor": "iecor" };
export const srcbadge = s => (s || "").split(/,\s*/).filter(Boolean).map(x => `<span class="badge2 b-src">${esc(SRC[x] || x)}</span>`).join(" ");
