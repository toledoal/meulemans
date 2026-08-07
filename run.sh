#!/usr/bin/env bash
# Meulemans — API + UI en local (la BD del corpus debe estar arriba)
cd "$(dirname "$0")"
export MEULEMANS_DSN="${MEULEMANS_DSN:-postgresql://postgres@/corpus_integrativo?host=/tmp/ci_pg&port=5433}"
exec .venv/bin/uvicorn api.main:app --port "${PORT:-8900}" "$@"
