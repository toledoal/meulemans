// Router hash: #<path>?<query>. Deep-link + back/forward nativos. Cada estado (búsqueda, filtros, selección) va aquí.
export function parse() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = raw.split("?");
  const params = {};
  new URLSearchParams(query).forEach((v, k) => (params[k] = v));
  return { path: path || "/", params };
}

export function toHash(path, params = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== "")).toString();
  return "#" + path + (q ? "?" + q : "");
}

// navega (push por defecto; replace para no ensuciar el historial en cambios menores)
export function go(path, params = {}, { replace = false } = {}) {
  const h = toHash(path, params);
  if (replace) location.replace(h); else location.hash = h;
}

// actualiza solo algunos params de la ruta actual
export function patch(delta, opts) {
  const { path, params } = parse();
  go(path, { ...params, ...delta }, opts);
}

export function onRoute(cb) {
  addEventListener("hashchange", () => cb(parse()));
  cb(parse());
}
