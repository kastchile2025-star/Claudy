# tailwind

Buenas practicas para Tailwind CSS.

## Cuando aplicar
Tareas que mencionen: `tailwind`, `tw`, `clsx`, `cva`, `utility classes`, `css framework`.

## Reglas
- Mobile-first: empieza con clases sin prefijo, agrega `sm:`, `md:`, `lg:` para subir.
- Usa la **escala del theme** (`p-4`, `text-lg`, `gap-2`). Evita valores arbitrarios `[13px]` salvo casos justificados.
- Composicion condicional con `clsx` o `cn`:
  ```tsx
  <div className={cn("rounded p-2", isActive && "bg-blue-500 text-white")} />
  ```
- Para variantes complejas: `class-variance-authority` (cva).
- Personaliza el theme en `tailwind.config.ts` antes de inventar utilidades.
- `@apply` solo dentro de `@layer components` para primitives reusables, no para componentes completos.
- Dark mode: estrategia `class` (recomendado) y prefijo `dark:`.

## Estructura recomendada
```
src/
  components/
    ui/        # primitives (Button, Input, Card)
    features/  # composiciones de negocio
```

## Anti-patterns
- Strings de className gigantes sin agrupar (rompe legibilidad).
- Repetir las mismas 12 clases en 5 sitios -> extrae a un componente o `cva`.
- Mezclar CSS Modules + Tailwind sin razon.
