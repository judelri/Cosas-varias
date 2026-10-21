# Traer el mismo archivo de varias máquinas

Una página en el navegador, con el estilo del Editor DXF, donde se escriben las IP de las máquinas FTP
y SFTP (cada grupo con su usuario y contraseña) y la ruta del archivo. Trae ese archivo de todas y
guarda cada copia numerada en el orden de las IP. No hace falta instalar nada para FTP; para SFTP,
WinSCP (ver abajo).

## Cómo se usa

1. Doble clic en `Traer archivo.bat`. Se abre la interfaz en el navegador (no hace falta internet:
   la sirve este mismo PC).
2. Rellenar:
   - **Máquinas FTP** y **Máquinas SFTP**: las IP de cada tipo, una por línea o separadas por coma.
     Para IP seguidas se escribe un rango: `192.168.1.101-120` (de la .101 a la .120) o
     `10.0.0.250-10.0.1.5`. Si una usa otro puerto, va detrás: `192.168.1.130:2222`.
     Al lado del título se ve cuántas máquinas salen, para comprobar el rango.
   - En cada bloque, **Usuario**, **Contraseña** y **Puerto** de ese tipo de máquina, como en FileZilla.
     En FTP, sin usuario se entra como anónimo.
   - **Archivo en las máquinas**: la ruta tal como se ve en FileZilla, p. ej. `/log/alarmas.txt`.
     Para varios archivos, separarlos con coma.
   - **Guardar en este PC**: la carpeta (o **Elegir…**).
3. **Traer archivos**. La tabla se va llenando máquina por máquina.

Las copias quedan en `<Guardar en>\<fecha_hora>\`, ordenadas por IP (FTP y SFTP mezcladas), con el número
de orden y la IP delante:

```
01_192.168.1.101_alarmas.txt
02_192.168.1.102_alarmas.txt
03_192.168.1.103_alarmas.txt
```

Si una máquina falla, la tabla y `resumen.csv` (se abre con Excel) dicen por qué: no responde (apagada o
fuera de la red), usuario o contraseña incorrectos, o no existe el archivo. Primero se prueban todas a la
vez, así las apagadas no hacen esperar a las demás. **Abrir carpeta** abre la de la última vez.

La página recuerda lo escrito para la próxima vez. Las contraseñas se guardan cifradas con el usuario de
Windows en `traer_archivo.config.json` (solo ese usuario, en ese PC, puede leerlas); en la página se ven
como "(guardada)" y se dejan vacías para seguir usándolas.

**Cerrar** (arriba a la derecha) termina el programa. Si solo se cierra la pestaña, termina solo a los
5 minutos.

## Que se haga solo

Con **-SinVentana** repite lo último que se hizo en la interfaz, sin preguntar nada. Para traerlo todos los
días, crear una tarea en el **Programador de tareas** de Windows con:

- Programa: `powershell`
- Argumentos: `-ExecutionPolicy Bypass -File "C:\ruta\traer_archivo.ps1" -SinVentana`

Se puede cambiar el archivo o la carpeta ahí mismo: `-SinVentana -Archivo /log/alarmas.txt -Destino D:\logs`.

## SFTP (y FTP con TLS implícito)

Windows trae FTP y FTP con TLS explícito, pero no SFTP. Para SFTP hace falta [WinSCP](https://winscp.net),
gratuito, en una versión reciente. Vale cualquiera de las dos:

- Instalarlo normal, o
- Bajar la versión portable ("Portable executables") y copiar `WinSCP.com` y `WinSCP.exe` en esta misma carpeta.

Si falta, la interfaz lo avisa en el bloque SFTP; las FTP funcionan igual.

La primera vez que se conecta a cada máquina SFTP acepta su clave SSH y la recuerda, igual que FileZilla
cuando se marca "Confiar siempre". Si más adelante esa clave cambia (por ejemplo, se reinstaló la
máquina), falla con "la clave SSH de la máquina no coincide": conectarse una vez a mano con WinSCP
a esa IP y aceptar la clave nueva.

## Archivos

- `Traer archivo.bat`: lo que se abre con doble clic.
- `traer_archivo.ps1`: hace las descargas y sirve la interfaz.
- `interfaz.html`: la página.

## Límites

- Trae archivos con nombre exacto; no admite comodines (`*.log`) ni carpetas enteras.
- Hasta 1024 IP por rango. Todas las FTP usan el mismo usuario, y todas las SFTP el suyo.
