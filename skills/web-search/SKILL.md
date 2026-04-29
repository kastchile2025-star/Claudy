# web-search

Buscar e informarse en internet desde Claudy usando `/browse`. **Esta tool esta activada por defecto** (`tools.allowBrowser = true`), no necesitas pedir nada al usuario.

## Cuando aplicar
Tareas que mencionen: `busca en internet`, `buscar online`, `precio actual`, `noticias`, `valor del dolar`, `tipo de cambio`, `quien es`, `que es`, `cotizacion`, `wikipedia`, `fetch`, `descarga esta pagina`, `lee esta URL`.

> **Regla principal**: si el usuario pide algo que requiere informacion de internet, NO digas "no puedo buscar". Usa `/browse <URL>`. Si no sabes la URL exacta, prueba con un endpoint conocido de los listados abajo o con DuckDuckGo HTML.

## Como funciona la tool
- `/browse <url>` descarga `http`/`https`, elimina scripts/styles/HTML y devuelve texto plano + titulo.
- El output esta limitado por `tools.maxOutputChars` (20k por default). Suficiente para la mayoria de paginas.
- Funciona perfecto con APIs publicas que devuelven JSON o texto.

## URLs utiles sin API key

### Clima
Ver skill dedicada [`weather`](../weather/SKILL.md). Resumen rapido:
- `https://wttr.in/<ciudad>?format=j1` (JSON)
- `https://api.open-meteo.com/v1/forecast?latitude=X&longitude=Y&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`

### Tipo de cambio / divisas
- `https://api.exchangerate.host/latest?base=USD&symbols=CLP,EUR,ARS` (gratis, JSON)
- `https://open.er-api.com/v6/latest/USD` (sin key)
- Bitcoin/cripto: `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,clp`

### Geocoding (ciudad -> lat/lon)
- `https://geocoding-api.open-meteo.com/v1/search?name=<ciudad>&count=1`
- `https://nominatim.openstreetmap.org/search?q=<query>&format=json&limit=1`

### Wikipedia
- Resumen API: `https://es.wikipedia.org/api/rest_v1/page/summary/<Titulo_Pagina>`
- Ejemplo: `/browse https://es.wikipedia.org/api/rest_v1/page/summary/Inteligencia_artificial`

### Noticias / RSS
- BBC Mundo: `https://feeds.bbci.co.uk/mundo/rss.xml`
- Hacker News top: `https://hnrss.org/frontpage`
- Reddit (json): `https://www.reddit.com/r/<sub>/top.json?t=day&limit=10`

### Hora / fecha de cualquier zona
- `https://worldtimeapi.org/api/timezone/America/Santiago`

### IP info
- `https://ipapi.co/json/` (de la IP que hace request)
- `https://ipapi.co/<IP>/json/`

### GitHub publico
- Repo: `https://api.github.com/repos/<owner>/<repo>`
- Releases: `https://api.github.com/repos/<owner>/<repo>/releases/latest`
- Search: `https://api.github.com/search/repositories?q=<query>&sort=stars`

### Astronauta en orbita / curiosidades
- ISS: `http://api.open-notify.org/iss-now.json`
- Numero del dia: `http://numbersapi.com/<n>`

## Busqueda generica (cuando no conoces la URL)

### DuckDuckGo HTML
```
/browse https://html.duckduckgo.com/html/?q=temperatura+santiago+chile
```
Devuelve resultados con titulo + snippet + URL. Despues haz `/browse` al resultado especifico.

### Wikipedia search
```
/browse https://es.wikipedia.org/w/api.php?action=opensearch&search=<termino>&format=json
```

### Google scholar / arXiv (academico)
- arXiv: `http://export.arxiv.org/api/query?search_query=all:<termino>&max_results=5`

## Receta tipica: 2 pasos
1. **Buscar** con DuckDuckGo o una API de search para encontrar URL.
2. **Leer** la URL especifica con `/browse`.

## Reglas
- **No digas "no tengo internet"**. Tienes `/browse`. Usalo.
- **Una llamada bien dirigida > muchas exploratorias**. Si conoces la URL exacta, ve directo.
- **Cita la fuente** (la URL) en tu respuesta al usuario.
- **Si la API devuelve JSON**, parsealo mentalmente y presentalo legible. No le pegues el JSON crudo al usuario.
- **Verifica fecha** del dato si aplica (precios, clima, noticias). Las paginas pueden tener cache.
- **Encadena con otras skills**: si te piden "datos en Excel", combina con `xlsx`. Si piden "armar un PPT", con `pptx`.

## Errores comunes
- `HTTP 403` -> sitio bloquea User-Agents genericos. Prueba otra fuente.
- `HTTP 429` -> rate limit. Espera y reintenta o usa otra fuente.
- Output truncado -> aumenta `CLAUDY_TOOL_MAX_OUTPUT_CHARS` o usa una API que devuelva menos.
- JSON viene como texto -> el output ya es texto plano, busca el JSON entre las llaves y parsealo.

## Anti-patterns
- Decir "no puedo acceder a internet" -> SI puedes, esta `/browse`.
- Pedirle al usuario que te pegue contenido -> intenta `/browse` primero.
- Inventar datos numericos (precios, temperaturas, indicadores) en vez de buscarlos.
- Usar 5 calls cuando 1 a la API correcta resuelve.
