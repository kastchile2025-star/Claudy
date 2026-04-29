# typescript

Practicas de TypeScript moderno y estricto.

## Cuando aplicar
Tareas que mencionen: `typescript`, `ts`, `tipos`, `tsconfig`, `generics`, `inferencia`.

## tsconfig minimo recomendado
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "skipLibCheck": true
  }
}
```

## Reglas
- Cero `any`. Si lo necesitas temporalmente, usa `unknown` y haz narrowing.
- Prefiere `type` sobre `interface` salvo cuando necesitas merging declarativo.
- Tipa **inputs** (parametros, props publicas, retornos de API). Deja que TS **infiera** el resto.
- Discriminated unions para estados:
  ```ts
  type State =
    | { status: "loading" }
    | { status: "ok"; data: User }
    | { status: "error"; error: Error };
  ```
- `as const` para arrays/objetos literales que deben ser readonly.
- `satisfies` cuando quieres validar contra un tipo pero conservar la inferencia narrow.
- `Pick`, `Omit`, `Partial`, `Required`, `Record`, `Awaited` y `ReturnType` son tu pan diario.

## Anti-patterns
- Type assertions `as X` para silenciar errores reales.
- `!` (non-null assertion) sin haber comprobado.
- Tipos enormes en `.d.ts` para datos que ya vienen de un schema (usa `zod`/`valibot` y deriva).
