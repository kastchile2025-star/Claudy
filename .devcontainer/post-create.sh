#!/bin/bash
set -e

echo "========================================="
echo "  Instalando dependencias de Claudy..."
echo "========================================="

# Instalar dependencias del backend
echo "[1/2] Backend..."
cd backend
bun install
cd ..

# Instalar dependencias del frontend
echo "[2/2] Frontend..."
cd frontend
bun install
cd ..

echo ""
echo "Dependencias instaladas correctamente!"
echo ""
