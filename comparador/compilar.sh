#!/bin/sh
# Genera Comparador.exe (Windows 64 bits) desde Linux, macOS o Windows con Go 1.24 o más nuevo.
# La página comparador.html va dentro del .exe: después de cambiarla hay que volver a compilar.
set -e
cd "$(dirname "$0")"
# Icono e información de versión (rsrc_windows_amd64.syso). Solo hace falta si cambian winres/:
#   go run github.com/tc-hib/go-winres@v0.3.3 make --in winres/winres.json --arch amd64
GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-H windowsgui -s -w" -o Comparador.exe .
echo "Listo: $(pwd)/Comparador.exe"
