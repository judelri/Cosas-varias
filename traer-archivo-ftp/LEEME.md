# Traer el mismo archivo de varias máquinas

Una ventana parecida a la conexión rápida de FileZilla: se escriben las IP de las máquinas, el usuario,
la contraseña y la ruta del archivo, y trae ese archivo de todas una tras otra. Cada copia se guarda
numerada en el orden de las IP. No hace falta instalar nada para FTP: se abre con doble clic en
`Traer archivo.bat`.

## Cómo se usa

1. Doble clic en `Traer archivo.bat`.
2. Rellenar:
   - **Servidores (IP)**: separadas por coma o una por línea. Para IP seguidas se escribe un rango:
     `192.168.1.101-120` (de la .101 a la .120) o `10.0.0.250-10.0.1.5`. Se respeta el orden en que
     se escriben; un rango al revés (`120-101`) va de mayor a menor.
   - Si unas máquinas son FTP y otras SFTP, se escribe el protocolo delante, como en la barra de
     FileZilla. Lo que no lo lleva usa el protocolo elegido abajo:
     ```
     192.168.1.101-110
     sftp://192.168.1.120-125
     ```
     Un puerto distinto va detrás: `sftp://192.168.1.130:2222`.
   - **Protocolo** y **Puerto** (21 para FTP, 22 para SFTP) para las IP sin protocolo delante,
     **Usuario** y **Contraseña** (los mismos para todas), como en FileZilla. Sin usuario se entra como anónimo.
   - **Archivo remoto**: la ruta tal como se ve en FileZilla, p. ej. `/log/alarmas.txt`.
     Para varios archivos, separarlos con coma.
   - **Guardar en**: la carpeta de este PC.
3. **Traer archivos**.

Las copias quedan en `<Guardar en>\<fecha_hora>\` con el número de orden y la IP delante:

```
01_192.168.1.101_alarmas.txt
02_192.168.1.102_alarmas.txt
03_192.168.1.103_alarmas.txt
```

La tabla muestra cada máquina en orden, y `resumen.csv` (se abre con Excel) guarda lo mismo. Si una
máquina falla dice por qué: no responde (apagada o fuera de la red), usuario o contraseña incorrectos,
o no existe el archivo. Primero se prueban todas a la vez, así las apagadas no hacen esperar a las demás.

La ventana recuerda lo escrito para la próxima vez. La contraseña se guarda cifrada con el usuario de
Windows en `traer_archivo.config.json`: solo ese usuario, en ese PC, puede leerla.

## Que se haga solo

Con **-SinVentana** usa lo último que se escribió en la ventana, sin preguntar nada. Para traerlo todos los
días, crear una tarea en el **Programador de tareas** de Windows con:

- Programa: `powershell`
- Argumentos: `-ExecutionPolicy Bypass -File "C:\ruta\traer_archivo.ps1" -SinVentana`

Cualquier dato se puede cambiar ahí mismo, p. ej.
`-SinVentana -Ips 192.168.1.101-120 -Archivo /log/alarmas.txt`.

## SFTP (y FTPS implícito)

Windows trae FTP y FTP con TLS explícito, pero no SFTP. Para SFTP hace falta [WinSCP](https://winscp.net),
gratuito, en una versión reciente. Vale cualquiera de las dos:

- Instalarlo normal, o
- Bajar la versión portable ("Portable executables") y copiar `WinSCP.com` y `WinSCP.exe` en esta misma carpeta.

La primera vez que se conecta a cada máquina SFTP acepta su clave SSH y la recuerda, igual que FileZilla
cuando se marca "Confiar siempre". Si más adelante esa clave cambia (por ejemplo, se reinstaló la
máquina), falla con "la clave SSH de la máquina no coincide": conectarse una vez a mano con WinSCP
a esa IP y aceptar la clave nueva.

## Límites

- Trae archivos con nombre exacto; no admite comodines (`*.log`) ni carpetas enteras.
- Hasta 1024 IP por rango.
