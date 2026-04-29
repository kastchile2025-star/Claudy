# valyu

Investigacion en datos especializados (filings SEC, papers academicos, fuentes cientificas) via Valyu.

## Cuando aplicar
Tareas que mencionen: `valyu`, `sec filings`, `10-k`, `10-q`, `papers`, `arxiv`, `pubmed`, `academic search`, `research paper`, `investigacion cientifica`, `due diligence financiera`.

## Que es Valyu
Indice de fuentes especializadas pensado para que un agente cite con precision:
- SEC EDGAR (10-K, 10-Q, 8-K, S-1, proxy statements)
- Papers academicos (arXiv, PubMed, publishers cientificos)
- Bases de datos legales y regulatorias
- Datos financieros estructurados

A diferencia de busqueda web general, Valyu prioriza **fuentes primarias verificables** sobre blogs/resumenes.

## Setup tipico
1. API key de Valyu (env: `VALYU_API_KEY`).
2. SDK: `pip install valyu` o uso por HTTP.
3. Definicion del scope: que dominios queremos consultar.

## Cuando usar Valyu vs busqueda generica
- **Valyu**: necesitas una **cita exacta**, una cifra de un filing, una metodologia de un paper.
- **Web search**: necesitas opiniones, tutoriales, codigo, contexto general.

Mezclar ambos es comun: Valyu para los hechos, web para el contexto.

## Patron de uso
```python
from valyu import Valyu

client = Valyu(api_key=os.environ["VALYU_API_KEY"])

result = client.search(
    query="Apple revenue Q1 2026 segment breakdown",
    sources=["sec"],            # restringe a SEC EDGAR
    max_results=5,
)

for hit in result.results:
    print(hit.title, hit.url, hit.snippet)
    # hit.content es el texto completo o relevante
```

## Reglas
- **Cita la fuente original** siempre. URL + numero de documento + fecha.
- **No confies en snippets**. Lee el contexto completo antes de afirmar algo numerico.
- **Compara con datos estructurados** (10-K vs 10-Q vs press release) para detectar inconsistencias.
- **Marca la fecha del documento**: una afirmacion de un 10-K de 2023 no es valida para "hoy".
- Si necesitas una metrica exacta (revenue, EPS), tambien revisa el **XBRL** del filing, no solo el PDF.

## Casos de uso comunes
- **Due diligence**: "Riesgos identificados en el ultimo 10-K de NVDA"
- **Investigacion academica**: "Papers sobre RAG con retrieval >5 fuentes en arXiv 2024-2026"
- **Comparacion de policies**: "Como las top 5 farmas tratan ESG en sus proxy statements"
- **Trazabilidad**: validar una cifra que aparece en un articulo contra el filing primario

## Anti-patterns
- Usar Valyu para cosas que un Wikipedia o web search resuelven mejor.
- Citar "segun Valyu" en vez de citar la fuente primaria que Valyu indexa.
- Aceptar el snippet sin leer el contexto cuando la afirmacion es financiera/medica.
- No registrar la version del documento (los filings se enmiendan).

## Si Valyu no esta disponible
Fallback razonable:
- SEC: directo en https://www.sec.gov/edgar/searchedgar/companysearch
- arXiv: https://arxiv.org/search/
- PubMed: https://pubmed.ncbi.nlm.nih.gov/
- Papers with Code para ML
