# Traer el mismo archivo de varias máquinas

Hace de una sola vez lo que a mano es abrir FileZilla, conectarse a cada máquina y bajar el mismo
archivo: usa los sitios que ya están guardados en el **Gestor de sitios de FileZilla** (servidor,
puerto, usuario y contraseña) y trae el archivo de todas. No hace falta instalar nada para FTP:
se abre con doble clic en `Traer archivo.bat`.

## Cómo se usa

1. Abrir `traer_archivo.ps1` con el Bloc de notas y cambiar, al principio:
   - `$Archivo`: la ruta del archivo en las máquinas, tal como se ve en FileZilla
     (p. ej. `'/log/alarmas.txt'`). Para varios: `@('/log/alarmas.txt','/cfg/parametros.ini')`.
   - `$Carpeta`: si en el Gestor de sitios las máquinas están dentro de una carpeta
     (p. ej. `'LGV'`), solo se usan esas. Vacío = todos los sitios.
   - `$Sitios`: filtrar por nombre, con comodines (p. ej. `'LGV*'`).
2. Doble clic en `Traer archivo.bat`.

Cada copia se guarda como `<sitio>_<archivo>` (p. ej. `LGV01_alarmas.txt`, `LGV02_alarmas.txt`) en
`descargas\<fecha_hora>\`, y la carpeta se abre al terminar. En pantalla y en `resumen.csv`
(se abre con Excel) queda qué máquina respondió y por qué falló cada una que no:
apagada o fuera de la red, contraseña incorrecta, o archivo inexistente.

También se puede llamar desde la consola sin tocar el script:

```
powershell -ExecutionPolicy Bypass -File traer_archivo.ps1 -Archivo /log/alarmas.txt -Carpeta LGV
```

Para que se haga solo (por ejemplo, todos los días a las 7:00), crear una tarea en el
**Programador de tareas** de Windows que ejecute `Traer archivo.bat`.

## Sin FileZilla o con contraseña maestra

Si FileZilla protege las contraseñas con contraseña maestra, el script no puede leerlas.
En ese caso (o para usar otra lista de máquinas) copiar `maquinas_ejemplo.csv`, completarlo con Excel
(separado por `;`) y llamar con `-Lista maquinas.csv`. Protocolo: `ftp`, `ftpes`, `ftps` o `sftp`.
Si la contraseña queda vacía, se pregunta al ejecutar. El CSV guarda las contraseñas a la vista:
no compartirlo.

## SFTP y FTPS implícito

Windows trae FTP y FTP con TLS explícito, pero no SFTP ni FTPS implícito. Para esos sitios hace falta
[WinSCP](https://winscp.net) (instalado, o la versión portable con `WinSCP.com` copiado junto a este
script). Conectarse una vez a cada máquina con WinSCP para aceptar su clave; después el script lo usa
solo.

## Límites

- Trae archivos con nombre exacto; no admite comodines (`*.log`) ni carpetas enteras.
- Las máquinas se recorren de a una; cada una apagada tarda `$Espera` segundos (10) en darse por perdida.
