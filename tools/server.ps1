param(
  [int]$Port = 8080,
  [string]$AudioSourceDir = "G:\Meu Drive\05. Documentos Pessoais\01. Documentos Felipe\01. SETs_Eletronico"
)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Servidor Sr.L rodando em http://localhost:$Port/"
Write-Host "Pasta de áudio vinculada: $AudioSourceDir"

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".webp" = "image/webp"
  ".mp3"  = "audio/mpeg"
}

$root = (Split-Path -Parent $PSScriptRoot)

function Send-FileWithRange($req, $res, [string]$filePath, [string]$contentType) {
  $fileInfo = New-Object System.IO.FileInfo($filePath)
  $totalBytes = $fileInfo.Length

  $res.ContentType = $contentType
  $res.AddHeader("Accept-Ranges", "bytes")
  if ($req.QueryString["dl"] -eq "1") {
    $safeName = [System.IO.Path]::GetFileName($filePath)
    $res.AddHeader("Content-Disposition", "attachment; filename=`"$safeName`"")
  }

  $rangeHeader = $req.Headers["Range"]
  $start = 0
  $end = $totalBytes - 1

  if ($rangeHeader -and $rangeHeader -match "bytes=(\d*)-(\d*)") {
    if ($Matches[1]) { $start = [int64]$Matches[1] }
    if ($Matches[2]) { $end = [int64]$Matches[2] }
    if ($end -ge $totalBytes) { $end = $totalBytes - 1 }

    $length = $end - $start + 1
    $res.StatusCode = 206
    $res.AddHeader("Content-Range", "bytes $start-$end/$totalBytes")
    $res.ContentLength64 = $length
  } else {
    $res.StatusCode = 200
    $res.ContentLength64 = $totalBytes
  }

  $fs = [System.IO.File]::OpenRead($filePath)
  try {
    if ($start -gt 0) { [void]$fs.Seek($start, [System.IO.SeekOrigin]::Begin) }
    $buffer = New-Object byte[] 65536
    $remaining = if ($res.StatusCode -eq 206) { $end - $start + 1 } else { $totalBytes }

    while ($remaining -gt 0) {
      $toRead = [int][Math]::Min([int64]$buffer.Length, $remaining)
      $read = $fs.Read($buffer, 0, $toRead)
      if ($read -le 0) { break }
      $res.OutputStream.Write($buffer, 0, $read)
      $remaining -= $read
    }
  } catch {
    # Cliente pode ter fechado a conexao ao seekar
  } finally {
    $fs.Close()
  }
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response

    try {
      $path = $req.Url.LocalPath.TrimStart('/')
      if (-not $path) { $path = "index.html" }

      # Rota para streaming dos arquivos de áudio locais
      if ($path.StartsWith("audio/")) {
        $audioFile = [System.Uri]::UnescapeDataString($path.Substring(6))
        $audioLocalPath = [System.IO.Path]::Combine($AudioSourceDir, $audioFile)

        if ([System.IO.File]::Exists($audioLocalPath)) {
          Send-FileWithRange $req $res $audioLocalPath "audio/mpeg"
        } else {
          $res.StatusCode = 404
          $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Audio Not Found")
          $res.OutputStream.Write($msg, 0, $msg.Length)
        }
      } else {
        # Rota de arquivos estáticos do site
        $localPath = [System.IO.Path]::Combine($root, ($path -replace '/', '\'))
        if ([System.IO.File]::Exists($localPath)) {
          $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
          $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
          $bytes = [System.IO.File]::ReadAllBytes($localPath)
          $res.ContentType = $mime
          $res.ContentLength64 = $bytes.Length
          $res.StatusCode = 200
          $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
          $res.StatusCode = 404
          $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
          $res.OutputStream.Write($msg, 0, $msg.Length)
        }
      }
    } catch {
      $res.StatusCode = 500
    } finally {
      $res.Close()
    }
  }
} finally {
  $listener.Stop()
}
