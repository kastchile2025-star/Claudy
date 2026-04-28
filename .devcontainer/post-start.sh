#!/bin/bash
set -e

echo "========================================="
echo "  Iniciando servicios de Claudy..."
echo "========================================="

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
    "host": "127.0.0.1"
  }
}
EOF
fi

# Iniciar backend en background
echo "[1/2] Iniciando Backend en http://localhost:3001 ..."
cd backend
bun run src/server.ts &
cd ..

# Esperar a que backend este listo
sleep 3

# Iniciar frontend en background
echo "[2/2] Iniciando Frontend en http://localhost:3000 ..."
cd frontend
bun run dev &
cd ..

echo ""
echo "========================================="
echo "  Claudy esta listo!"
echo "========================================="
echo ""
echo "  Frontend: https://localhost:3000"
echo "  Backend:  https://localhost:3001"
echo ""
echo "  Haz clic en 'Open in Browser' cuando"
echo "  aparezca la notificacion de puertos."
echo ""
