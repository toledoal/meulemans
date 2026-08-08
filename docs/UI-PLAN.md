# Meulemans — Plan de UI (v2: plataforma analítica escalable)

**Dirección visual:** *Atlas de datos* — interfaz sans, **dato lingüístico en monoespaciado protagonista** (IPA,
código OAS, glottocode, forma proto), paleta fría, un solo acento + semánticos reservados. Ficha equilibrada.

**Cambio de alcance (v2):** Meulemans no es una sola pantalla de consulta, es una **plataforma de varias páginas**:
buscar/ficha, **comparativo**, **redes de coderivados** (con sus códigos y esqueletos), **rutas de genealogía**,
**rutas coderivado↔coderivado**, **mapeo a clases OAS y Dolgopolsky**, gráficos y (después) mapa. El plan prioriza
una **arquitectura que haga barato añadir páginas**.

---

## 1. Principios

1. **El dato manda** — mono para IPA/código/forma proto; cifras con `tabular-nums`.
2. **Cada vista es una página deep-linkable** — router propio; toda vista tiene URL, back/forward, compartible.
3. **Biblioteca de componentes reutilizable** — añadir una página = componer piezas existentes + 1 endpoint, no
   reinventar. Es la clave de la escalabilidad.
4. **Escala por diseño** — virtualización, paginación en API, agregación server-side para gráficos, grafos acotados.
5. **Estados explícitos + teclado + a11y + tema** claro/oscuro.

---

## 2. Arquitectura de la app (lo que habilita la escala)

**App shell + router + registro de páginas.** Un contenedor con navegación persistente; cada "página" es un módulo
ES que se registra en el router con su ruta, su título y su render. Añadir *Comparar* o *Red de coderivados* = crear
`ui/pages/compare.js`, registrarlo, y aparece en la nav. Sin bundler (ES modules nativos).

```
web/
  index.html            (shell: nav + <main id=view>)
  app.js                (arranque + router)
  core/
    router.js           (rutas → página; estado en URL/hash)
    api.js              (cliente API, cache, paginación)
    state.js            (filtros/selección compartidos)
    dom.js              (helpers de render: el(), tabla, chips…)
  ui/
    components/         (REUTILIZABLES entre páginas)
      searchbar.js  filterbar.js  resultlist.js
      codechip.js         (código OAS en símbolos Φ·Θ·Χ…)
      skeletonchip.js     (esqueleto consonántico)
      lineageladder.js    (escalera hijo→…→PIE, loan-safe)
      cognatetable.js     (tabla cross-lingüística agrupada)
      colexchips.js  sourcebadge.js  classmap.js  chart.js  graph.js
    pages/
      search.js  word.js  concept.js  compare.js
      coderivatives.js  genealogy.js  classes.js  (map.js, family.js…)
  vendor/               (libs vendorizadas como ES modules: d3-*, sin build)
  style.css             (tokens + componentes)
```

**Contrato API v1** (`/api/v1/...`), consistente y paginado: cada página nueva añade endpoints sin romper los
previos. Convenciones: `?limit&offset`, conteo separado, `ETag`/cache en respuestas estables.

## 3. Páginas (roadmap) — qué hace, qué visualiza, qué dato necesita

| # | Página | Qué es | Viz clave | Dato requerido |
|---|---|---|---|---|
| **P1** | **Buscar + Ficha** | búsqueda palabra/concepto, filtros, ficha equilibrada | escalera de linaje | ✅ ya en BD |
| **P2** | **Comparar** | 2–N palabras/coderivados lado a lado: forma, IPA, **código OAS**, esqueleto, linaje | tabla comparativa + alineación de esqueletos | ✅ (código/esqueleto en BD) |
| **P3** | **Red de coderivados** | grafo de un conjunto cognado: nodos=formas con su código/esqueleto, aristas=cognación | **grafo force-directed** | cognate_set/member ✅; layout cliente |
| **P4** | **Rutas de genealogía** | camino de una forma → PIE (y ramas), estadio a estadio, con operadores | árbol/DAG vertical | form_etymology ✅ (walk recursivo) |
| **P5** | **Rutas coderivado↔coderivado** | camino entre dos cognados por el grafo (MRCA, pasos) | grafo + camino resaltado | grafo cognación/etymon (CTE) |
| **P6** | **Clases: OAS y Dolgopolsky** | por forma/segmento, mapeo a **clase OAS** y **clase Dolgopolsky**; comparar sistemas de clases | tabla segmento→clase + matriz | OAS ✅; **Dolgopolsky pendiente** (ver §6) |
| **P7** | **Mapa** | distribución geográfica de un concepto/cognado | mapa de puntos | `lect.lat/lon` ✅; lib de mapa |
| **P8** | **Dashboards familia/rama** | perfil de una rama: nº formas, cobertura PIE, colexificaciones top | barras/heatmap | ✅ agregables |

## 4. Sistema de diseño (tokens)

- **Neutros fríos** (sesgo azul), panel/tinta/mutado/línea claro+oscuro. **Acento** azul-acero (uno).
- **Semánticos reservados** (no son el acento, siempre chip+etiqueta): PIE ámbar · préstamo violeta · iecor★ verde ·
  sustrato gris · fuente grises.
- **Paleta de datos (gráficos)**: categórica de orden fijo (validada para daltonismo — usar el validador del skill
  dataviz antes de fijarla), secuencial de 1 tono para magnitud, divergente 2 tonos+neutro para polaridad. Nunca
  arcoíris; color se decide AL FINAL.
- **Tipografía**: sans UI (`system-ui`, escala 12/13/15/19/26/34), **mono para dato** (`ui-monospace`), titular sans
  grande. `text-wrap:balance`.
- **Clases OAS con sus símbolos** (Φ Θ Χ Σ Λ Ϻ Ξ) como chips de color estable por clase — pieza reutilizada en P2/P3/P6.

## 5. Visualización sin build (estrategia)

- **Librerías vendorizadas** como ES modules en `web/vendor/` (p.ej. módulos d3: `d3-selection`, `d3-force`,
  `d3-scale`, `d3-shape`). Se importan nativamente; **sin bundler**. Self-contained (funciona offline/local y en
  despliegue público).
- **Grafos** (P3/P5): canvas/SVG con `d3-force`; nodos con código OAS de color; aristas con peso; camino resaltado.
- **Gráficos** (P8, colex, distribuciones): SVG a mano o `d3-shape/scale`. Aplicar reglas del skill **dataviz**:
  elegir la forma primero, un solo eje, leyenda presente, tabla-fallback, validar paleta, hover.
- **Mapa** (P7): evaluar `maplibre-gl` o puntos SVG sobre proyección simple; decisión de dependencia aparte.

## 6. Prerrequisitos de DATOS para las páginas futuras (honesto)

Estas páginas necesitan datos que **aún no están** o hay que derivar — son tareas del corpus, no de la UI:

- **Clases Dolgopolsky (P6):** Lexibank trae `Dolgo_Sound_Classes` y `SCA_Sound_Classes` en su `forms.csv`
  (¡no ingeridas aún!). Opción A: ingerir esas columnas. Opción B: computar Dolgopolsky desde IPA (mapa estándar de
  ~10 clases). Guardar a nivel segmento/esqueleto, junto al OAS, para comparar sistemas de clase.
- **Grafo de coderivados y rutas (P5):** cognate_member da conjuntos; las *rutas* coderivado↔coderivado y el MRCA
  requieren tratar cognación+etymon como grafo (recursive CTE o materializar `coderiv_edge`). Acotar profundidad.
- **Operadores Δ/T por arista (P4/P2):** el "paso de cifrado" esqueleto→esqueleto entre estadios/cognados
  (correspondence ya existe por familia; generalizar). Alimenta la alineación comparativa.
- Todo con procedencia/licencia (cuarentena respetada en cualquier export).

## 7. Layout, rutas, estados (como v1, extendido)

- **Shell**: nav de páginas + buscador global + tema. Breadcrumbs al profundizar.
- **P1 layout 3-col** (filtros | resultados | ficha), responsive a drawer y a 1-col en móvil.
- **URL**: `/`, `/form/<id>`, `/concept/<id>`, `/compare?ids=a,b,c`, `/coderiv/<set>`, `/genealogy/<id>`,
  `/paths?from=a&to=b`, `/classes/<id>`, `/map/concept/<id>`.
- **Estados**: cargando (skeletons), vacío, error, truncado. Teclado (`/`, ↑↓, Enter, Esc). Contraste AA.

## 8. Fases

- **F1 — Rediseño del núcleo + arquitectura escalable.** Shell + router + registro de páginas + biblioteca de
  componentes base (searchbar, filterbar, resultlist, lineageladder, cognatetable, colexchips, codechip,
  skeletonchip, sourcebadge) + **P1 (Buscar/Ficha)** rehecha + estado-en-URL + virtualización + estados + teclado +
  tokens. **Sin nuevas dependencias.** (Deja el terreno listo para las demás páginas.)
- **F2 — P2 Comparar** (reusa codechip/skeletonchip/lineageladder) + autocompletar + filtros en cascada + orden.
- **F3 — Visualización:** vendorizar d3; **P3 Red de coderivados** y **P4 Rutas de genealogía**.
- **F4 — P6 Clases OAS/Dolgopolsky** (previa ingesta/cómputo Dolgopolsky) + **P5 Rutas coderivado↔coderivado**
  (previa grafo de coderivados) + **P8 dashboards**.
- **F5 — P7 Mapa** (evaluar lib) + export/comparador avanzado.

## 9. Por qué esto escala

- **Añadir una página** = un módulo en `ui/pages/` + una ruta + endpoints v1; **reusa** la biblioteca de componentes
  y los tokens → costo marginal bajo, look consistente.
- **Sin build** pero **modular** (ES modules) → mantenible sin tooling, desplegable como estáticos.
- **API versionada y paginada** → el backend crece sin romper.
- **Datos derivados con procedencia** → cada capa nueva (Dolgopolsky, grafo coderivados, operadores) entra al corpus
  con su fuente, y la UI solo la consume.
