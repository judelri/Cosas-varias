<#
  Trae el mismo archivo de una serie de máquinas FTP y SFTP, como en FileZilla pero de una vez.
  Sin parámetros abre la interfaz (interfaz.html) en el navegador; este script hace las descargas.
  Cada copia queda numerada en el orden de las IP en <destino>\<fecha_hora>\, junto con resumen.csv.
  Con -SinVentana repite en la consola lo último que se usó en la interfaz. Ver LEEME.md.
#>
param(
    # Trabajar sin interfaz (para el Programador de tareas), con lo último que se usó en ella
    [switch]$SinVentana,

    # Ruta del archivo en cada máquina, como se ve en FileZilla. Varios separados por coma
    [string]$Archivo,

    # Carpeta de este PC donde se guardan las copias
    [string]$Destino,

    # Segundos de espera por máquina antes de darla por apagada
    [int]$Espera = 10,

    # Para pruebas: no abrir el navegador, solo mostrar la dirección
    [switch]$NoAbrir
)

$ErrorActionPreference = 'Stop'
# Windows PowerShell 5.1 no siempre ofrece TLS 1.2, que piden los servidores FTP con TLS actuales
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$rutaConfig = Join-Path $PSScriptRoot 'traer_archivo.config.json'
$puertosPorDefecto = @{ ftp = 21; ftpes = 21; ftps = 990; sftp = 22 }

# --- Configuración: lo último que se usó. Las contraseñas van cifradas para el usuario de Windows actual ---

function Cifrar($texto) {
    if (-not $texto) { return '' }
    return (ConvertTo-SecureString $texto -AsPlainText -Force | ConvertFrom-SecureString)
}

function Descifrar($texto) {
    if (-not $texto) { return '' }
    try { return (New-Object System.Net.NetworkCredential('', (ConvertTo-SecureString $texto))).Password }
    catch { return '' }  # guardada por otro usuario u otro PC: se vuelve a escribir
}

function Nuevo-Grupo($cifrado) {
    [pscustomobject]@{ Ips = ''; Usuario = ''; Contrasena = ''; Puerto = $puertosPorDefecto[$cifrado]; Cifrado = $cifrado }
}

function Leer-Config {
    $cfg = [pscustomobject]@{
        Ftp = (Nuevo-Grupo 'ftp'); Sftp = (Nuevo-Grupo 'sftp')
        Archivo = '/log/alarmas.txt'; Destino = (Join-Path $PSScriptRoot 'descargas')
    }
    if (Test-Path -LiteralPath $rutaConfig) {
        $guardada = Get-Content -LiteralPath $rutaConfig -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($nombre in 'Ftp', 'Sftp') {
            $g = $guardada.$nombre
            if (-not $g) { continue }
            foreach ($campo in 'Ips', 'Usuario', 'Puerto') {
                if ($null -ne $g.$campo -and "$($g.$campo)" -ne '') { $cfg.$nombre.$campo = $g.$campo }
            }
            if ($nombre -eq 'Ftp' -and @('ftp', 'ftpes', 'ftps') -contains $g.Cifrado) { $cfg.Ftp.Cifrado = $g.Cifrado }
            $cfg.$nombre.Contrasena = Descifrar $g.ContrasenaCifrada
        }
        if ($guardada.Archivo) { $cfg.Archivo = $guardada.Archivo }
        if ($guardada.Destino) { $cfg.Destino = $guardada.Destino }
    }
    $cfg
}

function Guardar-Config($cfg) {
    try {
        $grupos = @{}
        foreach ($nombre in 'Ftp', 'Sftp') {
            $g = $cfg.$nombre
            $grupos[$nombre] = [pscustomobject]@{
                Ips = $g.Ips; Usuario = $g.Usuario; ContrasenaCifrada = (Cifrar $g.Contrasena); Puerto = $g.Puerto; Cifrado = $g.Cifrado
            }
        }
        [pscustomobject]@{ Ftp = $grupos.Ftp; Sftp = $grupos.Sftp; Archivo = $cfg.Archivo; Destino = $cfg.Destino } |
            ConvertTo-Json | Set-Content -LiteralPath $rutaConfig -Encoding UTF8
    } catch { }  # si no se puede guardar, la próxima vez se vuelve a escribir
}

# --- Lista de máquinas ---

function Ip-ANumero($ip) {
    $o = $ip.Split('.') | ForEach-Object { [long]$_ }
    if (@($o | Where-Object { $_ -gt 255 }).Count) { throw "IP no válida: $ip" }
    return $o[0] * 16777216 + $o[1] * 65536 + $o[2] * 256 + $o[3]
}

function Numero-AIp([long]$n) {
    return '{0}.{1}.{2}.{3}' -f [math]::Floor($n / 16777216), ([math]::Floor($n / 65536) % 256), ([math]::Floor($n / 256) % 256), ($n % 256)
}

# '192.168.1.101-103, 10.0.0.5:2222' -> .101, .102, .103 con el puerto del grupo y 10.0.0.5 con el 2222 (sin repetir)
function Expandir-Ips($texto, $protocolo, $puerto) {
    $vistas = @{}
    foreach ($t in ("$texto" -split '[\s,;]+' | Where-Object { $_ })) {
        $original = $t
        # Si se pega desde FileZilla con sftp:// o ftp:// delante, manda el bloque donde está escrita
        $t = ($t -replace '^[a-zA-Z]+://', '').TrimEnd('/')
        $puertoT = $puerto
        if ($t -match '^(.+):(\d{1,5})$') {
            $t = $matches[1]
            $puertoT = [int]$matches[2]
        }
        if ($t -match '^(\d{1,3}\.\d{1,3}\.\d{1,3}\.)(\d{1,3})-(\d{1,3})$') {
            $desde = Ip-ANumero ($matches[1] + $matches[2])
            $hasta = Ip-ANumero ($matches[1] + $matches[3])
        } elseif ($t -match '^(\d{1,3}(\.\d{1,3}){3})-(\d{1,3}(\.\d{1,3}){3})$') {
            $desde = Ip-ANumero $matches[1]
            $hasta = Ip-ANumero $matches[3]
        } elseif ($t -match '^\d{1,3}(\.\d{1,3}){3}$') {
            $desde = Ip-ANumero $t
            $hasta = $desde
        } else {
            if ($t -match '^[\d.]+-[\d.]*$') { throw "Rango no válido: $original (ejemplo: 192.168.1.101-120)" }
            $desde = $null  # un nombre de equipo
        }
        if ($null -eq $desde) { $lista = @($t) }
        else {
            if ([math]::Abs($hasta - $desde) -ge 1024) { throw "El rango $original tiene demasiadas IP" }
            $paso = 1
            if ($hasta -lt $desde) { $paso = -1 }
            $lista = for ($n = $desde; $n -ne $hasta + $paso; $n += $paso) { Numero-AIp $n }
        }
        foreach ($ip in $lista) {
            $clave = "${ip}:$puertoT"
            if (-not $vistas.ContainsKey($clave)) {
                $vistas[$clave] = $true
                [pscustomobject]@{ Ip = $ip; Protocolo = $protocolo; Puerto = $puertoT }
            }
        }
    }
}

# Prueba todas las máquinas a la vez, para no esperar una por una a las apagadas
function Probar-Conexion($maquinas) {
    $intentos = foreach ($m in $maquinas) {
        $cliente = New-Object System.Net.Sockets.TcpClient
        $tarea = $null
        try { $tarea = $cliente.ConnectAsync($m.Servidor, $m.Puerto) } catch { }
        [pscustomobject]@{ Clave = "$($m.Servidor):$($m.Puerto)"; Cliente = $cliente; Tarea = $tarea }
    }
    $limite = (Get-Date).AddSeconds($Espera)
    while ((Get-Date) -lt $limite -and @($intentos | Where-Object { $_.Tarea -and -not $_.Tarea.IsCompleted }).Count) {
        Start-Sleep -Milliseconds 100
    }
    $responde = @{}
    foreach ($i in $intentos) {
        $responde[$i.Clave] = ($i.Tarea -and "$($i.Tarea.Status)" -eq 'RanToCompletion')
        $i.Cliente.Close()
    }
    $responde
}

# --- Descargas ---

function Buscar-WinScp {
    $candidatos = @(
        (Join-Path $PSScriptRoot 'WinSCP.com'),
        "${env:ProgramFiles(x86)}\WinSCP\WinSCP.com",
        "$env:ProgramFiles\WinSCP\WinSCP.com"
    )
    foreach ($c in $candidatos) { if (Test-Path -LiteralPath $c) { return $c } }
    return $null
}

# FTP y FTP con TLS explícito: lo hace Windows solo, sin instalar nada
function Bajar-Ftp($m, $remoto, $local) {
    $ruta = (($remoto.Trim('/') -split '/') | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/'
    # %2F hace que la ruta cuente desde la raíz del servidor, como en FileZilla, y no desde la carpeta del usuario
    if ($remoto.StartsWith('/')) { $ruta = '%2F' + $ruta }
    $req = [System.Net.FtpWebRequest][System.Net.WebRequest]::Create("ftp://$($m.Servidor):$($m.Puerto)/$ruta")
    $req.Method = [System.Net.WebRequestMethods+Ftp]::DownloadFile
    $req.Credentials = New-Object System.Net.NetworkCredential($m.Usuario, $m.Contrasena)
    $req.UseBinary = $true
    $req.UsePassive = $true
    $req.EnableSsl = ($m.Protocolo -eq 'ftpes')
    $req.KeepAlive = $false
    $req.Proxy = $null
    $req.Timeout = $Espera * 1000
    $req.ReadWriteTimeout = $Espera * 1000

    $resp = $req.GetResponse()
    try {
        $entrada = $resp.GetResponseStream()
        $salida = [IO.File]::Create($local)
        try { $entrada.CopyTo($salida) } finally { $salida.Close(); $entrada.Close() }
    } finally { $resp.Close() }
}

# SFTP y FTPS implícito: Windows no los trae, se usa WinSCP
function Bajar-WinScp($m, $remoto, $local) {
    $winscp = Buscar-WinScp
    if (-not $winscp) { throw "para $($m.Protocolo.ToUpper()) hace falta WinSCP (ver LEEME)" }
    $url = '{0}://{1}:{2}@{3}:{4}/' -f $m.Protocolo, [Uri]::EscapeDataString($m.Usuario),
        [Uri]::EscapeDataString('' + $m.Contrasena), $m.Servidor, $m.Puerto
    # Como FileZilla: la clave SSH de una máquina nueva se acepta y se recuerda; si después cambia, falla
    $clave = ''
    if ($m.Protocolo -eq 'sftp') { $clave = ' -hostkey=acceptnew' }
    $orden = @(
        'option batch abort', 'option confirm off',
        "open $url -timeout=$Espera$clave",
        ('get -transfer=binary "{0}" "{1}"' -f $remoto.Replace('"', '""'), $local.Replace('"', '""')),
        'exit'
    )
    $guion = [IO.Path]::GetTempFileName()
    try {
        [IO.File]::WriteAllLines($guion, $orden, (New-Object Text.UTF8Encoding $true))
        # Usa la configuración normal de WinSCP, donde quedan las claves de servidor ya aceptadas
        $salida = & $winscp /script="$guion" 2>&1
        if ($LASTEXITCODE -ne 0) {
            $texto = ($salida | ForEach-Object { "$_" }) -join ' '
            if ($texto -match 'host key') { throw 'la clave SSH de la máquina no coincide con la de la vez anterior (ver LEEME)' }
            if ($texto -match 'Authentication failed|Access denied|Authentication log') { throw 'usuario o contraseña incorrectos' }
            if ($texto -match 'No such file|Can''t get attributes|Permission denied') { throw 'no existe el archivo o no hay permiso' }
            if ($texto -match 'timed out|refused|Network error') { throw 'no responde (¿apagada o fuera de la red?)' }
            $ultima = ($salida | Where-Object { "$_".Trim() } | Select-Object -Last 1)
            throw "WinSCP: $ultima"
        }
    } finally { Remove-Item -LiteralPath $guion -Force -ErrorAction SilentlyContinue }
}

function Explicar-Error($ex) {
    $e = $ex
    while ($e -and -not ($e -is [System.Net.WebException])) { $e = $e.InnerException }
    if ($e) {
        $r = $e.Response -as [System.Net.FtpWebResponse]
        if ($r -and [int]$r.StatusCode -ne 0) {
            switch ([int]$r.StatusCode) {
                530 { return 'usuario o contraseña incorrectos' }
                550 { return 'no existe el archivo o no hay permiso' }
            }
            return ('' + $r.StatusDescription).Trim()
        }
        switch ("$($e.Status)") {
            'Timeout'               { return 'no responde (¿apagada o fuera de la red?)' }
            'ConnectFailure'        { return 'no acepta la conexión (¿apagada o sin servidor FTP?)' }
            'NameResolutionFailure' { return 'no se encuentra el nombre del servidor' }
        }
    }
    return $ex.GetBaseException().Message
}

function Nombre-Valido($texto) {
    foreach ($c in [IO.Path]::GetInvalidFileNameChars()) { $texto = $texto.Replace([string]$c, '_') }
    return $texto
}

# Junta las máquinas FTP y SFTP, cada una con su usuario, ordenadas por IP
function Armar-Lista($cfg) {
    $todas = @()
    $vistas = @{}
    $indice = 0
    foreach ($g in @($cfg.Ftp, $cfg.Sftp)) {
        $usuario = $g.Usuario
        $contrasena = $g.Contrasena
        if (-not $usuario -and $g.Cifrado -ne 'sftp') { $usuario = 'anonymous'; $contrasena = 'anonymous@' }
        foreach ($e in @(Expandir-Ips $g.Ips $g.Cifrado $g.Puerto)) {
            $clave = "$($e.Ip):$($e.Puerto)"
            if ($vistas.ContainsKey($clave)) { continue }
            $vistas[$clave] = $true
            $indice++
            # Los nombres de equipo van al final, en el orden escrito
            $orden = 1e12 + $indice
            if ($e.Ip -match '^\d{1,3}(\.\d{1,3}){3}$') { $orden = Ip-ANumero $e.Ip }
            $todas += [pscustomobject]@{
                Servidor = $e.Ip; Puerto = $e.Puerto; Protocolo = $e.Protocolo
                Usuario = $usuario; Contrasena = $contrasena; Orden = $orden; Indice = $indice
            }
        }
    }
    @($todas | Sort-Object Orden, Indice)
}

# Recorre las máquinas en orden. $aviso recibe cada novedad: @{ tipo = 'inicio' | 'estado' | 'fila', ... }
function Traer-Todo($cfg, $aviso) {
    $lista = @(Armar-Lista $cfg)
    $archivos = @($cfg.Archivo -split '[,;]' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    if ($lista.Count -eq 0) { throw 'Falta escribir las IP de las máquinas (FTP, SFTP o las dos).' }
    if ($archivos.Count -eq 0) { throw 'Falta escribir la ruta del archivo a traer.' }
    if (-not $cfg.Destino) { throw 'Falta la carpeta donde guardar las copias.' }

    $carpeta = Join-Path $cfg.Destino (Get-Date -Format 'yyyy-MM-dd_HHmm')
    New-Item -ItemType Directory -Force -Path $carpeta | Out-Null
    # 01_, 02_... para que el Explorador las muestre en el mismo orden que las IP
    $ancho = [math]::Max(2, ([string]$lista.Count).Length)

    & $aviso @{ tipo = 'inicio'; total = $lista.Count * $archivos.Count; carpeta = $carpeta }
    & $aviso @{ tipo = 'estado'; texto = ('Probando la conexión con {0} máquina(s)...' -f $lista.Count) }
    $responde = Probar-Conexion $lista

    $resultados = @()
    $n = 0
    foreach ($m in $lista) {
        $n++
        $ip = $m.Servidor
        foreach ($remoto in $archivos) {
            & $aviso @{ tipo = 'estado'; texto = ('Trayendo {0} de {1}: {2}' -f $n, $lista.Count, $ip) }
            $copia = '{0}_{1}_{2}' -f ([string]$n).PadLeft($ancho, '0'), (Nombre-Valido $ip), (Nombre-Valido ($remoto -split '/')[-1])
            $local = Join-Path $carpeta $copia
            $parcial = "$local.parcial"
            try {
                if (-not $responde["${ip}:$($m.Puerto)"]) { throw 'no responde (¿apagada o fuera de la red?)' }
                if (-not $m.Usuario) { throw 'falta el usuario de SFTP' }
                if ($m.Protocolo -eq 'sftp' -or $m.Protocolo -eq 'ftps') { Bajar-WinScp $m $remoto $parcial }
                else { Bajar-Ftp $m $remoto $parcial }
                Move-Item -LiteralPath $parcial -Destination $local -Force
                $estado = 'OK'
                $detalle = '{0:N0} bytes' -f (Get-Item -LiteralPath $local).Length
            } catch {
                Remove-Item -LiteralPath $parcial -Force -ErrorAction SilentlyContinue
                $estado = 'FALLO'
                $detalle = Explicar-Error $_.Exception
                $copia = ''
            }
            $r = [pscustomobject]@{
                Numero = $n; IP = $ip; Protocolo = $m.Protocolo.ToUpper(); Archivo = $remoto
                Resultado = $estado; Detalle = $detalle; Copia = $copia
            }
            $resultados += $r
            & $aviso @{ tipo = 'fila'; fila = $r }
        }
    }
    $resultados | Export-Csv -LiteralPath (Join-Path $carpeta 'resumen.csv') -Delimiter ';' -Encoding UTF8 -NoTypeInformation
    $fallos = @($resultados | Where-Object { $_.Resultado -ne 'OK' }).Count
    [pscustomobject]@{ Carpeta = $carpeta; Bien = $resultados.Count - $fallos; Fallos = $fallos }
}

$cfg = Leer-Config

# --- Sin interfaz ---

if ($SinVentana) {
    if ($PSBoundParameters.ContainsKey('Archivo')) { $cfg.Archivo = $Archivo }
    if ($PSBoundParameters.ContainsKey('Destino')) { $cfg.Destino = $Destino }
    foreach ($nombre in 'Ftp', 'Sftp') {
        $g = $cfg.$nombre
        if ($g.Ips -and $g.Usuario -and -not $g.Contrasena) {
            $segura = Read-Host "Contraseña $($nombre.ToUpper()) de $($g.Usuario)" -AsSecureString
            $g.Contrasena = (New-Object System.Net.NetworkCredential('', $segura)).Password
        }
    }
    $aviso = {
        param($ev)
        if ($ev.tipo -eq 'estado') { Write-Host $ev.texto }
        elseif ($ev.tipo -eq 'fila') {
            $r = $ev.fila
            if ($r.Resultado -eq 'OK') { Write-Host ('  OK     {0,-5} {1,-16} {2}  ({3})' -f $r.Protocolo, $r.IP, $r.Copia, $r.Detalle) -ForegroundColor Green }
            else { Write-Host ('  FALLO  {0,-5} {1,-16} {2}: {3}' -f $r.Protocolo, $r.IP, $r.Archivo, $r.Detalle) -ForegroundColor Red }
        }
    }
    $fin = Traer-Todo $cfg $aviso
    Write-Host ('Listo: {0} bien, {1} con fallo. Copias y resumen.csv en {2}' -f $fin.Bien, $fin.Fallos, $fin.Carpeta)
    if ($fin.Fallos -gt 0) { exit 1 }
    exit 0
}

# --- Interfaz: una página en el navegador que habla con este script por localhost ---

function Responder($ctx, $codigo, $tipo, [string]$texto) {
    $bytes = [Text.Encoding]::UTF8.GetBytes($texto)
    $ctx.Response.StatusCode = $codigo
    $ctx.Response.ContentType = $tipo
    $ctx.Response.Headers['Cache-Control'] = 'no-store'
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.Close()
}

function Responder-Json($ctx, $objeto) {
    Responder $ctx 200 'application/json; charset=utf-8' ($objeto | ConvertTo-Json -Depth 5 -Compress)
}

function Leer-Cuerpo($ctx) {
    $lector = New-Object IO.StreamReader($ctx.Request.InputStream, [Text.Encoding]::UTF8)
    try { return ($lector.ReadToEnd() | ConvertFrom-Json) } finally { $lector.Close() }
}

# Lo que ve la página: las contraseñas no se mandan, solo si hay una guardada
function Config-Publica {
    $grupos = @{}
    foreach ($nombre in 'Ftp', 'Sftp') {
        $g = $cfg.$nombre
        $grupos[$nombre] = @{ Ips = $g.Ips; Usuario = $g.Usuario; Puerto = $g.Puerto; Cifrado = $g.Cifrado; HayContrasena = [bool]$g.Contrasena }
    }
    @{ Ftp = $grupos.Ftp; Sftp = $grupos.Sftp; Archivo = $cfg.Archivo; Destino = $cfg.Destino; WinScp = [bool](Buscar-WinScp) }
}

function Atender-Traer($ctx) {
    $datos = Leer-Cuerpo $ctx
    $problema = ''
    foreach ($nombre in 'Ftp', 'Sftp') {
        $g = $cfg.$nombre
        $d = $datos.$nombre
        $puerto = 0
        if (-not [int]::TryParse("$($d.Puerto)".Trim(), [ref]$puerto) -or $puerto -lt 1 -or $puerto -gt 65535) {
            $problema = "El puerto $($nombre.ToUpper()) no es válido."
        }
        $g.Ips = "$($d.Ips)".Trim()
        $g.Usuario = "$($d.Usuario)".Trim()
        $g.Puerto = $puerto
        # Contraseña vacía en la página = se mantiene la guardada
        if ("$($d.Contrasena)") { $g.Contrasena = "$($d.Contrasena)" }
        if ($nombre -eq 'Ftp' -and @('ftp', 'ftpes', 'ftps') -contains $d.Cifrado) { $g.Cifrado = $d.Cifrado }
    }
    $cfg.Archivo = "$($datos.Archivo)".Trim()
    $cfg.Destino = "$($datos.Destino)".Trim()
    if (-not $problema) { Guardar-Config $cfg }

    # La respuesta va llegando línea a línea (una por novedad) para que la tabla se llene sobre la marcha
    $resp = $ctx.Response
    $resp.ContentType = 'application/x-ndjson; charset=utf-8'
    $resp.Headers['Cache-Control'] = 'no-store'
    $resp.SendChunked = $true
    $flujo = $resp.OutputStream
    $enviar = {
        param($ev)
        try {
            $bytes = [Text.Encoding]::UTF8.GetBytes(($ev | ConvertTo-Json -Depth 4 -Compress) + "`n")
            $flujo.Write($bytes, 0, $bytes.Length)
            $flujo.Flush()
        } catch { }  # si se cerró la página, las descargas siguen igual
    }.GetNewClosure()
    try {
        if ($problema) { throw $problema }
        $fin = Traer-Todo $cfg $enviar
        $script:ultimaCarpeta = $fin.Carpeta
        & $enviar @{ tipo = 'fin'; carpeta = $fin.Carpeta; bien = $fin.Bien; fallos = $fin.Fallos }
    } catch {
        & $enviar @{ tipo = 'error'; texto = $_.Exception.Message }
    } finally {
        try { $resp.Close() } catch { }
    }
}

function Elegir-Carpeta {
    Add-Type -AssemblyName System.Windows.Forms, System.Drawing
    # Una ventana invisible encima de todo, para que el selector no quede detrás del navegador
    $dueno = New-Object System.Windows.Forms.Form
    $dueno.TopMost = $true
    $dueno.ShowInTaskbar = $false
    $dueno.Opacity = 0
    $dueno.StartPosition = 'CenterScreen'
    $dueno.Size = New-Object System.Drawing.Size(1, 1)
    $dueno.Show()
    $dueno.Activate()
    try {
        $dialogo = New-Object System.Windows.Forms.FolderBrowserDialog
        $dialogo.Description = 'Carpeta donde guardar las copias'
        if (Test-Path -LiteralPath $cfg.Destino) { $dialogo.SelectedPath = $cfg.Destino }
        if ($dialogo.ShowDialog($dueno) -eq [System.Windows.Forms.DialogResult]::OK) { return $dialogo.SelectedPath }
        return ''
    } finally { $dueno.Close() }
}

function Atender($ctx) {
    $ruta = $ctx.Request.Url.AbsolutePath
    # La dirección lleva una clave al azar: ninguna otra página del navegador puede usar este script
    if (-not $ruta.StartsWith("/$token/")) { Responder $ctx 404 'text/plain; charset=utf-8' 'No encontrado'; return }
    $accion = $ruta.Substring($token.Length + 2)
    $esPost = $ctx.Request.HttpMethod -eq 'POST'

    if ($accion -eq '') {
        $html = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'interfaz.html'), [Text.Encoding]::UTF8)
        Responder $ctx 200 'text/html; charset=utf-8' $html
    } elseif ($accion -eq 'config') {
        Responder-Json $ctx (Config-Publica)
    } elseif ($accion -eq 'traer' -and $esPost) {
        Atender-Traer $ctx
    } elseif ($accion -eq 'abrir' -and $esPost) {
        $c = $script:ultimaCarpeta
        if (-not $c) { $c = $cfg.Destino }
        if ($c -and (Test-Path -LiteralPath $c)) { Invoke-Item -LiteralPath $c; Responder-Json $ctx @{ ok = $true } }
        else { Responder-Json $ctx @{ error = 'La carpeta todavía no existe: se crea al traer los archivos.' } }
    } elseif ($accion -eq 'elegir' -and $esPost) {
        try { Responder-Json $ctx @{ destino = (Elegir-Carpeta) } }
        catch { Responder-Json $ctx @{ error = 'No se pudo abrir el selector de carpetas; escribe la ruta a mano.' } }
    } elseif ($accion -eq 'latido' -and $esPost) {
        Responder-Json $ctx @{ ok = $true }
    } elseif ($accion -eq 'cerrar' -and $esPost) {
        Responder-Json $ctx @{ ok = $true }
        $script:seguir = $false
    } else {
        Responder $ctx 404 'text/plain; charset=utf-8' 'No encontrado'
    }
}

$token = [guid]::NewGuid().ToString('N')
$libre = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
$libre.Start()
$puertoWeb = $libre.LocalEndpoint.Port
$libre.Stop()

$http = New-Object System.Net.HttpListener
$http.Prefixes.Add("http://localhost:$puertoWeb/")
$http.Start()
$url = "http://localhost:$puertoWeb/$token/"
if ($NoAbrir) { Write-Host $url } else { Start-Process $url }

$script:ultimaCarpeta = $null
$script:seguir = $true
$ultimo = Get-Date
try {
    while ($script:seguir) {
        $tarea = $http.GetContextAsync()
        # La página avisa cada 30 s que sigue abierta; 5 minutos sin noticias = se cerró, y el script termina
        while (-not $tarea.Wait(1000)) {
            if (((Get-Date) - $ultimo).TotalMinutes -ge 5) { $script:seguir = $false; break }
        }
        if (-not $script:seguir) { break }
        $ctx = $tarea.Result
        $ultimo = Get-Date
        try { Atender $ctx }
        catch { try { Responder $ctx 500 'text/plain; charset=utf-8' "$_" } catch { } }
        $ultimo = Get-Date
    }
} finally {
    $http.Stop()
}
