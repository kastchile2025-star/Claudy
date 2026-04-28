# Claudy - Asistente de IA Personal

**Claudy** es un fork simplificado de [OpenClaw](https://github.com/openclaw/openclaw), un asistente de IA personal que corre localmente en tu maquina.

## Caracteristicas (MVP)

- Chat web en tiempo real
- Integracion con **OpenCode** via servidor local
- Historial de conversaciones persistente
- Selector de modelos desde la UI
- Tool basica de busqueda web
- Configuracion editable
- Interfaz moderna y responsive

## Stack Tecnologico

- **Backend**: Node.js + Express + WebSocket
- **Frontend**: React + Tailwind CSS (standalone HTML tambien disponible)
- **LLM**: OpenCode server (`opencode serve`)
- **Storage**: JSON files en ~/.claudy/

## Opcion 1: GitHub Codespaces (Recomendado - Sin instalar nada)

La forma mas facil de probar Claudy es en un **GitHub Codespace**. No necesitas instalar nada en tu computadora.

### Pasos:

1. Ve al repo: https://github.com/kastchile2025-star/Claudy
2. Haz clic en el boton verde **<> Code** → **Codespaces** → **Create codespace on main**
3. Espera 1-2 minutos a que se configure (instala dependencias automaticamente)
4. Cuando termine, aparecera una notificacion: **"Your application running on port 3000 is available"**
5. Haz clic en **Open in Browser** 🎉
6. Listo! Ya puedes chatear con Claudy

> **Nota**: El backend (puerto 3001) y frontend (puerto 3000) se inician automaticamente. Tambien puedes hacer clic en los puertos en la pestaña "Ports" (abajo) y seleccionar "Open in Browser".

---

## Opcion 2: Instalacion Local

### Requisitos
- Node.js 20+ o Bun

### Pasos

```bash
# 1. Clonar el repo
git clone https://github.com/kastchile2025-star/Claudy.git
cd Claudy

# 2. Entrar al backend e instalar
cd backend
bun install

# 3. Iniciar OpenCode en otra terminal
opencode serve --port 4096 --hostname 127.0.0.1

# 4. Iniciar backend
bun run src/server.ts

# 5. En otra terminal, entrar al frontend
cd ../frontend
bun install

# 6. Iniciar frontend
bun run dev

# 7. Abrir http://localhost:3000
```

### Opcion rapida (HTML standalone)

Si no quieres compilar el frontend, simplemente abre:

```
claudy/frontend/public/index.html
```

en tu navegador (despues de iniciar el backend).

## Uso

1. Abre http://localhost:3000 en tu navegador
2. Escribe un mensaje para comenzar
3. Selecciona diferentes modelos desde el menu superior
4. Ve a Configuracion (icono de engranaje) para cambiar la URL de OpenCode, modelo o system prompt

## Estructura del Proyecto

```
claudy/
|-- backend/
|   |-- src/
|   |   |-- server.ts        # Servidor Express + WebSocket
|   |   |-- opencode.ts      # Cliente OpenCode server
|   |   |-- agent.ts         # Loop del agente
|   |   |-- config.ts        # Gestion de configuracion
|   |   |-- sessions/        # Almacenamiento de sesiones
|   |   |-- tools/           # Herramientas (web_search)
|-- frontend/
|   |-- src/                 # React app (Vite)
|   |-- public/index.html    # Version standalone HTML
```

## Configuracion

Archivo: `~/.claudy/config.json`

```json
{
  "opencode": {
    "baseUrl": "http://127.0.0.1:4096",
    "defaultModel": "anthropic/claude-sonnet-4"
  },
  "agent": {
    "systemPrompt": "Eres Claudy, un asistente de IA personal...",
    "maxTokens": 4096,
    "temperature": 0.7
  },
  "server": {
    "port": 3001,
    "host": "127.0.0.1"
  }
}
```

## Proximos Pasos

- [ ] Multi-canal (Telegram, Discord)
- [ ] Mas tools (exec, read, write, browser)
- [ ] Sistema de skills basado en markdown
- [ ] Memoria vectorial
- [ ] Voice (STT + TTS)

## Creditos

- Fork inspirado en [OpenClaw](https://github.com/openclaw/openclaw) por Peter Steinberger y comunidad
- Powered by [OpenCode](https://opencode.ai/)

## Licencia

MIT
