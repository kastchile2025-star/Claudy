# file-search

Buscar archivos por nombre, extension o contenido dentro del directorio permitido de Claudy (`CLAUDY_TOOLS_ROOT`).

## Cuando aplicar
Tareas que mencionen: `buscar archivo`, `donde esta`, `encontrar`, `find`, `grep`, `search`, `localizar`, `por nombre`, `por contenido`, `por extension`.

## Tools de Claudy que se usan
- **`/read <path>`** - lee un archivo (rapido, no busca).
- **`/exec <cmd>`** - ejecuta un comando shell. Necesita `tools.allowExec = true` en config.
- **`/browse <url>`** - solo para web, no aplica aqui.

> Toda busqueda esta limitada al directorio `tools.allowedRoot` (por defecto `..` desde el backend). Las tools rechazan rutas que escapen ese root.

## Patron 1: buscar por nombre / extension

### Linux / macOS / Codespaces (bash)
```bash
/exec find . -type f -name "*.ts"
/exec find . -type f -iname "*config*"
/exec find . -type f -name "*.md" -not -path "*/node_modules/*"
```

### Windows (PowerShell con `pwsh -c`)
```bash
/exec pwsh -c "Get-ChildItem -Recurse -Filter *.ts | Select-Object FullName"
```

### Mas rapido si tienes `fd` instalado
```bash
/exec fd --type f --extension ts
/exec fd config
```

## Patron 2: buscar por contenido

### Con `grep` / `ripgrep`
```bash
/exec grep -rn "TODO" --include="*.ts" .
/exec grep -rni "telegram" backend/src
/exec rg "ASR_TIMEOUT" -t ts
/exec rg -i "secret|token|api_?key" --type ts
```

`ripgrep` (`rg`) es mas rapido y respeta `.gitignore`. Si esta disponible, prefierelo.

### Mostrar contexto alrededor del match
```bash
/exec rg "function transcribe" -A 5 -B 2
```

## Patron 3: combinar nombre + contenido
```bash
/exec find . -name "*.ts" -exec grep -l "qwen-asr" {} \;
/exec rg --files-with-matches "qwen-asr" -t ts
```

## Patron 4: navegar la estructura antes de buscar
```bash
/exec ls -la
/exec tree -L 2 -I 'node_modules|.git'
/exec find . -maxdepth 2 -type d
```

## Reglas
- **Empieza estrecho**: `find backend/src -name "*.ts"` antes de `find .`. Evita escanear `node_modules`.
- **Excluye ruido siempre**: `-not -path "*/node_modules/*"`, `--ignore-vcs` (rg lo hace solo).
- **Combina herramientas**: `find` para localizar archivos, `grep`/`rg` para mirar dentro, `head`/`sed` para ver pedazos.
- **Limita output**: agrega `| head -50` o `--max-count=20` para no saturar la respuesta del agente.
- **Cita rutas relativas** al `allowedRoot`, no absolutas (mas portable).

## Errores comunes y como leerlos
- `Permission denied` -> el archivo esta fuera del `allowedRoot` o sin permisos OS.
- `command not found: rg` -> usa `grep -r` o instala `ripgrep`.
- Output vacio -> revisa el patron (mayusculas, expresion regular vs literal con `-F`).

## Atajos utiles
| Tarea | Comando |
|---|---|
| Listar archivos modificados ultima semana | `find . -type f -mtime -7` |
| Archivos mas grandes | `find . -type f -exec ls -lS {} + \| head` |
| Contar lineas en archivos `.ts` | `find . -name "*.ts" \| xargs wc -l \| tail -5` |
| Ver primer match en cada archivo | `rg -m1 "patron"` |
| Solo nombres de archivo con match | `rg -l "patron"` |
| Buscar excluyendo binarios | `grep -rI "patron" .` |

## Si `/exec` esta apagado
Por seguridad Claudy viene con `allowExec=false` por defecto. Para activarlo:
1. UI -> Configuracion -> Tools -> activar **Exec**.
2. O en `.env` del backend: `CLAUDY_TOOL_EXEC=true`.
3. Reinicia el backend.

Sin `/exec` puedes usar `/read` para leer archivos cuya ruta ya conoces, pero no buscar.

## Anti-patterns
- `find /` o `grep -r .` desde la raiz del filesystem (escanea de mas, lento).
- Buscar dentro de `node_modules`/`.git`/`dist` sin razon.
- Pipes encadenados sin `head` que devuelven 50k lineas.
- Ejecutar comandos destructivos (`rm`, `mv`) por accidente al copiar de Stack Overflow.
