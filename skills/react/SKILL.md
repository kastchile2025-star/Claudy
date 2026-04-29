# react

Guia rapida para escribir y revisar componentes React modernos.

## Cuando aplicar
Tareas que mencionen: `react`, `jsx`, `tsx`, `componente`, `hook`, `useState`, `useEffect`, `props`, `frontend react`.

## Reglas
- Usa **componentes funcionales** + hooks. Nada de class components nuevos.
- **Hooks solo en el top level**, nunca dentro de loops, condiciones o funciones anidadas.
- Lista de dependencias de `useEffect`/`useMemo`/`useCallback` siempre completa. Si quieres ignorar una, justifica con un comentario corto.
- Cada componente en su propio archivo `PascalCase.tsx`. Un componente por archivo.
- Props tipadas con `interface ComponentNameProps` o `type`. Nunca `any`.
- Estado derivado: calcular en render, no duplicar con `useState`.
- Listas: siempre `key` estable (id), nunca `index` salvo que la lista sea estatica.
- `useMemo`/`useCallback` solo cuando hay un costo medible o evitan re-renders en hijos memoizados.

## Anti-patterns
- Mutar estado: `state.push(x)` -> `setState([...state, x])`.
- `useEffect` para sincronizar estado derivable.
- Setear estado en render sin condicion de salida (loop infinito).
- Pasar funciones inline en componentes muy listados sin `useCallback` cuando importa.

## Stack tipico
- Vite o Next.js
- TypeScript estricto (`"strict": true`)
- TanStack Query para server state, no Redux para fetch.
- Zustand o Context para client state simple.
