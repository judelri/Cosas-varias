@echo off
rem Doble clic: abre la ventana para traer el archivo de varias maquinas
start "" powershell -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0traer_archivo.ps1"
