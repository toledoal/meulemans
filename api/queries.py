"""Consultas de Meulemans sobre el corpus. Todo SELECT (solo lectura). Rama/familia salen de lect.family/subgroup."""
import unicodedata
from .db import rows, one

_RANK = {"idiolecto": 0, "dialecto": 1, "lengua": 2, "estadio": 3, "subfamilia": 4,
         "proto_rama": 5, "pie": 6, "nostratico": 7}


def nfc(s):
    return unicodedata.normalize("NFC", (s or "").strip())


def families():
    """Familias con nº de lenguas y formas (para el filtro)."""
    return rows("""SELECT l.family, count(DISTINCT l.id) lenguas, count(f.id) formas
                   FROM lect l JOIN form f ON f.lect_id=l.id
                   WHERE l.family IS NOT NULL GROUP BY 1 ORDER BY 3 DESC""")


def lects(family=None, q=None):
    """Lenguas (para picker/filtro), opcionalmente por familia o texto."""
    w, p = ["l.family IS NOT NULL"], []
    if family:
        w.append("l.family=%s"); p.append(family)
    if q:
        w.append("(l.name ILIKE %s OR l.id ILIKE %s)"); p += ["%" + q + "%", "%" + q + "%"]
    return rows(f"""SELECT l.id, l.name, l.family, l.subgroup, count(f.id) n
                    FROM lect l JOIN form f ON f.lect_id=l.id
                    WHERE {' AND '.join(w)} GROUP BY 1,2,3,4 HAVING count(f.id)>0
                    ORDER BY n DESC LIMIT 4000""", p)


def search_word(q, lect=None, family=None, limit=100):
    """Busca formas por grafía (exacta primero, luego prefijo), con filtros."""
    base = """SELECT f.id, f.lect_id, l.name lect_name, l.family, l.subgroup, f.orthography
              FROM form f JOIN lect l ON l.id=f.lect_id WHERE """
    conds, p = [], []
    if lect:
        conds.append("f.lect_id=%s"); p.append(lect)
    if family:
        conds.append("l.family=%s"); p.append(family)
    extra = (" AND " + " AND ".join(conds)) if conds else ""
    r = rows(base + "lower(f.orthography)=lower(%s)" + extra + " LIMIT %s", [q] + p + [limit])
    if not r:
        r = rows(base + "lower(f.orthography) LIKE lower(%s)" + extra + " LIMIT %s", [q + "%"] + p + [limit])
    return r


def search_concept(q):
    """Conceptos Concepticon por glosa inglesa, con nº de formas."""
    sql = """SELECT c.id, COALESCE(c.gloss_en,c.concepticon_gloss) gloss, c.semantic_field field,
                    c.concepticon_id ccid, (SELECT count(*) FROM form f WHERE f.concept_id=c.id) n
             FROM concept c WHERE c.gloss_en ILIKE %s OR c.concepticon_gloss ILIKE %s
             ORDER BY 5 DESC LIMIT 80"""
    r = rows(sql, (q + "%", q + "%"))
    if not r:
        r = rows(sql, ("%" + q + "%", "%" + q + "%"))
    return r


def concept_forms(cid, family=None, branch=None):
    """Formas de un concepto a través de lenguas (con esqueleto/código), filtrables por familia y rama."""
    cr = one("SELECT COALESCE(gloss_en,concepticon_gloss) gloss, semantic_field field, concepticon_id ccid FROM concept WHERE id=%s", (cid,))
    q = """SELECT f.id, f.lect_id, l.name lect_name, l.family, l.subgroup, f.orthography, f.source_id,
                  sk.cons_skeleton skeleton, sk.code
           FROM form f JOIN lect l ON l.id=f.lect_id
           LEFT JOIN skeleton sk ON sk.form_id=f.id
           WHERE f.concept_id=%s"""
    p = [cid]
    if family:
        q += " AND l.family=%s"; p.append(family)
    if branch:
        q += " AND l.subgroup=%s"; p.append(branch)
    q += " ORDER BY l.family NULLS LAST, l.subgroup NULLS LAST, l.name, lower(normalize(f.orthography,NFC)) LIMIT 5000"
    seen, out = {}, []
    for r in rows(q, p):
        k = (r["lect_id"], (r["orthography"] or "").lower())
        if k in seen:
            if r["source_id"] not in seen[k]["source"]:
                seen[k]["source"] += "," + r["source_id"]
            continue
        r["source"] = r["source_id"]; seen[k] = r; out.append(r)
        if len(out) >= 800:
            break
    fams = [x["family"] for x in rows("SELECT DISTINCT l.family FROM form f JOIN lect l ON l.id=f.lect_id WHERE f.concept_id=%s AND l.family IS NOT NULL ORDER BY 1", (cid,))]
    # ramas (subgroups) disponibles SOLO dentro de la familia elegida
    brs = []
    if family:
        brs = [x["subgroup"] for x in rows("SELECT DISTINCT l.subgroup FROM form f JOIN lect l ON l.id=f.lect_id WHERE f.concept_id=%s AND l.family=%s AND l.subgroup IS NOT NULL ORDER BY 1", (cid, family))]
    return {"gloss": cr["gloss"] if cr else "?", "field": cr["field"] if cr else None,
            "ccid": cr["ccid"] if cr else None, "forms": out, "families": fams, "branches": brs, "truncated": len(out) >= 800}


def form_detail(fid):
    d = one("""SELECT f.id, f.lect_id, f.orthography word, f.ipa_raw, f.ipa_elab, f.pos, f.etymology_text,
                      f.is_proper, f.source_id source, f.is_loan, l.name lect_name, l.family, l.subgroup, l.level
               FROM form f LEFT JOIN lect l ON l.id=f.lect_id WHERE f.id=%s""", (fid,))
    if not d:
        return {"error": "no encontrado"}
    d["senses"] = [r["gloss"] for r in rows("SELECT gloss FROM sense WHERE form_id=%s AND gloss IS NOT NULL LIMIT 40", (fid,))]

    # LINAJE "toda la historia" — walk recursivo loan-safe (no trepa por préstamo/sustrato)
    lin = rows("""WITH RECURSIVE up AS (
                    SELECT fe.parent_lect, fe.parent_form, fe.parent_form_id, fe.kind, fe.source_id,
                           1 depth, ARRAY[fe.child_form_id] path
                    FROM form_etymology fe WHERE fe.child_form_id=%s
                    UNION ALL
                    SELECT fe.parent_lect, fe.parent_form, fe.parent_form_id, fe.kind, fe.source_id,
                           up.depth+1, up.path||fe.child_form_id
                    FROM form_etymology fe JOIN up ON fe.child_form_id=up.parent_form_id
                    WHERE up.depth<15 AND NOT fe.child_form_id = ANY(up.path)
                      AND up.kind IN ('herencia','reconstruido'))
                  SELECT DISTINCT ON (up.parent_lect, up.parent_form)
                         up.parent_lect lect, up.parent_form form, up.kind, up.source_id src,
                         up.depth, l.name lect_name, l.level
                  FROM up LEFT JOIN lect l ON l.id=up.parent_lect
                  ORDER BY up.parent_lect, up.parent_form, up.depth""", (fid,))
    for i, x in enumerate(sorted(lin, key=lambda x: (_RANK.get(x["level"], 2), x["depth"]))):
        x["order"] = i
    d["lineage"] = sorted(lin, key=lambda x: x["order"]) if lin else []
    d["reaches_pie"] = any(x["lect"] == "ine-pro" for x in lin)
    d["deepest"] = (d["lineage"][-1]["lect_name"] or d["lineage"][-1]["lect"]) if d["lineage"] else None

    # COGNADOS unificados (unión de sets del form, dedup por lengua+forma NFC, fuentes agregadas)
    d["cognates"] = rows("""WITH sets AS (SELECT DISTINCT cognate_set_id FROM cognate_member WHERE form_id=%s)
        SELECT f.lect_id lect, max(l.name) lect_name,
               (array_agg(f.orthography ORDER BY length(f.orthography), f.id))[1] word,
               min(g.gloss) gloss, string_agg(DISTINCT cs.source, ', ' ORDER BY cs.source) srcs
        FROM sets JOIN cognate_member cm ON cm.cognate_set_id=sets.cognate_set_id
        JOIN cognate_set cs ON cs.id=sets.cognate_set_id JOIN form f ON f.id=cm.form_id
        LEFT JOIN lect l ON l.id=f.lect_id
        LEFT JOIN LATERAL (SELECT gloss FROM sense s WHERE s.form_id=f.id AND gloss IS NOT NULL LIMIT 1) g ON true
        GROUP BY f.lect_id, lower(normalize(f.orthography,NFC)) ORDER BY f.lect_id, word LIMIT 200""", (fid,))
    m = one("SELECT count(DISTINCT cognate_set_id) n, string_agg(DISTINCT cs.source, ', ') s FROM cognate_member cm JOIN cognate_set cs ON cs.id=cm.cognate_set_id WHERE cm.form_id=%s", (fid,))
    d["cognate_meta"] = {"n_sets": (m["n"] if m else 0) or 0, "sources": (m["s"] if m else "") or ""}

    # RED DE SIGNIFICADO — conceptos del form + colexificación
    cc = rows("""SELECT DISTINCT c.id, COALESCE(c.gloss_en,c.concepticon_gloss) g FROM concept c WHERE c.id IN (
                   SELECT concept_id FROM sense WHERE form_id=%s AND concept_id IS NOT NULL
                   UNION SELECT concept_id FROM form WHERE id=%s AND concept_id IS NOT NULL) ORDER BY 2""", (fid, fid))
    d["concepts"] = [r["g"] for r in cc]
    cids = [r["id"] for r in cc]
    d["colex"] = []
    if cids:
        d["colex"] = rows("""SELECT COALESCE(c.gloss_en,c.concepticon_gloss) concept,
                                    count(DISTINCT x.lect_id) langs, count(DISTINCT l.family) families
                             FROM colex x JOIN concept c ON c.id = CASE WHEN x.concept_a = ANY(%s) THEN x.concept_b ELSE x.concept_a END
                             LEFT JOIN lect l ON l.id=x.lect_id
                             WHERE (x.concept_a = ANY(%s) OR x.concept_b = ANY(%s))
                               AND NOT (x.concept_a = ANY(%s) AND x.concept_b = ANY(%s))
                             GROUP BY 1 ORDER BY 2 DESC LIMIT 15""", (cids, cids, cids, cids, cids))

    # FONÉTICA
    d["segments"] = rows("SELECT ipa, is_stressed stress FROM segment WHERE form_id=%s ORDER BY pos", (fid,))
    sk = one("SELECT cons_skeleton cons, code, core_skeleton core, vowels, cv_template cv, is_compound compound FROM skeleton WHERE form_id=%s", (fid,))
    d["skeleton"] = sk
    mo = rows("SELECT role, COALESCE(surface,gloss) surface, cons_skeleton cons, code FROM morph WHERE form_id=%s ORDER BY morph_ord NULLS LAST, id", (fid,))
    d["morphemes"] = mo
    root = next((x for x in mo if x["role"] == "root" and x["code"]), None)
    d["root_code"] = root["code"] if root else None
    d["root_surface"] = root["surface"] if root else None
    ci = one("SELECT self_info FROM crypto WHERE form_id=%s", (fid,))
    d["self_info"] = float(ci["self_info"]) if ci and ci["self_info"] is not None else None
    return d


def genealogy(fid):
    """Árbol de linaje de una forma hasta PIE (loan-safe), con el ESQUELETO/CÓDIGO de cada estadio (si existe)."""
    base = one("""SELECT f.id, f.orthography word, f.lect_id lect, l.name lect_name, l.level, l.family, l.subgroup,
                         sk.code, sk.cons_skeleton cons
                  FROM form f LEFT JOIN lect l ON l.id=f.lect_id LEFT JOIN skeleton sk ON sk.form_id=f.id
                  WHERE f.id=%s""", (fid,))
    if not base:
        return {"error": "no encontrado"}
    nodes = rows("""WITH RECURSIVE up AS (
        SELECT fe.parent_lect, fe.parent_form, fe.parent_form_id, fe.kind, fe.source_id, 1 depth, ARRAY[fe.child_form_id] path
        FROM form_etymology fe WHERE fe.child_form_id=%s
        UNION ALL
        SELECT fe.parent_lect, fe.parent_form, fe.parent_form_id, fe.kind, fe.source_id, up.depth+1, up.path||fe.child_form_id
        FROM form_etymology fe JOIN up ON fe.child_form_id=up.parent_form_id
        WHERE up.depth<15 AND NOT fe.child_form_id = ANY(up.path) AND up.kind IN ('herencia','reconstruido'))
      SELECT DISTINCT ON (up.parent_lect, up.parent_form)
             up.parent_lect lect, up.parent_form form, up.kind, up.source_id src, up.depth,
             l.name lect_name, l.level, sk.code, sk.cons cons
      FROM up LEFT JOIN lect l ON l.id=up.parent_lect
      LEFT JOIN LATERAL (
          -- prefiere el esqueleto de la forma exacta; si no, cualquier variante
          -- skeletonizada de la misma lengua+ortografía (normalizada sin diacríticos ni '*')
          SELECT s.code, s.cons_skeleton cons FROM skeleton s WHERE s.form_id = up.parent_form_id
          UNION ALL
          SELECT s2.code, s2.cons_skeleton FROM form f2 JOIN skeleton s2 ON s2.form_id = f2.id
          WHERE f2.lect_id = up.parent_lect
            AND lower(unaccent(f2.orthography)) = lower(unaccent(regexp_replace(up.parent_form, '^[*]', '')))
          LIMIT 1
      ) sk ON TRUE
      ORDER BY up.parent_lect, up.parent_form, up.depth""", (fid,))
    for n in nodes:
        n["rank"] = _RANK.get(n["level"], 2)
    base["rank"] = _RANK.get(base["level"], 2)
    nodes.sort(key=lambda n: (n["rank"], n["depth"]))
    return {"root": base, "ancestors": nodes, "reaches_pie": any(n["lect"] == "ine-pro" for n in nodes)}


def sources():
    """Fuentes con cita/licencia/redistribuible — para la página Legal (atribución viva desde la BD)."""
    return rows("SELECT id, citation, url, kind, license, redistributable FROM source ORDER BY redistributable DESC, id")


def stats():
    return one("""SELECT (SELECT count(*) FROM form) forms, (SELECT count(DISTINCT lect_id) FROM form) langs,
                         (SELECT count(*) FROM lect WHERE family IS NOT NULL) lects,
                         (SELECT count(*) FROM concept) concepts""")
