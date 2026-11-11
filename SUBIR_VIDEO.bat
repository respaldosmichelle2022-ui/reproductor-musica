@echo off
chcp 65001 >nul
title Subir Video a Backblaze B2
cd /d "%~dp0"

echo ==========================================================
echo       SUBIR VIDEO A BACKBLAZE B2 (CON CARPETAS)
echo ==========================================================
echo.
set /p RUTA_VIDEO="Arrastra el archivo de video o escribe su ruta completa: "
set /p CARPETA="Nombre de la carpeta (ejemplo: VIERNES SOCIAL-2024): "

if "%CARPETA%"=="" set CARPETA=General

echo.
echo Subiendo video a la carpeta "%CARPETA%" en Backblaze...
echo.

.\.b2venv\Scripts\b2.exe upload-file --noProgress musica-michelle-2026 %RUTA_VIDEO% "videos/%CARPETA%/%~nx1"

if %errorlevel% equ 0 (
  echo.
  echo ==========================================================
  echo  ¡Éxito! El video se subió correctamente a %CARPETA%.
  echo  Aparecerá de inmediato en la pestaña 'Mis Videos'.
  echo ==========================================================
) else (
  echo.
  echo Hubo un problema al subir el video.
)
pause

