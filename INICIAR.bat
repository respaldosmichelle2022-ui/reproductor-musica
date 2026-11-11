@echo off
chcp 65001 >nul
title Reproductor de Musica
cd /d "%~dp0backend"

echo.
echo ==========================================================
echo  Iniciando Reproductor Multimedia...
echo  Abre en tu navegador: http://localhost:8080
echo  Deja esta ventana abierta mientras escuchas musica.
echo ==========================================================
echo.

:: Espera 2 segundos para que el servidor Node arranque antes de abrir el navegador
start "" cmd /c "timeout /t 2 /nobreak >nul && start \"\" http://localhost:8080"
node src/server.js
pause
