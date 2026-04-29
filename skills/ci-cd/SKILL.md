# ci-cd

Pipelines CI/CD con GitHub Actions (aplicable a GitLab CI / CircleCI con cambios menores).

## Cuando aplicar
Tareas que mencionen: `ci`, `cd`, `pipeline`, `github actions`, `deploy`, `workflow`, `release`.

## Estructura GitHub Actions tipica
```
.github/
  workflows/
    ci.yml        # tests + lint + typecheck en cada PR
    release.yml   # build y publish al hacer tag
    deploy.yml    # deploy a staging/prod en push a main
```

## Reglas
- **Cache de deps** (`actions/setup-node` con `cache: 'npm'`, o `actions/cache` para `~/.bun/install/cache`).
- Matrix builds para multiples versiones/OS solo si el proyecto las soporta.
- **Concurrencia**: cancela runs viejos del mismo PR:
  ```yaml
  concurrency:
    group: ${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true
  ```
- Permisos minimos: `permissions: contents: read` por default, sube solo lo que necesites.
- Secrets via `secrets.NAME`. Nunca en logs (usa `::add-mask::` si es dinamico).
- Pin actions a SHA o tag fijo (`actions/checkout@v4`, no `@main`).
- Steps idempotentes: re-run no debe romper estado.

## Deploy
- **Environments** (`environment: production`) para gates y secretos por entorno.
- Approvals manuales para prod.
- Rollback claro: tag previo + `gh deploy create` o redeploy del artefacto previo.
- Smoke test post-deploy antes de marcar success.

## Anti-patterns
- Workflow gigante que hace todo. Separa en jobs/workflows con disparadores claros.
- `if: always()` ocultando fallos.
- Deploy sin tests verdes obligatorios.
- Secrets en `env:` global del workflow (los hereda todo step).
