# Claudy 🤖

Claudy es un servidor webhook minimalista para recibir mensajes de **Telegram** y responder usando **OpenAI**.

## Requisitos previos

1. Un **bot de Telegram** creado con [@BotFather](https://t.me/BotFather).
2. Obtener el **Bot Token** de tu bot (ej: `123456789:ABCdefGhIJKlmNoPQRsTUVwxYZ`).
3. Una cuenta de **OpenAI** con API key.

## 🚀 Opción recomendada: Probar en GitHub Codespaces (sin instalar nada)

Haz clic en este botón para abrir el proyecto en GitHub Codespaces:

```
Code → Codespaces → Create codespace on main
```

Una vez que se abra:

```bash
cd apps/claudy
cp .env.example .env
# Edita .env con tu TELEGRAM_BOT_TOKEN real
npm install
npm run dev
```

Codespaces te dará una URL pública automáticamente. La necesitarás para configurar el webhook en Telegram.

## Setup local

### Opción A: Script automático

**Windows:**
```bash
cd apps/claudy
start.bat
```

**Linux / macOS / WSL:**
```bash
cd apps/claudy
bash start.sh
```

### Opción B: Manual

```bash
cd apps/claudy
npm install
cp .env.example .env
# Edita .env con tu TELEGRAM_BOT_TOKEN
npm run dev
```

## Configurar webhook en Telegram

### Paso 1: Obtén tu Bot Token

1. Abre Telegram y busca [@BotFather](https://t.me/BotFather)
2. Envía `/newbot`
3. Sigue las instrucciones para crear un bot
4. Copia el **Bot Token** que te da (algo como `123456789:ABCdefGhIJKlm...`)

### Paso 2: Configura tu archivo .env

Edita el archivo `.env` en tu proyecto:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxYZ
OPENAI_API_KEY=sk-tu_api_key_real
```

### Paso 3: Expón tu servidor públicamente

En **GitHub Codespaces**: pestaña **PORTS** → puerto `3000` → **Port Visibility → Public**

En **local con ngrok**:
```bash
npx ngrok http 3000
```

Copia la URL pública (ej: `https://abc123.ngrok.io`).

### Paso 4: Configura el webhook en Telegram

Llama a esta URL en tu navegador (reemplaza los valores):

```
https://api.telegram.org/botTU_BOT_TOKEN/setWebhook?url=https://TU_URL_PUBLICA/webhook
```

Ejemplo completo:
```
https://api.telegram.org/bot123456789:ABCdef/setWebhook?url=https://abc123.ngrok.io/webhook
```

Deberías ver `{"ok":true,"result":true,"description":"Ok"}`.

### Paso 5: Prueba

1. Abre Telegram y busca tu bot
2. Envíale un mensaje
3. ¡Claudy debería responder!

---

## Estructura

```
src/
  index.ts           # Entry point (servidor Node)
  webhook.ts        # Router Hono (GET/POST /webhook)
  telegram.ts      # Cliente Telegram Bot API
  openai-client.ts # Cliente OpenAI
  env.ts            # Validación de variables de entorno con Zod
```

## Cómo funciona

1. Un usuario te envía un mensaje por Telegram.
2. Telegram envía un webhook `POST /webhook` con el mensaje.
3. El servidor extrae el texto del mensaje y lo envía a OpenAI.
4. Recibe la respuesta de OpenAI y la reenvía al usuario por Telegram.

## Limitaciones del MVP

- Solo soporta mensajes de texto.
- No persiste historial de conversación (cada mensaje es independiente).
- No maneja errores de rate-limiting de Telegram de forma sofisticada.

## Pasos siguientes sugeridos

- Agregar persistencia (SQLite) para mantener contexto de conversación.
- Soportar mensajes con imágenes.
- Implementar cola de mensajes para alta disponibilidad.
- Convertirlo en un plugin nativo de OpenClaw.
