# Claudy - Asistente de IA Personal

**Claudy** es un fork simplificado de [OpenClaw](https://github.com/openclaw/openclaw), un asistente de IA personal que corre localmente en tu maquina.

## Caracteristicas (MVP)

- Chat web en tiempo real con streaming
- Integracion con **OpenRouter** (acceso a 100+ modelos)
- Historial de conversaciones persistente
- Selector de modelos desde la UI
- Tool basica de busqueda web
- Configuracion editable
- Interfaz moderna y responsive

## Stack Tecnologico

- **Backend**: Node.js + Express + WebSocket
- **Frontend**: React + Tailwind CSS (standalone HTML tambien disponible)
- **LLM**: OpenRouter API
- **Storage**: JSON files en ~/.claudy/

## Instalacion Rapida

### Requisitos
- Node.js 20+ o Bun

### Pasos

```bash
# 1. Entrar al backend
cd claudy/backend

# 2. Instalar dependencias (con bun)
bun install

# 3. Configurar API Key de OpenRouter
# La config se crea automaticamente en ~/.claudy/config.json
# O editala manualmente:
echo '{"openrouter":{"apiKey":"TU_API_KEY","defaultModel":"openai/gpt-4o-mini"}}' > ~/.claudy/config.json

# 4. Iniciar backend
bun run src/server.ts

# 5. En otra terminal, entrar al frontend
cd claudy/frontend

# 6. Instalar dependencias
bun install

# 7. Iniciar frontend
bun run dev
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
4. Ve a Configuracion (icono de engranaje) para cambiar tu API key o system prompt

## Estructura del Proyecto

```
claudy/
|-- backend/
|   |-- src/
|   |   |-- server.ts        # Servidor Express + WebSocket
|   |   |-- openrouter.ts    # Cliente OpenRouter API
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
  "openrouter": {
    "apiKey": "sk-or-v1-...",
    "defaultModel": "openai/gpt-4o-mini"
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
- Powered by [OpenRouter](https://openrouter.ai/)

## Licencia

MIT
