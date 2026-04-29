# gsd

Get-Shit-Done. Workflow agentico para codebases grandes e iterativos donde explorar, planear y verificar importan tanto como escribir.

## Cuando aplicar
Tareas que mencionen: `codebase grande`, `legacy`, `refactor amplio`, `feature en repo grande`, `migracion`, `gsd`, `cambio en monorepo`.

## Filosofia
- **Entender > escribir**. En codebases grandes, leer codigo es 60-70% del trabajo.
- **Cambios pequenos y verificables.** Commits que tu yo del futuro pueda revertir sin miedo.
- **Tests antes que cambios** cuando tocas zonas sin cobertura.
- **Bias hacia minimo cambio.** "Tres lineas similares" es preferible a una abstraccion prematura.

## Loop GSD
1. **Explorar** la zona afectada antes de tocar nada.
   - `grep` por simbolos relevantes, lee 2-3 callers.
   - Identifica el modulo "duenno" del concepto.
   - Mira git blame de las ultimas 5 modificaciones para entender intencion historica.
2. **Plan escrito** (en tu cabeza o un md temporal):
   - Objetivo en 1 linea.
   - Pasos en 3-7 bullets.
   - Verificacion concreta de cada paso (test que corre, comando que pasa).
3. **Tests de caracterizacion** si la zona no los tiene. Documentan el comportamiento actual.
4. **Cambios pequenos en orden**. Cada paso compila y deployea. Commit por paso.
5. **Verificacion incremental**: tests + ejecutar la feature manualmente + revisar logs.
6. **Cleanup final**: dead code, imports, comentarios obsoletos en lo que tocaste.

## Reglas
- **Cambios quirurgicos.** Toca solo lo que tu task requiere. Si encuentras otro bug, anotalo, no lo arregles en este PR.
- **Mantener convenciones existentes** aunque las haria distinto. Coherencia > perfeccion.
- **No introducir nueva libreria** sin justificarlo (peso, mantenimiento, alternativas).
- **Migrations reversibles**. Cada paso tiene rollback claro.
- **Feature flags** para cambios riesgosos. Activacion gradual.
- **Backwards compat** cuando hay consumidores externos (APIs publicas, bibliotecas).

## Cuando hay duda: 4 preguntas
1. Que pasa si esto se rompe en produccion ahora mismo?
2. Como se reverte? (1 comando ojala)
3. Quien mas ha tocado este codigo en los ultimos 6 meses? (talk to them)
4. Hay un ADR / doc que explique el por que del estado actual?

## Lo que NO se hace
- Refactor masivo "de paso". Va en su propio PR.
- Renombrar archivos/simbolos publicos sin alias o periodo de deprecacion.
- Cambios de formato (Prettier, Black) mezclados con logica.
- "Mejoras" no pedidas que rompen comportamiento sutil.
- Eliminar codigo dead-looking sin git log + grep cross-repo.

## Smell de problema mas grande
- Para implementar X tienes que tocar 17 archivos -> diseño tiene un acoplamiento. Discute antes de seguir.
- Tests existentes te impiden cambiar -> revisa si son tests de implementacion mal escritos.
- Build sumamente lento te hace evitar correrlo -> primero invierte en eso o el resto se erosiona.

## Anti-patterns
- "Mientras estoy aqui" mejorando codigo no relacionado.
- PRs gigantes que mezclan refactor + feature + bug fix.
- Suprimir warnings/errors en vez de entenderlos.
- Comentarios `// TODO: refactor this someday` (nunca llega).
