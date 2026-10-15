@echo off
TITLE Finca - Sistema de Inventario y Tunel
color 0A
cls

echo ===================================================
echo    INICIANDO SISTEMA DE INVENTARIO - FINCA
echo ===================================================
echo.

cd /d C:\Users\Administracion\OneDrive\Documentos\inventario

echo [1/3] Iniciando servidor Node.js...
start "Servidor Node" cmd /k "node server.js"
timeout /t 3 /nobreak > nul

echo [2/3] Estableciendo conexion con tunel personalizado...
echo Usando subdominio: tomatessansebastian.loca.lt
echo ---------------------------------------------------

:: Ejecutamos localtunnel asegurando el puerto y el subdominio exacto
start "Tunel Localtunnel" cmd /k "npx localtunnel --port 3000 --subdomain tomatessansebastian"

echo.
echo ===================================================
echo  LISTO. VERIFICA LAS VENTANAS ABIERTAS.
echo ===================================================
echo Si la ventana del tunel te da una URL rara, cierra 
echo esa ventana negra del tunel y vuelve a abrir este .bat.
echo ===================================================
echo.
pause