# git-workflow

Workflow de git para equipos pequenos y solo devs.

## Cuando aplicar
Tareas que mencionen: `git`, `commit`, `branch`, `merge`, `rebase`, `pull request`, `workflow`.

## Branching simple (Trunk-Based / GitHub Flow)
- `main` siempre deployable.
- Feature branches cortas (`feat/auth-login`, `fix/null-pointer`).
- PR a `main` con review + CI verde -> squash & merge.
- Tags `vX.Y.Z` para releases.

## Conventional Commits
```
<tipo>(<scope opcional>): <descripcion corta>

[cuerpo opcional explicando por que]

[footer opcional con BREAKING CHANGE: ... o refs]
```

Tipos comunes:
- `feat`: nueva feature
- `fix`: bug fix
- `refactor`: sin cambio funcional
- `perf`: mejora de performance
- `docs`: solo documentacion
- `test`: agregar/corregir tests
- `chore`: build, deps, config
- `ci`: cambios en CI

Ejemplo:
```
feat(auth): add password reset via email

Resolves #142
```

## Reglas
- **Commits chicos y atomicos**. Cada uno debe compilar y pasar tests.
- **Mensajes en imperativo**: "add X", no "added X".
- **Por que**, no solo **que** (el diff ya muestra el que).
- **Rebase** tu branch sobre `main` antes de mergear, no `merge main into branch` (a menos que el equipo lo prefiera).
- **No reescribas historia ya pusheada** a branches compartidos. En tu branch personal, ok.
- **No commit secretos**. Si pasa, rota el secreto YA y reescribe historia (`git filter-repo`).
- `.gitignore` actualizado antes del primer push.

## Comandos utiles
```bash
git log --oneline --graph --all          # ver historia
git diff main...HEAD                     # cambios de mi branch vs main
git rebase -i HEAD~5                     # limpiar ultimos 5 commits
git commit --fixup=<sha> && git rebase -i --autosquash <base>  # arreglar commit anterior
git stash push -u -m "wip auth"          # guardar trabajo a medias
git restore --staged <file>              # unstage
git switch -c feat/x                     # crear y cambiar a branch
```

## Recovery
- `git reflog` recupera commits "perdidos" tras reset.
- `git revert <sha>` deshace un commit publicado sin reescribir historia.
- `git cherry-pick <sha>` trae un commit de otra branch.

## Anti-patterns
- Commits gigantes "WIP" que mezclan 8 cambios.
- `git push --force` a `main` o branches compartidos.
- Mensajes "fix", "update", ".", "asdf".
- Mergear sin haber corrido tests localmente.
