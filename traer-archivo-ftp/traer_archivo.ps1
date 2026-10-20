<#
  Trae el mismo archivo de varias máquinas de una sola vez, usando los sitios que ya están
  guardados en el Gestor de sitios de FileZilla (o una lista propia en CSV).
  Cada copia queda como <sitio>_<archivo> en descargas\<fecha_hora>\, junto con resumen.csv.
  Ver LEEME.md.
#>
param(
    # Ruta del archivo en cada máquina, tal como se ve en FileZilla. Varios: '/log/a.txt','/log/b.txt'
    [string[]]$Archivo = @('/log/alarmas.txt'),

    # Solo los sitios dentro de esta carpeta del Gestor de sitios ('' = todos)
    [string]$Carpeta = '',

    # Solo los sitios cuyo nombre coincida; admite comodines, p. ej. 'LGV*'
    [string]$Sitios = '*',

    # Lista propia de máquinas (CSV separado por ;) en lugar de los sitios de FileZilla
    [string]$Lista = '',

    # Dónde se guardan las copias
    [string]$Destino = (Join-Path $PSScriptRoot 'descargas'),

    # Segundos de espera por máquina antes de darla por apagada
    [int]$Espera = 10,

    # Abrir la carpeta con las copias al terminar
    [switch]$AbrirCarpeta,

    [string]$GestorSitios = "$env:APPDATA\FileZilla\sitemanager.xml"
)

$ErrorActionPreference = 'Stop'
# Windows PowerShell 5.1 no siempre ofrece TLS 1.2, que piden los servidores FTP con TLS actuales
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

function Leer-Campo($nodo, $campo) {
    $n = $nodo.SelectSingleNode($campo)
    if ($n) { return $n.InnerText.Trim() }
    return ''
}

function Nueva-Maquina($nombre, $protocolo, $servidor, $puerto, $usuario, $contrasena) {
    if (-not $puerto -or $puerto -eq '0') {
        if ($protocolo -eq 'sftp') { $puerto = 22 } elseif ($protocolo -eq 'ftps') { $puerto = 990 } else { $puerto = 21 }
    }
    [pscustomobject]@{
        Nombre = $nombre; Protocolo = $protocolo; Servidor = $servidor; Puerto = [int]$puerto
        Usuario = $usuario; Contrasena = $contrasena; Activo = $false; ClavePrivada = ''; Problema = ''
    }
}

function Leer-FileZilla {
    if (-not (Test-Path -LiteralPath $GestorSitios)) {
        throw "No encuentro el Gestor de sitios de FileZilla en $GestorSitios"
    }
    $xml = New-Object System.Xml.XmlDocument
    $xml.Load($GestorSitios)
    # Códigos de protocolo de FileZilla: 0 FTP, 6 FTP sin cifrar, 4 FTP con TLS explícito, 3 FTPS implícito, 1 SFTP
    $protocolos = @{ '0' = 'ftp'; '6' = 'ftp'; '4' = 'ftpes'; '3' = 'ftps'; '1' = 'sftp' }

    foreach ($s in $xml.SelectNodes('//Server')) {
        $carpetas = @()
        for ($p = $s.ParentNode; $p -ne $null -and $p.Name -eq 'Folder'; $p = $p.ParentNode) {
            $texto = $p.SelectSingleNode('text()')
            if ($texto) { $carpetas += $texto.Value.Trim() }
        }
        $servidor = Leer-Campo $s 'Host'
        $nombre = Leer-Campo $s 'Name'
        if (-not $nombre) { $nombre = $servidor }
        if ($Carpeta -and ($carpetas -notcontains $Carpeta)) { continue }
        if ($nombre -notlike $Sitios) { continue }

        $codigo = Leer-Campo $s 'Protocol'
        $protocolo = $protocolos[$codigo]
        $m = Nueva-Maquina $nombre $protocolo $servidor (Leer-Campo $s 'Port') (Leer-Campo $s 'User') $null
        $m.Activo = (Leer-Campo $s 'PasvMode') -eq 'MODE_ACTIVE'
        $m.ClavePrivada = Leer-Campo $s 'Keyfile'

        $pass = $s.SelectSingleNode('Pass')
        if ($pass) {
            switch ($pass.GetAttribute('encoding')) {
                'base64' { $m.Contrasena = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($pass.InnerText)) }
                'crypt'  { $m.Problema = 'FileZilla guarda la contraseña con contraseña maestra; usar una lista CSV (ver LEEME)' }
                default  { $m.Contrasena = $pass.InnerText }
            }
        }
        if ((Leer-Campo $s 'Logontype') -eq '0') { $m.Usuario = 'anonymous'; $m.Contrasena = 'anonymous@' }
        if (-not $protocolo) { $m.Problema = "protocolo de FileZilla no soportado (código $codigo)" }
        $m
    }
}

function Leer-Lista {
    foreach ($fila in (Import-Csv -LiteralPath $Lista -Delimiter ';' -Encoding UTF8)) {
        if (-not $fila.Host) { continue }
        $nombre = $fila.Nombre
        if (-not $nombre) { $nombre = $fila.Host }
        if ($nombre -notlike $Sitios) { continue }
        $protocolo = ('' + $fila.Protocolo).Trim().ToLower()
        if (-not $protocolo) { $protocolo = 'ftp' }
        $m = Nueva-Maquina $nombre $protocolo $fila.Host.Trim() $fila.Puerto $fila.Usuario $fila.Contrasena
        if (-not $m.Contrasena) { $m.Contrasena = $null }
        if (@('ftp', 'ftpes', 'ftps', 'sftp') -notcontains $protocolo) { $m.Problema = "protocolo desconocido '$protocolo'" }
        $m
    }
}

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
    $req.UsePassive = -not $m.Activo
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
    $clave = ''
    if ($m.ClavePrivada) { $clave = ' -privatekey="{0}"' -f $m.ClavePrivada }
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

# --- Programa ---

# Desde la línea de comandos (o el .bat) varios archivos llegan como un solo texto 'a,b'
$Archivo = @($Archivo -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })

if ($Lista) { $maquinas = @(Leer-Lista) } else { $maquinas = @(Leer-FileZilla) }
if ($maquinas.Count -eq 0) {
    throw 'No hay ninguna máquina que coincida con la carpeta o el nombre pedidos.'
}

$carpetaSalida = Join-Path $Destino (Get-Date -Format 'yyyy-MM-dd_HHmm')
New-Item -ItemType Directory -Force -Path $carpetaSalida | Out-Null
Write-Host ("Trayendo {0} de {1} máquina(s) a {2}" -f ($Archivo -join ', '), $maquinas.Count, $carpetaSalida)
Write-Host ''

$resultados = foreach ($m in $maquinas) {
    foreach ($remoto in $Archivo) {
        $base = (Nombre-Valido $m.Nombre) + '_' + (Nombre-Valido ($remoto -split '/')[-1])
        $local = Join-Path $carpetaSalida $base
        for ($n = 2; Test-Path -LiteralPath $local; $n++) {
            $local = Join-Path $carpetaSalida ('{0}_{1}{2}' -f [IO.Path]::GetFileNameWithoutExtension($base), $n, [IO.Path]::GetExtension($base))
        }
        $parcial = "$local.parcial"
        $copia = ''
        try {
            if ($m.Problema) { throw $m.Problema }
            if ($null -eq $m.Contrasena) {
                $segura = Read-Host "Contraseña de $($m.Usuario) en $($m.Nombre)" -AsSecureString
                $m.Contrasena = (New-Object System.Net.NetworkCredential('', $segura)).Password
            }
            if ($m.Protocolo -eq 'sftp' -or $m.Protocolo -eq 'ftps') { Bajar-WinScp $m $remoto $parcial }
            else { Bajar-Ftp $m $remoto $parcial }
            Move-Item -LiteralPath $parcial -Destination $local
            $tamano = (Get-Item -LiteralPath $local).Length
            $estado = 'OK'
            $detalle = '{0:N0} bytes' -f $tamano
            $copia = Split-Path $local -Leaf
            Write-Host ('  OK     {0,-20} {1}  ({2})' -f $m.Nombre, $copia, $detalle) -ForegroundColor Green
        } catch {
            Remove-Item -LiteralPath $parcial -Force -ErrorAction SilentlyContinue
            $estado = 'FALLO'
            $detalle = Explicar-Error $_.Exception
            Write-Host ('  FALLO  {0,-20} {1}: {2}' -f $m.Nombre, $remoto, $detalle) -ForegroundColor Red
        }
        [pscustomobject]@{
            Maquina = $m.Nombre; Servidor = $m.Servidor; Archivo = $remoto
            Resultado = $estado; Detalle = $detalle; Copia = $copia
        }
    }
}

$resultados | Export-Csv -LiteralPath (Join-Path $carpetaSalida 'resumen.csv') -Delimiter ';' -Encoding UTF8 -NoTypeInformation
$fallos = @($resultados | Where-Object { $_.Resultado -ne 'OK' }).Count
Write-Host ''
Write-Host ('Listo: {0} bien, {1} con fallo. Resumen en resumen.csv' -f (@($resultados).Count - $fallos), $fallos)
if ($AbrirCarpeta) { Invoke-Item -LiteralPath $carpetaSalida }
if ($fallos -gt 0) { exit 1 }
