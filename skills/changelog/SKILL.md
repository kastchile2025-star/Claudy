# changelog

Como mantener un CHANGELOG.md util.

## Cuando aplicar
Tareas que mencionen: `changelog`, `CHANGELOG.md`, `release notes`, `historial de cambios`.

## Formato Keep a Changelog + SemVer
```markdown
# Changelog

Todos los cambios notables se documentan aqui.
Sigue [Keep a Changelog](https://keepachangelog.com/) y [SemVer](https://semver.org/).

## [Unreleased]
### Added
- Nueva feature pendiente de release

## [1.2.0] - 2026-04-29
### Added
- Soporte para X
### Changed
- Y ahora devuelve Z
### Deprecated
- W sera removido en 2.0
### Removed
- Endpoint /old
### Fixed
- Crash al hacer A
### Security
- Patcheada CVE-XXXX

## [1.1.0] - 2026-03-15
...
```

## Reglas
- Escrito **para humanos**, no para maquinas. Nada de "Merge pull request #123 from feature-branch".
- Una entrada = un cambio observable por el usuario. Refactors internos no van (a menos que cambien performance/comportamiento).
- Categorias: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- Versiones en orden cronologico inverso (lo nuevo arriba).
- Fechas en `YYYY-MM-DD`.
- `[Unreleased]` siempre arriba. Al hacer release, se renombra a la version y se crea uno nuevo.
- Links al final del archivo o inline a tags/PRs cuando aporta.

## Anti-patterns
- Auto-generar desde `git log` sin curarlo (sale ruido).
- Mezclar SemVer mal: bump mayor por bug fix, o nada por breaking change.
- "Various improvements and bug fixes" como unica entrada.
