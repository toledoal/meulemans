// Cliente API con caché en memoria (para lookups estables: families, lects, formas ya vistas).
const cache = new Map();

async function get(url, { cache: useCache = false } = {}) {
  if (useCache && cache.has(url)) return cache.get(url);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const data = await r.json();
  if (useCache) cache.set(url, data);
  return data;
}

const qs = o => Object.entries(o).filter(([, v]) => v != null && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

export const API = {
  stats: () => get("/api/stats", { cache: true }),
  sources: () => get("/api/sources", { cache: true }),
  families: () => get("/api/families", { cache: true }),
  lects: (family = "") => get("/api/lects?" + qs({ family }), { cache: true }),
  search: (q, lect = "", family = "") => get("/api/search?" + qs({ q, lect, family })),
  concepts: q => get("/api/concepts?" + qs({ q })),
  concept: (cid, family = "", branch = "") => get(`/api/concept/${cid}?` + qs({ family, branch })),
  form: id => get("/api/form?" + qs({ id })),
};
