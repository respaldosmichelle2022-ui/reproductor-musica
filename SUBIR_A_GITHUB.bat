@echo off
chcp 65001 >nul
title Subir a GitHub
cd /d "%~dp0"

echo ==========================================================
echo  Subiendo proyecto a tu GitHub...
echo  (Si se abre una ventana del navegador, haz clic en Sign in / Authorize)
echo ==========================================================
echo.
git push -u origin master
echo.
if %errorlevel% equ 0 (
  echo ==========================================================
  echo  LISTO! El codigo se subio con exito a GitHub.
  echo ==========================================================
) else (
  echo ==========================================================
  echo  Hubo un error o falta autorizar en el navegador.
  echo ==========================================================
)
pause

