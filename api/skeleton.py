"""Esqueleto consonántico (SOLO LETRAS, sin símbolo de clase) desde una grafía.

Se usa para los estadios RECONSTRUIDOS (proto/PIE) de la genealogía, que no existen como
formas con IPA en el corpus: se derivan de la ortografía reconstruida (p.ej. «*méh₂tēr»).
Decisión (por el autor): mostrarlas como código-esqueleto endolingüístico en letras, SIN
asignarles el símbolo de clase OAS (Ϻ/Θ/Λ…), porque eso implicaría una afirmación de clase
sobre una reconstrucción — se aplaza. El mapeo canónico es idéntico a
corpus_integrativo/ingest/recompute_skeleton.py (misma normalización de consonantes).
"""
import unicodedata

# clases de consonante (solo para saber QUÉ es consonante; no emitimos el símbolo)
_IPA = {}
for _chars in ["pbɓʙɸβfvʋwⱱʍ", "tdʈɖθðɗþ", "szʃʒʂʐɕʑʦʣʧʤʨʥſß",
               "lɫɭʎʟrɾɹɻʀʁłɽɬɮǁɺȴ", "kgɡcɟxɣχqɢʔhɦħʕçʝɠʄɧʜʡʢȷ", "mɱ", "nɳɲŋɴȵ", "ȶȡ"]:
    for _ch in _chars:
        _IPA[_ch] = True
_VOW = set("aeiouyæœøɑɒɐɘɵɛɔəɜɤʌɨʉʊɪɚɝʏɶɞᵻᵿъьǫęěąųẽɯɿʅʮʯ")
_GLI = set("jɥɰ")
# normalización a consonante canónica (róticas→r, dorsales→x/h, nasales→n/m, etc.)
_NORM = {}
for _chars, _canon in [("lɫɭʟłɬɮǁ", "l"), ("ʎ", "ʎ"), ("rɾɹɻʀʁɺ", "r"),
                       ("k", "k"), ("gɡ", "g"), ("cɟ", "c"), ("q", "q"),
                       ("xɣχçʝɧ", "x"), ("hɦʔħʕʜʡʢ", "h"), ("ȷ", "g"),
                       ("nɳ", "n"), ("ŋɲɴ", "n"), ("mɱ", "m"),
                       ("rɾɹɻʀʁɽ", "r"), ("dɗ", "d")]:
    for _ch in _chars:
        _NORM[_ch] = _canon
_IGNORE = set("¹²³⁴⁵⁶⁷⁸⁹⁰⁻⁺⁽⁾()↗↘↑↓⫽ǀǃǂʘ∼~ⁿ:◌0123456789*ꝛ⁊&")
_BOUNDARY = set("+-_~,;#. ")


def cons_from_ortho(text):
    """Grafía reconstruida → esqueleto consonántico en letras canónicas ('m·h·t·r'), o None."""
    if not text:
        return None
    # quitar diacríticos combinantes (macrones, acentos), modificadores, marcas de formato
    s = "".join(c for c in unicodedata.normalize("NFD", text)
                if unicodedata.category(c) not in ("Mn", "Lm", "Sk", "Cf")).lower()
    out = []
    for ch in s:
        if ch in _VOW or ch in _GLI or ch in _IGNORE or ch in _BOUNDARY:
            continue
        if ch in _IPA:
            out.append(_NORM.get(ch, ch))
        # cualquier otro carácter (subíndices ₂, signos raros) se ignora
    return "·".join(out) or None
