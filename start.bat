@echo off
chcp 65001 >nul
echo 🚀 Claudy — Instagram DM Assistant
echo ===================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js no está instalado o no está en el PATH.
    echo Por favor instala Node.js 18+ desde https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js detectado
node --version
echo.

REM Check for .env
if not exist .env (
    echo ⚠️  Archivo .env no encontrado. Copiando desde .env.example...
    copy .env.example .env
    echo 📝 Por favor edita el archivo .env con tus credenciales antes de continuar.
    pause
    exit /b 1
)

REM Check node_modules
if not exist node_modules (
    echo 📦 Instalando dependencias...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Error instalando dependencias.
        pause
        exit /b 1
    )
)

echo 🏁 Iniciando servidor de desarrollo...
echo.
call npm run dev
