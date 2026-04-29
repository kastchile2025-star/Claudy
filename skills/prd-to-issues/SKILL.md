# prd-to-issues

Convertir un PRD (Product Requirements Document) en issues de GitHub/Linear ejecutables, con dependencias claras.

## Cuando aplicar
Tareas que mencionen: `prd`, `requirements`, `breakdown`, `descomponer feature`, `issues de un PRD`, `epic`, `roadmap to issues`.

## Proceso

### 1. Leer el PRD entero antes de escribir nada
Identifica:
- **Objetivo de negocio** (1 frase): que metrica/comportamiento mueve esto.
- **Alcance** (que SI / que NO).
- **Dependencias externas** (otros equipos, servicios, vendors).
- **Constraints** (deadline, presupuesto, compliance, performance).
- **Open questions** que necesitan respuesta del PM antes de empezar.

Si el PRD no tiene esto, **devuelve preguntas antes de hacer issues.**

### 2. Identificar componentes
Lista de areas tecnicas afectadas:
- Frontend (paginas, componentes, estados)
- Backend (endpoints, jobs, eventos)
- Datos (schema, migraciones, ETL)
- Infra (servicios nuevos, secrets, scaling)
- Producto (copy, analytics, instrumentacion)

### 3. Descomponer en issues
Cada issue cumple **INVEST**:
- **I**ndependent (mergeable solo)
- **N**egotiable (alcance discutible)
- **V**aluable (entrega algo observable o desbloquea otro issue)
- **E**stimable (alguien con contexto puede estimarlo)
- **S**mall (1-3 dias idealmente)
- **T**estable (criterio de aceptacion verificable)

### 4. Marcar dependencias y bloqueos
- `Blocked by #123`: no se puede empezar hasta que termine #123.
- `Related to #456`: contexto compartido pero sin bloqueo.
- Issue de **infra/schema** suele bloquear varios. Hazlo primero.

## Plantilla de issue

```markdown
**Resumen**
Una frase de que se hace y por que.

**Contexto**
- Link al PRD: ...
- Estado actual: ...
- Por que ahora: ...

**Alcance**
- [ ] Cosa concreta 1
- [ ] Cosa concreta 2

**Fuera de alcance**
- Cosa relacionada pero que no entra aqui (link a otro issue si existe)

**Criterio de aceptacion**
- Dado X, cuando Y, entonces Z.
- Test E2E que cubre el flujo.

**Notas tecnicas**
- Archivos probablemente afectados: ...
- Decision tomada: ... (link a discusion)

**Dependencias**
- Blocked by: #
- Blocks: #
```

## Buen breakdown vs malo

### Malo
- "Implementar feature X" (1 issue gigante)
- "Hacer el frontend" / "Hacer el backend" (capas, no entregables)
- "Setup", "Cleanup" (vagos, sin criterio)

### Bueno
- "Schema: agregar tabla `subscriptions` con campos X,Y,Z + migracion reversible"
- "API: POST /subscriptions devuelve 201 con id, valida plan_id contra catalog"
- "UI: pagina /billing muestra plan actual y boton 'Cambiar plan' (mock data ok)"
- "UI: integrar /billing con API real, manejar loading/error"
- "Analytics: emit `subscription_created` con plan_id, source en evento"

Cada uno es testeable y mergeable solo.

## Estimacion
- T-shirt sizes (S/M/L/XL) > horas exactas.
- Si algo es XL, descomponelo mas. Probablemente lo estas subestimando.
- Reserva buffer para desconocidos: si nunca tocaste esa zona, x1.5.

## Anti-patterns
- 1 issue = 1 PR de 2000 lineas.
- Issues sin criterio de aceptacion ("se vera bien").
- Listas de subtasks sin formato consistente que nadie marca.
- Crear todos los issues al inicio y no revisitarlos cuando aprendes mas.
