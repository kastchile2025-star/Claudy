# refactor

Como refactorizar de forma segura y util.

## Cuando aplicar
Tareas que mencionen: `refactor`, `refactorizar`, `limpiar codigo`, `simplificar`, `dry`, `extract function`.

## Reglas de oro
- **Tests verdes antes y despues.** Si no hay tests para la zona, escribelos primero (caracterizacion).
- **No mezcles** refactor con cambios de comportamiento. Un commit refactor = ningun cambio funcional.
- **Pasos pequenos**, no rewrite total. Cada paso compilable y deployable.
- **Regla de 3**: extrae cuando tienes 3 ocurrencias parecidas, no la primera.

## Refactors mas utiles
1. **Extract Function** - bloque con un nombre claro -> funcion con ese nombre.
2. **Rename** - si el lector necesita comentario para entender el nombre, renombra.
3. **Replace Conditional with Polymorphism** - cuando el switch crece y se repite.
4. **Introduce Parameter Object** - 4+ params correlacionados -> un objeto.
5. **Inline** - si la funcion es mas confusa que su contenido, ponla inline.
6. **Move** - codigo que opera mas con otro modulo se va con el.
7. **Replace Magic Number** - `if (status === 3)` -> `STATUS_PUBLISHED`.

## Cuando NO refactorizar
- Mientras debuggeas un bug -> primero arregla, despues limpia.
- En codigo que vas a borrar pronto.
- Por gusto estetico cuando no agrega valor (estilo personal).
- Sin tiempo para verificar que nada se rompio.

## Heuristicas para detectar code smells
- Funcion mas larga que la pantalla.
- Mas de 3-4 niveles de indentacion.
- Comentario `// TODO why does this work?`.
- Mismo bloque de 5+ lineas en 3 sitios.
- Clase con dos responsabilidades obvias en su nombre (`UserAndOrderManager`).
- Parametros booleanos que cambian comportamiento (split en 2 funciones).

## Anti-patterns
- "Refactor mientras agrego feature" -> diff ilegible, review imposible.
- Abstraer por adelantado para "futuro" que no llega.
- DRY agresivo que junta cosas que solo se parecen accidentalmente.
