<#
  Trae el mismo archivo de una serie de máquinas, como en FileZilla pero de una vez:
  se escriben las IP (sueltas o en rangos), el usuario, la contraseña y la ruta del archivo,
  y cada copia queda numerada en orden en <destino>\<fecha_hora>\, junto con resumen.csv.
  Sin parámetros abre la ventana; con -SinVentana trabaja en la consola. Ver LEEME.md.
#>
param(
    # Trabajar sin ventana (para el Programador de tareas). Lo que no se indique sale de la última vez en la ventana
    [switch]$SinVentana,

    # IP separadas por coma; rangos 192.168.1.101-120 o 192.168.1.250-192.168.2.10
    [string]$Ips,

    [string]$Usuario,
    [string]$Contrasena,

    [ValidateSet('ftp', 'ftpes', 'ftps', 'sftp')]
    [string]$Protocolo,

    [int]$Puerto,

    # Ruta del archivo en cada máquina, como se ve en FileZilla. Varios separados por coma
    [string]$Archivo,

    # Carpeta de este PC donde se guardan las copias
    [string]$Destino,

    # Segundos de espera por máquina antes de darla por apagada
    [int]$Espera = 10
)

$ErrorActionPreference = 'Stop'
# Windows PowerShell 5.1 no siempre ofrece TLS 1.2, que piden los servidores FTP con TLS actuales
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$rutaConfig = Join-Path $PSScriptRoot 'traer_archivo.config.json'
$puertosPorDefecto = @{ ftp = 21; ftpes = 21; ftps = 990; sftp = 22 }

# La configuración de la última vez; la contraseña va cifrada para el usuario de Windows actual
function Leer-Config {
    $cfg = [pscustomobject]@{
        Ips = ''; Usuario = ''; Contrasena = ''; Protocolo = 'ftp'; Puerto = 21
        Archivo = '/log/alarmas.txt'; Destino = (Join-Path $PSScriptRoot 'descargas')
    }
    if (Test-Path -LiteralPath $rutaConfig) {
        $guardada = Get-Content -LiteralPath $rutaConfig -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($campo in 'Ips', 'Usuario', 'Protocolo', 'Puerto', 'Archivo', 'Destino') {
            if ($null -ne $guardada.$campo -and "$($guardada.$campo)" -ne '') { $cfg.$campo = $guardada.$campo }
        }
        if ($guardada.ContrasenaCifrada) {
            try {
                $segura = ConvertTo-SecureString $guardada.ContrasenaCifrada
                $cfg.Contrasena = (New-Object System.Net.NetworkCredential('', $segura)).Password
            } catch { }  # guardada por otro usuario u otro PC: se vuelve a escribir
        }
    }
    $cfg
}

function Guardar-Config($cfg) {
    try {
        $cifrada = ''
        if ($cfg.Contrasena) { $cifrada = ConvertTo-SecureString $cfg.Contrasena -AsPlainText -Force | ConvertFrom-SecureString }
        [pscustomobject]@{
            Ips = $cfg.Ips; Usuario = $cfg.Usuario; ContrasenaCifrada = $cifrada; Protocolo = $cfg.Protocolo
            Puerto = $cfg.Puerto; Archivo = $cfg.Archivo; Destino = $cfg.Destino
        } | ConvertTo-Json | Set-Content -LiteralPath $rutaConfig -Encoding UTF8
    } catch { }  # si no se puede guardar, la próxima vez se vuelve a escribir
}

function Ip-ANumero($ip) {
    $o = $ip.Split('.') | ForEach-Object { [long]$_ }
    if (@($o | Where-Object { $_ -gt 255 }).Count) { throw "IP no válida: $ip" }
    return $o[0] * 16777216 + $o[1] * 65536 + $o[2] * 256 + $o[3]
}

function Numero-AIp([long]$n) {
    return '{0}.{1}.{2}.{3}' -f [math]::Floor($n / 16777216), ([math]::Floor($n / 65536) % 256), ([math]::Floor($n / 256) % 256), ($n % 256)
}

# '192.168.1.101-103, sftp://10.0.0.5' -> 192.168.1.101, .102, .103 con el protocolo elegido y 10.0.0.5 por SFTP
# (en el orden escrito, sin repetir). Como en FileZilla, cada una puede llevar protocolo:// delante y :puerto detrás
function Expandir-Ips($texto, $protocolo, $puerto) {
    $vistas = @{}
    foreach ($t in ($texto -split '[\s,;]+' | Where-Object { $_ })) {
        $original = $t
        $proto = $protocolo
        $puertoT = $puerto
        if ($t -match '^(ftp|ftpes|ftps|sftp)://(.+)$') {
            $proto = $matches[1].ToLower()
            $t = $matches[2].TrimEnd('/')
            if ($proto -ne $protocolo) { $puertoT = $puertosPorDefecto[$proto] }
        } elseif ($t -match '^\w*://') {
            throw "Protocolo no válido en $original (se puede usar ftp://, ftpes://, ftps:// o sftp://)"
        }
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
                [pscustomobject]@{ Ip = $ip; Protocolo = $proto; Puerto = $puertoT }
            }
        }
    }
}

# Prueba todas las máquinas a la vez, para no esperar una por una a las apagadas
function Probar-Conexion($maquinas, $alEsperar) {
    $intentos = foreach ($m in $maquinas) {
        $cliente = New-Object System.Net.Sockets.TcpClient
        $tarea = $null
        try { $tarea = $cliente.ConnectAsync($m.Ip, $m.Puerto) } catch { }
        [pscustomobject]@{ Clave = "$($m.Ip):$($m.Puerto)"; Cliente = $cliente; Tarea = $tarea }
    }
    $limite = (Get-Date).AddSeconds($Espera)
    while ((Get-Date) -lt $limite -and @($intentos | Where-Object { $_.Tarea -and -not $_.Tarea.IsCompleted }).Count) {
        Start-Sleep -Milliseconds 100
        if ($alEsperar) { & $alEsperar }
    }
    $responde = @{}
    foreach ($i in $intentos) {
        $responde[$i.Clave] = ($i.Tarea -and "$($i.Tarea.Status)" -eq 'RanToCompletion')
        $i.Cliente.Close()
    }
    $responde
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

# Recorre las máquinas en orden. $alAvisar recibe un texto de estado, $alTerminar cada resultado
function Traer-Todo($cfg, $alAvisar, $alTerminar) {
    $lista = @(Expandir-Ips $cfg.Ips $cfg.Protocolo $cfg.Puerto)
    $archivos = @($cfg.Archivo -split '[,;]' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    if ($lista.Count -eq 0) { throw 'Falta escribir las IP de las máquinas.' }
    if ($archivos.Count -eq 0) { throw 'Falta escribir la ruta del archivo a traer.' }

    $carpeta = Join-Path $cfg.Destino (Get-Date -Format 'yyyy-MM-dd_HHmm')
    New-Item -ItemType Directory -Force -Path $carpeta | Out-Null
    $usuario = $cfg.Usuario
    $contrasena = $cfg.Contrasena
    if (-not $usuario) { $usuario = 'anonymous'; $contrasena = 'anonymous@' }
    # 01_, 02_... para que el Explorador las muestre en el mismo orden que las IP
    $ancho = [math]::Max(2, ([string]$lista.Count).Length)

    & $alAvisar ('Probando la conexión con {0} máquina(s)...' -f $lista.Count)
    $responde = Probar-Conexion $lista { & $alAvisar $null }

    $resultados = @()
    $n = 0
    foreach ($maquina in $lista) {
        $n++
        $ip = $maquina.Ip
        $m = [pscustomobject]@{
            Servidor = $ip; Puerto = $maquina.Puerto; Protocolo = $maquina.Protocolo
            Usuario = $usuario; Contrasena = $contrasena
        }
        foreach ($remoto in $archivos) {
            & $alAvisar ('Trayendo {0} de {1}: {2}' -f $n, $lista.Count, $ip)
            $copia = '{0}_{1}_{2}' -f ([string]$n).PadLeft($ancho, '0'), (Nombre-Valido $ip), (Nombre-Valido ($remoto -split '/')[-1])
            $local = Join-Path $carpeta $copia
            $parcial = "$local.parcial"
            try {
                if (-not $responde["${ip}:$($m.Puerto)"]) { throw 'no responde (¿apagada o fuera de la red?)' }
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
                Numero = $n; IP = $ip; Protocolo = $m.Protocolo.ToUpper(); Archivo = $remoto; Resultado = $estado; Detalle = $detalle; Copia = $copia
            }
            $resultados += $r
            & $alTerminar $r
        }
    }
    $resultados | Export-Csv -LiteralPath (Join-Path $carpeta 'resumen.csv') -Delimiter ';' -Encoding UTF8 -NoTypeInformation
    $fallos = @($resultados | Where-Object { $_.Resultado -ne 'OK' }).Count
    & $alAvisar ('Listo: {0} bien, {1} con fallo.' -f ($resultados.Count - $fallos), $fallos)
    [pscustomobject]@{ Carpeta = $carpeta; Fallos = $fallos }
}

# --- Sin ventana ---

$cfg = Leer-Config
if ($SinVentana) {
    foreach ($campo in 'Ips', 'Usuario', 'Contrasena', 'Protocolo', 'Puerto', 'Archivo', 'Destino') {
        if ($PSBoundParameters.ContainsKey($campo)) { $cfg.$campo = $PSBoundParameters[$campo] }
    }
    if ($PSBoundParameters.ContainsKey('Protocolo') -and -not $PSBoundParameters.ContainsKey('Puerto')) {
        $cfg.Puerto = $puertosPorDefecto[$cfg.Protocolo]
    }
    if ($cfg.Usuario -and -not $cfg.Contrasena) {
        $segura = Read-Host "Contraseña de $($cfg.Usuario)" -AsSecureString
        $cfg.Contrasena = (New-Object System.Net.NetworkCredential('', $segura)).Password
    }
    $avisar = { param($texto) if ($texto) { Write-Host $texto } }
    $mostrar = {
        param($r)
        if ($r.Resultado -eq 'OK') { Write-Host ('  OK     {0,-16} {1}  ({2})' -f $r.IP, $r.Copia, $r.Detalle) -ForegroundColor Green }
        else { Write-Host ('  FALLO  {0,-16} {1}: {2}' -f $r.IP, $r.Archivo, $r.Detalle) -ForegroundColor Red }
    }
    $fin = Traer-Todo $cfg $avisar $mostrar
    Write-Host "Copias y resumen.csv en $($fin.Carpeta)"
    if ($fin.Fallos -gt 0) { exit 1 }
    exit 0
}

# --- Ventana ---

Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
# La consola queda oculta: cualquier error inesperado se muestra en un cuadro
trap {
    [void][System.Windows.Forms.MessageBox]::Show("$_", 'Traer archivo')
    break
}

$ventana = New-Object System.Windows.Forms.Form
$ventana.Text = 'Traer archivo de varias máquinas'
$ventana.ClientSize = New-Object System.Drawing.Size(760, 560)
$ventana.MinimumSize = New-Object System.Drawing.Size(620, 480)
$ventana.StartPosition = 'CenterScreen'
$ventana.Font = New-Object System.Drawing.Font('Segoe UI', 9)

function Nueva-Etiqueta($texto, $x, $y) {
    $e = New-Object System.Windows.Forms.Label
    $e.Text = $texto
    $e.AutoSize = $true
    $e.Location = New-Object System.Drawing.Point($x, ($y + 3))
    $ventana.Controls.Add($e)
    $e
}

function Nueva-Caja($x, $y, $ancho, $texto) {
    $c = New-Object System.Windows.Forms.TextBox
    $c.Location = New-Object System.Drawing.Point($x, $y)
    $c.Width = $ancho
    $c.Text = $texto
    $ventana.Controls.Add($c)
    $c
}

$arriba = [System.Windows.Forms.AnchorStyles]'Top, Left, Right'

[void](Nueva-Etiqueta 'Servidores (IP):' 12 12)
$cajaIps = Nueva-Caja 130 12 618 $cfg.Ips
$cajaIps.Multiline = $true
$cajaIps.ScrollBars = 'Vertical'
$cajaIps.Height = 48
$cajaIps.Anchor = $arriba
$ayuda = Nueva-Etiqueta 'Separadas por coma o una por línea. Rangos: 192.168.1.101-120. Otro protocolo: sftp://192.168.1.120-125' 130 62
$ayuda.ForeColor = [System.Drawing.Color]::Gray

$codigos = @('ftp', 'ftpes', 'ftps', 'sftp')
[void](Nueva-Etiqueta 'Protocolo:' 12 92)
$listaProtocolo = New-Object System.Windows.Forms.ComboBox
$listaProtocolo.DropDownStyle = 'DropDownList'
$listaProtocolo.Location = New-Object System.Drawing.Point(130, 92)
$listaProtocolo.Width = 230
[void]$listaProtocolo.Items.AddRange(@('FTP', 'FTP con TLS explícito', 'FTPS implícito', 'SFTP (necesita WinSCP)'))
$listaProtocolo.SelectedIndex = [math]::Max(0, [array]::IndexOf($codigos, $cfg.Protocolo))
$ventana.Controls.Add($listaProtocolo)
[void](Nueva-Etiqueta 'Puerto:' 380 92)
$cajaPuerto = Nueva-Caja 450 92 60 ([string]$cfg.Puerto)

[void](Nueva-Etiqueta 'Usuario:' 12 122)
$cajaUsuario = Nueva-Caja 130 122 230 $cfg.Usuario
[void](Nueva-Etiqueta 'Contraseña:' 380 122)
$cajaContrasena = Nueva-Caja 450 122 180 $cfg.Contrasena
$cajaContrasena.UseSystemPasswordChar = $true

[void](Nueva-Etiqueta 'Archivo remoto:' 12 152)
$cajaArchivo = Nueva-Caja 130 152 618 $cfg.Archivo
$cajaArchivo.Anchor = $arriba

[void](Nueva-Etiqueta 'Guardar en:' 12 182)
$cajaDestino = Nueva-Caja 130 182 528 $cfg.Destino
$cajaDestino.Anchor = $arriba
$botonElegir = New-Object System.Windows.Forms.Button
$botonElegir.Text = 'Elegir...'
$botonElegir.Location = New-Object System.Drawing.Point(664, 181)
$botonElegir.Width = 84
$botonElegir.Anchor = 'Top, Right'
$ventana.Controls.Add($botonElegir)

$botonTraer = New-Object System.Windows.Forms.Button
$botonTraer.Text = 'Traer archivos'
$botonTraer.Location = New-Object System.Drawing.Point(130, 216)
$botonTraer.Size = New-Object System.Drawing.Size(150, 30)
$ventana.Controls.Add($botonTraer)

$botonAbrir = New-Object System.Windows.Forms.Button
$botonAbrir.Text = 'Abrir carpeta'
$botonAbrir.Location = New-Object System.Drawing.Point(290, 216)
$botonAbrir.Size = New-Object System.Drawing.Size(120, 30)
$ventana.Controls.Add($botonAbrir)

$etiquetaEstado = Nueva-Etiqueta '' 420 222

$tabla = New-Object System.Windows.Forms.ListView
$tabla.View = 'Details'
$tabla.FullRowSelect = $true
$tabla.GridLines = $true
$tabla.Location = New-Object System.Drawing.Point(12, 258)
$tabla.Size = New-Object System.Drawing.Size(736, 290)
$tabla.Anchor = [System.Windows.Forms.AnchorStyles]'Top, Bottom, Left, Right'
[void]$tabla.Columns.Add('N°', 45)
[void]$tabla.Columns.Add('IP', 120)
[void]$tabla.Columns.Add('Protocolo', 65)
[void]$tabla.Columns.Add('Archivo', 140)
[void]$tabla.Columns.Add('Resultado', 70)
[void]$tabla.Columns.Add('Detalle', 275)
$ventana.Controls.Add($tabla)

$script:ultimaCarpeta = $null

# Al cambiar de protocolo se pone su puerto habitual, salvo que se haya escrito otro
$listaProtocolo.Add_SelectedIndexChanged({
    if (@('', '21', '22', '990') -contains $cajaPuerto.Text.Trim()) {
        $cajaPuerto.Text = [string]$puertosPorDefecto[$codigos[$listaProtocolo.SelectedIndex]]
    }
})

$botonElegir.Add_Click({
    $dialogo = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialogo.SelectedPath = $cajaDestino.Text
    if ($dialogo.ShowDialog() -eq 'OK') { $cajaDestino.Text = $dialogo.SelectedPath }
})

$botonAbrir.Add_Click({
    $c = $script:ultimaCarpeta
    if (-not $c) { $c = $cajaDestino.Text }
    if (Test-Path -LiteralPath $c) { Invoke-Item -LiteralPath $c }
})

$botonTraer.Add_Click({
    $puerto = 0
    if (-not [int]::TryParse($cajaPuerto.Text.Trim(), [ref]$puerto) -or $puerto -lt 1 -or $puerto -gt 65535) {
        [void][System.Windows.Forms.MessageBox]::Show('El puerto no es válido.', $ventana.Text)
        return
    }
    $cfg.Ips = $cajaIps.Text.Trim()
    $cfg.Protocolo = $codigos[$listaProtocolo.SelectedIndex]
    $cfg.Puerto = $puerto
    $cfg.Usuario = $cajaUsuario.Text.Trim()
    $cfg.Contrasena = $cajaContrasena.Text
    $cfg.Archivo = $cajaArchivo.Text.Trim()
    $cfg.Destino = $cajaDestino.Text.Trim()

    $botonTraer.Enabled = $false
    $tabla.Items.Clear()
    try {
        Guardar-Config $cfg
        $avisar = {
            param($texto)
            if ($texto) { $etiquetaEstado.Text = $texto }
            [System.Windows.Forms.Application]::DoEvents()
        }
        $mostrar = {
            param($r)
            $fila = New-Object System.Windows.Forms.ListViewItem([string]$r.Numero)
            [void]$fila.SubItems.Add($r.IP)
            [void]$fila.SubItems.Add($r.Protocolo)
            [void]$fila.SubItems.Add(($r.Archivo -split '/')[-1])
            [void]$fila.SubItems.Add($r.Resultado)
            $texto = $r.Detalle
            if ($r.Copia) { $texto = '{0} - {1}' -f $r.Copia, $r.Detalle }
            [void]$fila.SubItems.Add($texto)
            if ($r.Resultado -eq 'OK') { $fila.ForeColor = [System.Drawing.Color]::DarkGreen }
            else { $fila.ForeColor = [System.Drawing.Color]::Firebrick }
            [void]$tabla.Items.Add($fila)
            $fila.EnsureVisible()
            [System.Windows.Forms.Application]::DoEvents()
        }
        $fin = Traer-Todo $cfg $avisar $mostrar
        $script:ultimaCarpeta = $fin.Carpeta
    } catch {
        $etiquetaEstado.Text = ''
        [void][System.Windows.Forms.MessageBox]::Show($_.Exception.Message, $ventana.Text,
            [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
    } finally {
        $botonTraer.Enabled = $true
    }
})

[void]$ventana.ShowDialog()
