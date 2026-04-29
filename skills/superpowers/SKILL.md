# superpowers

Workflow agentico para proyectos chicos a medianos. Optimiza velocidad sin perder calidad.

## Cuando aplicar
Tareas que mencionen: `proyecto chico`, `prototipo`, `MVP`, `script rapido`, `proof of concept`, `superpowers`, `single feature`.

## Filosofia
- **Velocidad > arquitectura perfecta** cuando el proyecto cabe en la cabeza de una persona.
- **Codigo legible > codigo "elegante"**.
- **Borrar es mejor que abstraer prematuramente.**
- **El primer cut no debe ser el final**, pero debe correr.

## Loop tipico
1. **Spec en 5 lineas** (que entrada -> que salida -> que constraints).
2. **Esqueleto que corre** con datos hardcoded. End-to-end vacio antes de profundizar.
3. **Llena cada paso** uno a uno, verificando que sigue corriendo.
4. **Tests del happy path** + 2-3 edge cases obvios.
5. **Lee tu propio diff** antes de cerrar. Borra lo que sobra.

## Reglas
- **Un archivo hasta que duela.** No 12 modulos para 200 lineas de logica.
- **Hardcoded antes que configurable.** Mueve a config cuando hay 2do uso real.
- **Print/log es debuger valido.** No sobre-instrumentes con logger frameworks en scripts chicos.
- **Dependencias minimas**: stdlib + 1-2 libs grandes (requests/httpx, pandas, click). No microframeworks para todo.
- **Funciones puras** donde puedas. Side-effects empujados a los bordes (main / handlers).
- **Errores explicitos** en boundaries (input del usuario, HTTP, fs). Adentro confia.

## Estructura de un proyecto chico
```
proyecto/
  README.md         # quick start de 10 lineas
  pyproject.toml    # o package.json
  src/
    main.py         # entry point
    core.py         # logica del dominio
    io.py           # IO (HTTP, fs, db)
  tests/
    test_core.py
```

## Cuando NO usar este workflow
- Mas de 1-2 personas tocando el codigo.
- Proyecto que va a vivir > 1 ano.
- Codigo financiero, medico, de seguridad. Ahi rigor > velocidad.
- Bibliotecas publicas con muchos consumidores.

Para esos casos, ver skill `gsd` (proyectos grandes iterativos).

## Anti-patterns en proyectos chicos
- Crear 5 capas (domain/application/infra/presentation/...) para un script CLI.
- Inyeccion de dependencias compleja para algo single-process single-user.
- Tests de coverage al 100% en un PoC que se va a tirar.
- Documentacion ADR para decisiones que se pueden cambiar en 5 min.
