# Skills de Claudy

Claudy usa skills como instrucciones Markdown guardadas en archivos `SKILL.md`.

## Ubicaciones

| Tipo | Ruta | Uso |
| --- | --- | --- |
| Proyecto | `skills/<nombre>/SKILL.md` | Skills versionados con el repo. |
| Usuario | `~/.claudy/skills/<nombre>/SKILL.md` | Skills instalados desde internet o desde una URL. |
| Indice local | `~/.claudy/skills/README.md` | README generado automaticamente con los skills instalados por el usuario. |

## Instalacion desde el chat web

Puedes pedirlo en lenguaje natural:

```text
instala una skill para leer pdf
```

O usar comandos slash:

```text
/skill_find pdf
/skill_install_best pdf
/skill_install https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md
```

## Instalacion desde el CLI

```text
/find-skill pdf
/install-skill pdf
```

## Como decide Claudy

1. Detecta frases que mencionan `skill`, `skills`, `habilidad` o `habilidades`.
2. Limpia la consulta para dejar el tema principal. Por ejemplo, `instala una skill para leer pdf` se transforma en `pdf`.
3. Busca candidatos en `skills.sh`.
4. Intenta descargar el `SKILL.md` desde el repositorio GitHub del candidato.
5. Si la fuente es GitHub, copia tambien archivos auxiliares del mismo directorio del skill.
6. Guarda el skill en `~/.claudy/skills/<nombre>/SKILL.md`.
7. Actualiza `~/.claudy/skills/README.md`.

## Skills incluidos en este repo

### Web Development
- [`react`](react/SKILL.md) - Componentes funcionales, hooks, anti-patterns.
- [`nextjs`](nextjs/SKILL.md) - App Router, Server Components, Server Actions.
- [`typescript`](typescript/SKILL.md) - Configuracion estricta, tipos utiles, generics.
- [`tailwind`](tailwind/SKILL.md) - Utility-first, cva, dark mode.
- [`frontend-design`](frontend-design/SKILL.md) - Generar UI de calidad sin caer en "AI slop".

### Testing
- [`webapp-testing`](webapp-testing/SKILL.md) - Estrategia integral (unit + integration + E2E).
- [`playwright`](playwright/SKILL.md) - E2E con auto-waiting y locators semanticos.
- [`jest`](jest/SKILL.md) - Tests unitarios, mocking, AAA.

### DevOps
- [`docker`](docker/SKILL.md) - Multi-stage builds, no-root, healthchecks.
- [`ci-cd`](ci-cd/SKILL.md) - GitHub Actions, environments, secrets.

### Documentation
- [`readme`](readme/SKILL.md) - Plantilla para README utiles.
- [`changelog`](changelog/SKILL.md) - Keep a Changelog + SemVer.

### Code Quality
- [`code-review`](code-review/SKILL.md) - Checklist priorizado de review.
- [`refactor`](refactor/SKILL.md) - Tecnicas seguras y heuristicas de smells.

### Design
- [`accessibility`](accessibility/SKILL.md) - WCAG AA, ARIA, teclado, contraste.

### Productivity
- [`git-workflow`](git-workflow/SKILL.md) - Trunk-based, conventional commits, recovery.
- [`file-search`](file-search/SKILL.md) - Buscar archivos por nombre, extension o contenido con find/grep/rg.

### Agentic Workflows
- [`superpowers`](superpowers/SKILL.md) - Workflow para proyectos chicos / MVP.
- [`gsd`](gsd/SKILL.md) - Workflow para codebases grandes e iterativos.
- [`prd-to-issues`](prd-to-issues/SKILL.md) - Convertir un PRD en issues INVEST.

### Specialized Domain Research
- [`valyu`](valyu/SKILL.md) - SEC filings, papers academicos, fuentes primarias.

### Tools
- [`qwen-asr`](qwen-asr/SKILL.md) - Transcripcion de audio via demo de ModelScope.
- [`find-skills`](find-skills/SKILL.md) - Descubrir e instalar otros skills.

## Seguridad

Los skills son texto de instrucciones que Claudy puede usar como contexto. Instala solo fuentes confiables y revisa el contenido si el skill pide secretos, credenciales o acciones riesgosas.
