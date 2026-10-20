@echo off
rem Doble clic: trae el archivo de todas las maquinas (lo que se trae se cambia en traer_archivo.ps1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0traer_archivo.ps1" -AbrirCarpeta %*
pause
