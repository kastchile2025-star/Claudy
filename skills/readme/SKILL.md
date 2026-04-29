# readme

Como escribir un README util.

## Cuando aplicar
Tareas que mencionen: `readme`, `documentar proyecto`, `README.md`, `descripcion del repo`.

## Plantilla minima
```markdown
# Nombre del proyecto

Una linea: que es y para quien.

## Quick start
\`\`\`bash
git clone ...
cd ...
<install>
<run>
\`\`\`
Abre http://localhost:PORT.

## Caracteristicas
- bullet
- bullet

## Requisitos
- Node 20+ / Python 3.12 / etc.

## Configuracion
| Variable | Default | Descripcion |
|---|---|---|

## Estructura
\`\`\`
src/
  ...
\`\`\`

## Comandos comunes
- `npm run dev` - levanta dev server
- `npm test` - corre tests

## Contribuir
Link al CONTRIBUTING.md o 2 lineas de como abrir PR.

## Licencia
MIT (o lo que sea).
```

## Reglas
- **Quick start funcional en menos de 1 minuto** desde clone hasta "esta corriendo".
- Captura/GIF si la app tiene UI (ayuda mas que mil palabras).
- Sin marketing fluff: nada de "revolutionary", "blazing fast" sin numero, "AI-powered" como adjetivo solo.
- Badges utiles (build status, version, license). No 12 badges decorativos.
- Mantenlo corto. Detalles a `docs/`, `CONTRIBUTING.md`, `ARCHITECTURE.md`.
- Asume que el lector NO conoce el proyecto. Define acronimos.

## Anti-patterns
- README de 2000 lineas con todo el manual.
- "Coming soon" en features que llevan 6 meses asi.
- Pasos que solo funcionan en la maquina del autor (`/Users/jose/...`).
