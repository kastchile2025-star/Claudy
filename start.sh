#!/usr/bin/env bash
set -e

echo "🚀 Claudy — Instagram DM Assistant"
echo "==================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado."
    echo "Por favor instala Node.js 18+ desde https://nodejs.org"
    exit 1
fi

echo "✅ Node.js detectado: $(node --version)"
echo ""

# Check for .env
if [ ! -f .env ]; then
    echo "⚠️  Archivo .env no encontrado. Copiando desde .env.example..."
    cp .env.example .env
    echo "📝 Por favor edita el archivo .env con tus credenciales antes de continuar."
    exit 1
fi

# Check node_modules
if [ ! -d node_modules ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

echo "🏁 Iniciando servidor de desarrollo..."
echo ""
npm run dev
