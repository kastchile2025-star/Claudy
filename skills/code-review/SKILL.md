# code-review

Checklist y enfoque para revisar pull requests.

## Cuando aplicar
Tareas que mencionen: `code review`, `revisar PR`, `pull request`, `review`, `revisar codigo`.

## Orden de prioridad (top = mas importante)
1. **Correctitud** - hace lo que dice la descripcion del PR.
2. **Seguridad** - inputs, auth, secretos, SQL injection, XSS.
3. **Tests** - cubren el comportamiento nuevo y los edge cases.
4. **Diseno** - encaja con la arquitectura existente o explica por que no.
5. **Legibilidad** - lo entiende quien revise en 6 meses.
6. **Performance** - solo si hay un costo medible o un loop hot.
7. **Estilo** - lo que el linter no atrapa.

## Checklist por PR
- [ ] La descripcion explica el **por que**, no solo el **que**.
- [ ] El alcance del PR es coherente. Si toca 12 cosas no relacionadas, pedir split.
- [ ] Tests nuevos cubren el cambio (golden path + 1-2 edge cases).
- [ ] No hay dead code, console.logs, TODOs sin issue.
- [ ] Manejo de errores explicito en boundaries (HTTP, DB, fs, parsing).
- [ ] Sin secretos, keys, tokens en el diff.
- [ ] Migrations reversibles si aplica.
- [ ] CHANGELOG actualizado si el repo lo usa.
- [ ] Naming claro. `data`, `info`, `obj` solo si el contexto lo justifica.
- [ ] Comentarios explican el **por que**, el codigo ya dice el **que**.

## Como dar feedback
- **Pregunta en lugar de afirmar** cuando no estas 100% seguro: "Por que aqui hace X y no Y?".
- Marca **bloqueantes** vs **nice-to-have** explicitamente.
- Felicita cosas bien hechas, no solo critiques.
- Sugiere codigo concreto cuando puedas: "Que tal `arr.find(...)` aqui?" + ejemplo.
- Si vas a pedir un cambio grande, ofrece pair o discusion en vez de hilo de 30 comentarios.

## Anti-patterns
- Bikeshedding sobre estilo cuando hay un linter que decide.
- "LGTM" sin haber leido.
- Pedir refactor masivo en un PR de bug fix.
