# nextjs

Guia para apps Next.js (App Router, 13+).

## Cuando aplicar
Tareas que mencionen: `nextjs`, `next`, `app router`, `server component`, `route handler`, `middleware`, `vercel`.

## Reglas
- **Server Components por defecto**. Marca `"use client"` solo si necesitas estado, efectos, eventos o APIs del browser.
- Data fetching en server components con `async/await` + `fetch`. No uses `useEffect` para fetch inicial.
- Mutaciones via **Server Actions** (`"use server"`) o Route Handlers en `app/api/.../route.ts`.
- Caching: `fetch` cachea por defecto. Para datos dinamicos: `{ cache: 'no-store' }` o `revalidate: N`.
- `loading.tsx` y `error.tsx` por ruta. Usa Suspense para streaming.
- `Image` de `next/image` siempre con `width`/`height` o `fill` + `sizes`.
- Variables de entorno: `NEXT_PUBLIC_*` solo si DEBE estar en el bundle del cliente.
- `metadata` exportada por pagina para SEO. No `<Head>` manual en App Router.

## Estructura tipica
```
app/
  layout.tsx
  page.tsx
  (marketing)/
    page.tsx
  dashboard/
    layout.tsx
    page.tsx
    loading.tsx
    error.tsx
  api/
    users/route.ts
```

## Anti-patterns
- Usar `'use client'` en el root de la app.
- Fetch del lado cliente para datos publicos cacheable.
- Mezclar `getServerSideProps` (Pages Router) con App Router.
