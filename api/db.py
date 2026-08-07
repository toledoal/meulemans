"""Conexión a la BD del corpus — pool, SOLO LECTURA. Meulemans nunca escribe en el corpus."""
import os
from psycopg_pool import ConnectionPool

# DSN por defecto: la misma BD del corpus (socket local). Override con MEULEMANS_DSN.
DSN = os.environ.get(
    "MEULEMANS_DSN",
    os.environ.get("CI_DSN", "postgresql://postgres@/corpus_integrativo?host=/tmp/ci_pg&port=5433"),
)

# read-only a nivel de sesión: cualquier intento de escritura falla → Meulemans es consulta pura.
pool = ConnectionPool(
    DSN, min_size=1, max_size=8, open=False,
    kwargs={"options": "-c default_transaction_read_only=on"},
)


def rows(sql, params=()):
    with pool.connection() as c, c.cursor() as cur:
        cur.execute(sql, params)
        cols = [d.name for d in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]


def one(sql, params=()):
    r = rows(sql, params)
    return r[0] if r else None
