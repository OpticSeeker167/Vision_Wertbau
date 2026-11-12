@echo off
setlocal
cd /d "%~dp0"
title Vision Wertbau

where node >nul 2>&1
if errorlevel 1 (
  echo No se encontro Node.js. Este proyecto necesita Node.js 20 o posterior.
  echo No se ha instalado ni descargado ningun programa.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set "VISION_NODE_MAJOR=%%V"
if not defined VISION_NODE_MAJOR (
  echo No se pudo comprobar la version de Node.js.
  pause
  exit /b 1
)
if %VISION_NODE_MAJOR% LSS 20 (
  echo Este proyecto necesita Node.js 20 o posterior.
  node --version
  pause
  exit /b 1
)

echo.
echo VISION WERTBAU
echo Abri http://localhost:4173 en tu navegador.
echo Deja esta ventana abierta mientras usas el editor.
echo Para detenerlo, presiona Ctrl+C.
echo.

where npm.cmd >nul 2>&1
if errorlevel 1 (
  node scripts\serve.mjs
) else (
  call npm.cmd start
)
if errorlevel 1 (
  echo.
  echo El servidor no pudo iniciarse. Revisa el mensaje anterior.
  echo Si el puerto ya esta en uso, consulta README.md para usar otro.
  pause
  exit /b 1
)
endlocal
