# Resumen del progreso de Claudy

> Sesión del 2026-04-28
> Repo: https://github.com/kastchile2025-star/Claudy

---

## 1. Punto de partida

El proyecto Claudy ya existía como **fork simplificado de OpenClaw**: un asistente de IA personal con backend (Node + WebSocket), frontend (React + Vite), integración con OpenCode y skills en Markdown.

Faltaba una **interfaz CLI** para usar Claudy directo desde la terminal, sin abrir el navegador.

---

## 2. Lo que construimos

### 🧩 Una CLI completa en TypeScript

Estructura nueva en `claudy/src/`:

```
src/
├── cli.ts                  # Punto de entrada (commander)
├── config.ts               # Gestión de ~/.claudy/config.json
├── opencode.ts             # Cliente HTTP del servidor OpenCode
├── tools.ts                # /read, /write, /exec con sandbox
├── types.ts                # Tipos TypeScript
├── utils.ts                # CRUD de sesiones
└── commands/
    ├── setup.ts            # Wizard interactivo
    ├── chat.ts             # Chat REPL
    ├── config.ts           # get/set/edit/path
    ├── sessions.ts         # list/show/delete/export
    └── models.ts           # list/current/set
```

Stack: Node 20+, ESM, TypeScript, `commander`, `chalk`, `inquirer`, `tsx`.

---

### 🔧 Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `claudy setup` | Wizard interactivo de configuración |
| `claudy chat` | Chat REPL con OpenCode |
| `claudy chat --new` | Forzar sesión nueva |
| `claudy chat -s <id>` | Continuar sesión específica |
| `claudy chat -m <model>` | Cambiar modelo en arranque |
| `claudy sessions list` | Listar sesiones |
| `claudy sessions show <id>` | Ver contenido de una sesión |
| `claudy sessions delete <id>` | Eliminar sesión |
| `claudy sessions export <id> -o file.md` | Exportar a Markdown |
| `claudy models list` | Listar modelos del server OpenCode |
| `claudy models current` | Ver modelo actual |
| `claudy models set <provider/model>` | Cambiar default |
| `claudy config get` | Ver toda la config |
| `claudy config set <key> <value>` | Editar valor |
| `claudy config edit` | Editor interactivo |
| `claudy config path` | Ruta del archivo |

---

### 💬 Comandos dentro del chat

| Comando | Acción |
|---------|--------|
| `/exit`, `/quit` | Salir |
| `/clear` | Limpiar pantalla |
| `/save` | Forzar guardar |
| `/model <m>` | Cambiar modelo en caliente |
| `/read <ruta>` | Leer archivo → inyecta al contexto |
| `/write <ruta>\n<contenido>` | Escribir archivo |
| `/exec <comando>` | Ejecutar comando bash |
| `/tools` | Ver permisos actuales |
| `/history` | Info de sesión |
| `/help` | Mostrar ayuda |

---

### 🛠️ Tools con sandbox

`src/tools.ts` añade `/read`, `/write`, `/exec` con seguridad:

- **`allowedRoot`** configurable: las tools no pueden salir de ese directorio (path traversal bloqueado).
- **`/write` y `/exec` desactivadas por defecto**: hay que activarlas explícitamente.
- **Timeout** configurable en `/exec` (default 10s).
- **Output truncado** a `maxOutputChars` (default 20k chars).
- El resultado de la tool se **inyecta como mensaje en la sesión** para que el modelo lo vea en el siguiente turno.

Activación:

```bash
claudy config set tools.allowWrite true
claudy config set tools.allowExec true
claudy config set tools.allowedRoot /workspaces/Claudy
```

---

### 🔐 Auth flexible

El cliente OpenCode soporta tres modos de autenticación:

1. **API Key (Bearer)** — `Authorization: Bearer <key>`
2. **Basic auth** — usuario + password
3. **Sin auth** — para servidor local sin protección

El wizard de `setup` pregunta cuál usar.

---

### 🤖 Catálogo de modelos OpenCode Go

El wizard ya tiene precargada la lista oficial:

```
GLM-5, GLM-5.1
Kimi K2.5, Kimi K2.6
MiMo-V2-Pro, MiMo-V2-Omni, MiMo-V2.5-Pro, MiMo-V2.5
MiniMax M2.5, MiniMax M2.7
Qwen3.5 Plus, Qwen3.6 Plus (recomendado)
DeepSeek V4 Pro, DeepSeek V4 Flash
```

Todos en formato `opencode-go/<modelo>`.

---

## 3. Arquitectura final

```
┌──────────┐  HTTP   ┌──────────────────┐  API key  ┌──────────────┐
│  Claudy  │────────▶│  opencode serve  │──────────▶│ OpenCode Go  │
│   CLI    │         │  (localhost:4096)│           │   (cloud)    │
└──────────┘         └──────────────────┘           └──────────────┘
     │
     ▼
┌──────────────────┐
│ ~/.claudy/       │
│  ├ config.json   │  Auth, modelo, tools
│  └ sessions/     │  Historial de chats
└──────────────────┘
```

**Flujo clave**: Claudy NO habla directo con OpenCode Go. Habla con `opencode serve` local, que tiene la API key y enruta al cloud.

---

## 4. Bugs encontrados y resueltos

| # | Problema | Solución |
|---|----------|----------|
| 1 | `tsup@^10.0.1` no existe en npm | Pin a `^8.0.0` |
| 2 | Config legacy del backend rompía `loadConfig` | Deep merge con defaults |
| 3 | URL `https://api.opencode.ai` daba 404 | OpenCode Go no expone HTTP directo — usar `opencode serve` local |
| 4 | Validación estricta de `provider/model` rechazaba modelos sin slash | Hacer parse flexible |
| 5 | Chat se cerraba tras primera respuesta | El spinner `ora` emitía `close` en readline → reescribir loop con `readline/promises` y `while(true)` |

---

## 5. Pasos de instalación (resumen para Codespace)

```bash
# 1. Instalar OpenCode CLI
curl -fsSL https://opencode.ai/install | bash
npm install -g opencode-ai

# 2. Login con tu API key OpenCode Go
opencode auth login
# elegir "OpenCode Go" → pegar API key

# 3. Levantar servidor (en una terminal aparte)
opencode serve --port 4096 --hostname 127.0.0.1

# 4. Instalar dependencias de Claudy CLI
cd /workspaces/Claudy
npm install

# 5. Setup
npm run dev -- setup
# baseUrl: http://127.0.0.1:4096
# auth: Sin autenticación (o API Key vacía)
# modelo: opencode-go/qwen3.6-plus

# 6. Chat
npm run dev -- chat
```

---

## 6. Historial de commits

```
4dcde82 fix: chat loop closing after first reply
444f6ff feat: add /read /write /exec tools with sandboxed root
bca6d85 feat: add OpenCode Go model catalog to setup wizard
f956853 feat: support API key (Bearer auth) and flexible model format
df1d3ff refactor: switch CLI from OpenRouter to OpenCode
98fceba fix: deep-merge loaded config with defaults
6b68108 fix: pin tsup to ^8.0.0
6ed7815 feat: add CLI interface for Claudy
```

---

## 7. Pendientes / próximos pasos

Cosas que NO hicimos pero quedaron sobre la mesa:

- [ ] **Streaming** de respuestas (caracter a carácter, tipo ChatGPT)
- [ ] **Markdown rendering** en terminal (formatear código y listas)
- [ ] **Comando `claudy` global** (sin `npm run dev --`)
- [ ] **Auto-start** del `opencode serve` si no está corriendo
- [ ] **Soporte multi-skill** integrando los `SKILL.md` del backend
- [ ] **Memoria vectorial** (el backend ya la tiene, falta exponerla en CLI)

---

## 8. Recordatorios de seguridad

Durante la sesión expusiste dos secretos en el chat. Si no los has rotado todavía, **hazlo ahora**:

- Token de GitHub clásico (`ghp_...`) → https://github.com/settings/tokens
- API key de OpenCode Go (`sk-...`) → panel de opencode.ai

Para futuras sesiones: usa `gh auth login` o variables de entorno (`.env` ignorado por git) en vez de pegar secretos en chat.

---

**Estado actual**: Claudy CLI funcionando en Codespaces con OpenCode Go (Qwen3.6 Plus) ✅
