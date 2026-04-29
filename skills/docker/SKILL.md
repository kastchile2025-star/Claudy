# docker

Dockerfiles y docker-compose para apps modernas.

## Cuando aplicar
Tareas que mencionen: `docker`, `dockerfile`, `compose`, `container`, `image`.

## Reglas Dockerfile
- **Multi-stage build** siempre que el lenguaje compile o tenga dev deps:
  ```dockerfile
  FROM node:20-alpine AS deps
  WORKDIR /app
  COPY package.json bun.lock ./
  RUN npm ci

  FROM node:20-alpine AS build
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN npm run build

  FROM node:20-alpine AS runtime
  WORKDIR /app
  ENV NODE_ENV=production
  COPY --from=build /app/dist ./dist
  COPY --from=deps /app/node_modules ./node_modules
  USER node
  CMD ["node", "dist/server.js"]
  ```
- Imagen base **slim** o **alpine**, nunca `:latest`. Pin a un tag explicito.
- Orden de capas: lo que cambia poco arriba (deps), codigo abajo. Aprovecha cache.
- `.dockerignore` con `node_modules`, `.git`, `.env`, `dist/`, logs.
- **Usuario no-root** (`USER node` o crea uno) en runtime.
- `HEALTHCHECK` para servicios long-running.
- Una responsabilidad por contenedor. Nada de supervisord para 3 procesos.

## docker-compose
- Networks explicitas si tienes mas de un servicio.
- Volumes con nombre para datos persistentes (db).
- `depends_on` con `condition: service_healthy` cuando hay healthchecks.
- Variables sensibles via `env_file`, nunca hardcoded.

## Anti-patterns
- `COPY . .` antes de instalar deps (rompe cache).
- `apt-get install` sin `--no-install-recommends` y sin `rm -rf /var/lib/apt/lists/*`.
- Correr como root en produccion.
- `latest` en cualquier lado.
