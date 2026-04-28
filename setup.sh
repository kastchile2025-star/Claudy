#!/bin/bash
set -e

# ==========================================
#  Script de instalacion para GitHub Codespaces
#  Claudy - Asistente IA Personal
# ==========================================

echo "========================================="
echo "  Instalando Claudy en Codespaces..."
echo "========================================="
echo ""

# 1. Detectar directorio del proyecto
PROJECT_DIR="/workspaces/Claudy/Claudy"
if [ ! -d "$PROJECT_DIR" ]; then
    PROJECT_DIR="$(pwd)"
fi

cd "$PROJECT_DIR"

echo "[1/6] Instalando Bun (si no esta)..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
fi
export PATH="$HOME/.bun/bin:$PATH"

echo "   Bun version: $(bun --version)"
echo ""

echo "[2/6] Instalando dependencias del backend..."
cd "$PROJECT_DIR/backend"
bun install

echo ""
echo "[3/6] Instalando dependencias del frontend..."
cd "$PROJECT_DIR/frontend"
bun install

echo ""
echo "[4/6] Configurando API key de OpenRouter..."
mkdir -p ~/.claudy
cat > ~/.claudy/config.json << 'EOF'
{
  "openrouter": {
    "apiKey": "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",
    "defaultModel": "openai/gpt-4o-mini"
  },
  "agent": {
    "systemPrompt": "Eres Claudy, un asistente de IA personal, util, directo y amigable. Responde en el idioma del usuario. Usa markdown para formatear tus respuestas. Cuando necesites buscar informacion actual, usa la herramienta de busqueda web.",
    "maxTokens": 4096,
    "temperature": 0.7
  },
  "server": {
    "port": 3001,
    "host": "0.0.0.0"
  }
}
EOF
echo "   Configuracion creada en ~/.claudy/config.json"
echo ""

echo "[5/6] Iniciando backend (puerto 3001)..."
cd "$PROJECT_DIR/backend"
nohup bun run src/server.ts > /tmp/claudy-backend.log 2>&1 &
echo "   PID: $!"
echo "   Logs: tail -f /tmp/claudy-backend.log"

echo ""
echo "[6/6] Iniciando frontend (puerto 3000)..."
cd "$PROJECT_DIR/frontend"
nohup bun run dev > /tmp/claudy-frontend.log 2>&1 &
echo "   PID: $!"
echo "   Logs: tail -f /tmp/claudy-frontend.log"

echo ""
echo "========================================="
echo "  Claudy esta instalado y corriendo!"
echo "========================================="
echo ""
echo "  Espera 5 segundos y luego:"
echo "  1. Ve a la pestana 'Puertos' (abajo)"
echo "  2. Busca el puerto 3000"
echo "  3. Haz clic en el icono del globo 🌐"
echo ""
echo "  Si no ves la pestana Puertos:"
echo "  Ctrl+Shift+P -> 'Ports: Focus on Ports View'"
echo ""
echo "  Para ver logs:"
echo "    tail -f /tmp/claudy-backend.log"
echo "    tail -f /tmp/claudy-frontend.log"
echo ""

# Esperar 5 segundos para que los servicios arranquen
sleep 5

# Verificar que estan corriendo
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  Port 3000: OK"
else
    echo "  Port 3000: ERROR (revisa logs)"
fi

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  Port 3001: OK"
else
    echo "  Port 3001: ERROR (revisa logs)"
fi

echo ""
