@echo off
chcp 65001 >nul
title Reproductor de Musica
cd /d "%~dp0backend"

if not exist "..\frontend\dist\index.html" (
  echo Compilando la pagina por primera vez...
  pushd "..\frontend"
  call npm install --include=dev
  call npm run build
  popd
)

echo.
echo ==========================================================
echo  Reproductor listo. Abre en tu navegador:
echo     http://localhost:8080
echo  Deja esta ventana abierta mientras escuchas musica.
echo  Para detenerlo presiona Ctrl+C o cierra la ventana.
echo ==========================================================
echo.
start "" http://localhost:8080
node src/server.js
pause

