# webapp-testing

Estrategia de testing para webapps (E2E con Playwright + integration + unit).

## Cuando aplicar
Tareas que mencionen: `webapp testing`, `test de integracion`, `test e2e completo`, `test stack`, `pyramid`, `coverage`.

## Piramide pragmatica (no la clasica de 70/20/10)
- **70% integration** (componente + dependencias reales o fake convincente)
- **20% E2E** (golden paths criticos del usuario)
- **10% unit** (logica pura, edge cases dificiles)

La piramide vieja (mucho unit, poco E2E) sale del mundo Java legacy. Webapps modernas se benefician mas de tests de integracion que ejercitan render + interaccion.

## Stack recomendado
- **Vitest** o Jest para unit + integration de componentes
- **React Testing Library** para componentes (consultas semanticas, no implementacion)
- **MSW** (Mock Service Worker) para mockear HTTP en tests
- **Playwright** para E2E (ver skill `playwright`)
- **Storybook** + interaction tests para components aislados

## Que testear (priorizado)
1. **Flujos criticos**: login, checkout, crear/editar el recurso principal.
2. **Logica de negocio**: calculos, validaciones, estado complejo.
3. **Edge cases observables**: estado vacio, error de red, sin permisos, loading largo.
4. **Bugs reproducidos**: cada bug fix incluye un test que falla sin el fix.

## Que NO testear (o poco)
- Implementacion interna de componentes que cambia seguido.
- Librerias de terceros (asume que TanStack Query funciona).
- Estilos CSS (visual regression con Chromatic/Percy si importa, no asserts en tests).
- Coverage por coverage (100% no es objetivo).

## Reglas
- **Selectors semanticos**: `getByRole`, `getByLabel`. Nunca clases CSS o IDs internos.
- **Tests independientes**: cada uno setea su estado, no depende del orden.
- **Datos de prueba minimos** pero realistas. No `name: "test"`, mejor `name: "Ada Lovelace"`.
- **Evita mocks profundos**. Si tienes que mockear 5 modulos para un test, hay un olor a diseno.
- **AAA**: Arrange / Act / Assert separados.
- **Async correcto**: `await findByRole(...)` para esperas, no `setTimeout`.

## CI
- Tests rapidos (unit + integration) en cada PR.
- E2E criticos en cada PR (golden paths).
- E2E completo en `main` y antes de release.
- Paralelizacion (`--shard`, `--workers`) para mantener PR < 5 min.

## Anti-patterns
- Tests que prueban props internas o llamadas a hooks (rompen al refactorizar).
- Snapshots gigantes de UI que nadie revisa.
- E2E que valida cada checkbox de cada formulario (use integration para eso).
- Mockear lo que estas probando ("test passes!" pero no prueba nada real).
