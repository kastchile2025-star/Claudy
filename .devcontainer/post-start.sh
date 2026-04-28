#!/bin/bash
set -e

echo "========================================="
echo "  Configurando entorno de Claudy..."
echo "========================================="

# Asegurar que bun esta en PATH
export PATH="$HOME/.bun/bin:$PATH"

# Crear directorio de configuracion
mkdir -p ~/.claudy

# Crear config.json si no existe
if [ ! -f ~/.claudy/config.json ]; then
  echo "Creando configuracion inicial..."
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
fi

echo "========================================="
echo "  Listo! Inicia manualmente:"
echo "========================================="
echo ""
echo "  Terminal 1 - Backend:"
echo "    cd /workspaces/Claudy/Claudy/backend && bun run src/server.ts"
echo ""
echo "  Terminal 2 - Frontend:"
echo "    cd /workspaces/Claudy/Claudy/frontend && bun run dev"
echo ""
echo "  Luego abre el puerto 3000 en el navegador"
echo ""
