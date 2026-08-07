# Meulemans

**Meulemans** es la capa de consulta pública —API + interfaz web— sobre el **Corpus Integrativo**, una base de datos
léxica multi-capa/multi-fuente que reúne ~3,8M formas de ~3.400 lenguas y permite ver **toda la historia de una
palabra**: forma, sonido, sentido, cognados, colexificación y **linaje hasta el proto-indoeuropeo**, con sus fuentes.

El nombre honra a **Meulemans**, fundador de la endolingüística. Meulemans NO genera datos primarios: **integra**
fuentes existentes (cada una citada y con su licencia; ver el corpus) para consultarlas y correr experimentos.

## Arquitectura

```
navegador  ──HTTP──►  FastAPI (API solo-lectura + estáticos)  ──SQL──►  Postgres (corpus_integrativo)
   SPA vanilla                api/                                        capa de datos (proyecto aparte)
```

- **Backend** (`api/`): FastAPI + psycopg con pool de conexiones, solo-lectura. Endpoints de búsqueda (palabra y
  concepto), filtros por familia/rama/lengua, y ficha completa (linaje, cognados, colexificación).
- **Frontend** (`web/`): SPA en HTML/JS sin build; la sirve FastAPI.
- **Datos**: lee la BD `corpus_integrativo` (proyecto `corpus_integrativo/`, no incluido aquí). Meulemans es
  **solo lectura**: no escribe ni modifica el corpus.

## Correr en local

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
# La BD del corpus debe estar arriba (socket /tmp/ci_pg, db corpus_integrativo).
MEULEMANS_DSN='postgresql://postgres@/corpus_integrativo?host=/tmp/ci_pg&port=5433' \
  .venv/bin/uvicorn api.main:app --port 8900
# → http://localhost:8900
```

## Licencia y fuentes

Meulemans consulta datos integrados de múltiples fuentes con licencias propias (CC-BY, CC-BY-SA y algunas en
cuarentena por copyright/NC-ND). Cualquier export público **debe** filtrar `redistributable=true`. Ver
`corpus_integrativo/docs/FUENTES.md`.
