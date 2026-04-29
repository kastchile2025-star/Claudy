# weather

Obtener clima actual y pronostico de cualquier ciudad usando la tool `/browse` de Claudy. **No requiere API key.**

## Cuando aplicar
Tareas que mencionen: `clima`, `temperatura`, `pronostico`, `tiempo`, `weather`, `forecast`, `temperatura maxima`, `temperatura minima`, `lluvia`, `humedad`.

## Como funciona
Claudy tiene la tool `/browse <URL>` activada por defecto (`allowBrowser: true`). Esta skill te dice **a que URLs ir** para obtener clima sin API key.

## Fuente principal: wttr.in (texto y JSON, sin auth)

### Clima actual de una ciudad (formato compacto JSON)
```
/browse https://wttr.in/Santiago?format=j1
```
Devuelve JSON con `current_condition`, `weather` (3 dias) y `nearest_area`. Cada entrada en `weather` tiene `maxtempC`, `mintempC`, fecha y horarios.

### Texto plano (1 linea)
```
/browse https://wttr.in/Santiago?format=%l:+%c+%t+(min+%t-min,+max+%t-max)+%h+%w
```
Codigos comunes:
- `%l` ubicacion
- `%c` condicion (icono / descripcion)
- `%t` temperatura actual
- `%h` humedad
- `%w` viento
- `%P` presion

### Pronostico 3 dias formato narrativo
```
/browse https://wttr.in/Santiago?2&T&n
```
- `2` = 3 dias (incluye hoy + 2)
- `T` = sin colores ANSI
- `n` = formato corto (narrow)

## Fuente alternativa: Open-Meteo (JSON puro)

URL base: `https://api.open-meteo.com/v1/forecast`

### Pasos para clima de una semana
1. **Geocodifica la ciudad** (lat/lon):
   ```
   /browse https://geocoding-api.open-meteo.com/v1/search?name=Santiago&count=1&language=es
   ```
   Saca `latitude` y `longitude` del primer resultado.

2. **Pide pronostico diario 7 dias**:
   ```
   /browse https://api.open-meteo.com/v1/forecast?latitude=-33.45&longitude=-70.66&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=America/Santiago&forecast_days=7
   ```
   Devuelve arrays paralelos en `daily`:
   ```json
   {
     "daily": {
       "time": ["2026-04-29", "2026-04-30", ...],
       "temperature_2m_max": [22.1, 21.5, ...],
       "temperature_2m_min": [9.8, 10.2, ...],
       "precipitation_sum": [0.0, 1.2, ...]
     }
   }
   ```

## Receta tipica: "temperaturas de la semana en Santiago"

1. `/browse https://api.open-meteo.com/v1/forecast?latitude=-33.45&longitude=-70.66&daily=temperature_2m_max,temperature_2m_min&timezone=America/Santiago&forecast_days=7`
2. Parsear el JSON: `daily.time[i]` + `daily.temperature_2m_max[i]` + `daily.temperature_2m_min[i]`.
3. Presentar en tabla, o si el usuario lo pidio, generar un Excel (ver skill `xlsx`).

## Coordenadas de ciudades comunes (LATAM)
| Ciudad | Lat | Lon | TZ |
|---|---|---|---|
| Santiago | -33.45 | -70.66 | America/Santiago |
| Buenos Aires | -34.61 | -58.38 | America/Argentina/Buenos_Aires |
| Lima | -12.05 | -77.04 | America/Lima |
| Bogota | 4.71 | -74.07 | America/Bogota |
| Mexico City | 19.43 | -99.13 | America/Mexico_City |
| Madrid | 40.42 | -3.70 | Europe/Madrid |

## Reglas
- **Siempre intenta `/browse` primero**. La tool esta activada por defecto. Solo di "no puedo buscar" si la respuesta HTTP falla.
- Para queries cortas usa `wttr.in?format=...`. Para datos estructurados, Open-Meteo + JSON.
- **Cita la fuente** en la respuesta (`fuente: wttr.in` u `open-meteo.com`).
- Si el usuario pide "temperaturas de la semana", genera 7 dias (hoy + 6).
- Si vas a meter los datos en un Excel, ver skill [`xlsx`](../xlsx/SKILL.md) y entrega columnas: Fecha, Min (C), Max (C), Precipitacion (mm).

## Anti-patterns
- Inventar temperaturas porque "no tengo conexion". `/browse` esta activado, usalo.
- Pedir API key cuando wttr.in y Open-Meteo son gratis y sin auth.
- Devolver JSON crudo al usuario. Parsealo y presentalo legible (tabla o resumen).
- Olvidar la zona horaria -> el dia "hoy" puede salir corrido.
