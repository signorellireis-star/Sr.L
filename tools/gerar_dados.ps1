<#
  Sr.L - Gerador de dados do site
  ---------------------------------
  Le a pasta de SETs (Google Drive sincronizado no PC) e gera:
    - data/sets-data.json  (numero, titulo, generos, duracao, bitrate, capa, IDs do Drive, tracklist)
    - assets/covers/set-XXX.jpg  (capas extraidas do ID3 dos MP3, redimensionadas)

  Reexecutar e seguro: tracklists e IDs ja preenchidos no JSON sao PRESERVADOS.

  IDs do Google Drive (necessarios para tocar/baixar) podem vir de:
    -IdsCsv   : CSV exportado da planilha do Apps Script (colunas Nome_Arquivo, ID_Google_Drive)
    -ApiKey + -FolderId : listagem automatica via Google Drive API (pasta publica)

  Exemplos:
    powershell -ExecutionPolicy Bypass -File tools\gerar_dados.ps1
    powershell -ExecutionPolicy Bypass -File tools\gerar_dados.ps1 -IdsCsv "C:\caminho\links.csv"
    powershell -ExecutionPolicy Bypass -File tools\gerar_dados.ps1 -ApiKey "AIza..." -FolderId "1AbC..."
#>
param(
  [string]$SourceDir = "G:\Meu Drive\05. Documentos Pessoais\01. Documentos Felipe\01. SETs_Eletronico",
  [string]$ProjectDir = (Split-Path -Parent $PSScriptRoot),
  [string]$IdsCsv = "",
  [string]$ApiKey = "",
  [string]$FolderId = "",
  [int]$CoverSize = 600,
  [switch]$SkipCovers
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$dataDir   = Join-Path $ProjectDir "data"
$coversDir = Join-Path $ProjectDir "assets\covers"
$jsonPath  = Join-Path $dataDir "sets-data.json"
New-Item -ItemType Directory -Force -Path $dataDir, $coversDir | Out-Null

# ---------------------------------------------------------------- helpers
function Get-SyncSafe([byte[]]$b, [int]$o) {
  return ($b[$o] -shl 21) -bor ($b[$o+1] -shl 14) -bor ($b[$o+2] -shl 7) -bor $b[$o+3]
}
function Get-Int32BE([byte[]]$b, [int]$o) {
  return ([int64]$b[$o] -shl 24) -bor ($b[$o+1] -shl 16) -bor ($b[$o+2] -shl 8) -bor $b[$o+3]
}

# Extrai a imagem APIC/PIC do ID3v2. Retorna byte[] ou $null.
function Get-Id3Cover([string]$path) {
  $fs = [System.IO.File]::OpenRead($path)
  try {
    $hdr = New-Object byte[] 10
    if ($fs.Read($hdr, 0, 10) -lt 10) { return $null }
    if ([System.Text.Encoding]::ASCII.GetString($hdr, 0, 3) -ne "ID3") { return $null }
    $ver = $hdr[3]
    $tagSize = Get-SyncSafe $hdr 6
    $tag = New-Object byte[] $tagSize
    $read = 0
    while ($read -lt $tagSize) {
      $n = $fs.Read($tag, $read, $tagSize - $read)
      if ($n -le 0) { break }
      $read += $n
    }
  } finally { $fs.Close() }

  $pos = 0
  # pula extended header se existir
  if (($hdr[5] -band 0x40) -ne 0 -and $ver -ge 3) {
    if ($ver -eq 4) { $pos = Get-SyncSafe $tag 0 } else { $pos = (Get-Int32BE $tag 0) + 4 }
  }

  $idLen = 4; $hdrLen = 10
  if ($ver -eq 2) { $idLen = 3; $hdrLen = 6 }

  while ($pos + $hdrLen -lt $tag.Length) {
    $id = [System.Text.Encoding]::ASCII.GetString($tag, $pos, $idLen)
    if ($id[0] -eq [char]0) { break }
    if ($ver -eq 2) {
      $size = ($tag[$pos+3] -shl 16) -bor ($tag[$pos+4] -shl 8) -bor $tag[$pos+5]
    } elseif ($ver -eq 4) {
      $size = Get-SyncSafe $tag ($pos + 4)
    } else {
      $size = Get-Int32BE $tag ($pos + 4)
    }
    $start = $pos + $hdrLen
    if ($size -le 0 -or $start + $size -gt $tag.Length) { break }

    if ($id -eq "APIC" -or $id -eq "PIC") {
      $p = $start
      $enc = $tag[$p]; $p++
      if ($id -eq "PIC") { $p += 3 }                       # formato "JPG"/"PNG"
      else { while ($tag[$p] -ne 0) { $p++ }; $p++ }       # mime terminado em 0
      $p++                                                 # tipo da imagem
      if ($enc -eq 1 -or $enc -eq 2) {                     # UTF-16: termina em 00 00
        while (-not ($tag[$p] -eq 0 -and $tag[$p+1] -eq 0)) { $p += 2 }
        $p += 2
      } else {
        while ($tag[$p] -ne 0) { $p++ }
        $p++
      }
      $len = $start + $size - $p
      if ($len -gt 100) {
        $img = New-Object byte[] $len
        [Array]::Copy($tag, $p, $img, 0, $len)
        return ,$img
      }
    }
    $pos = $start + $size
  }
  return $null
}

function Save-Cover([byte[]]$bytes, [string]$outPath, [int]$size) {
  $ms = New-Object System.IO.MemoryStream(,$bytes)
  try {
    $src = [System.Drawing.Image]::FromStream($ms)
  } catch { return $false }
  try {
    $side = [Math]::Min($src.Width, $src.Height)
    $target = [Math]::Min($size, $side)
    $bmp = New-Object System.Drawing.Bitmap($target, $target)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $sx = [int](($src.Width - $side) / 2); $sy = [int](($src.Height - $side) / 2)
    $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $target, $target)),
                 (New-Object System.Drawing.Rectangle($sx, $sy, $side, $side)),
                 [System.Drawing.GraphicsUnit]::Pixel)
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)
    $bmp.Save($outPath, $codec, $ep)
    $g.Dispose(); $bmp.Dispose()
    return $true
  } finally { $src.Dispose(); $ms.Dispose() }
}

# Generos derivados do nome do arquivo (ordem = ordem em que aparecem no nome)
function Get-Genres([string]$label) {
  $l = $label.ToLower()
  $rules = [ordered]@{
    "Psytrance"        = "psy"
    "Full On"          = "full[\s-]?on"
    "Uplifting Trance" = "uplif"
    "Tech Trance"      = "tech[\s-]?trance|khomha"
    "Progressive"      = "progressive|prog|anjuna"
    "Electro House"    = "electro"
    "House & Deep"     = "deep|house|disco|beach"
    "Minimal"          = "minimal"
    "Underground"      = "underground"
    "Hard"             = "\bhard\b"
  }
  $found = @()
  foreach ($k in $rules.Keys) {
    if ($k -eq "House & Deep" -and $l -match "electro-house|electro house") {
      $l2 = $l -replace "electro[\s-]house", ""
      $m = [regex]::Match($l2, $rules[$k])
    } else {
      $m = [regex]::Match($l, $rules[$k])
    }
    if ($m.Success) { $found += [pscustomobject]@{ g = $k; i = $m.Index } }
  }
  $trance = [regex]::Match($l, "trance")
  $hasSubTrance = $found | Where-Object { $_.g -in @("Psytrance", "Uplifting Trance", "Tech Trance") }
  if ($trance.Success -and -not $hasSubTrance) { $found += [pscustomobject]@{ g = "Trance"; i = $trance.Index } }
  if ($l -match "warm|tribute|bonus|gostoso|vs" -and -not $found) { $found += [pscustomobject]@{ g = "Trance"; i = 999 } }
  if (-not $found) { return @("Mix") }
  return @($found | Sort-Object i | ForEach-Object { $_.g } | Select-Object -Unique)
}

function Get-Tags([string]$label) {
  $l = $label.ToLower(); $t = @()
  if ($l -match "warm") { $t += "Warm-Up" }
  if ($l -match "tribute") { $t += "Tribute" }
  if ($l -match "bonus") { $t += "Bonus" }
  if ($l -match "beach") { $t += "Beach" }
  if ($l -match "nostalgia") { $t += "Nostalgia" }
  if ($l -match "special|khomha") { $t += "Special" }
  return $t
}

function Get-CleanLabel([string]$name) {
  $base = [System.IO.Path]::GetFileNameWithoutExtension($name)
  $label = $base -replace "^SET\s*\d+\s*-?\s*", ""
  $label = $label -replace "Felipe\s+Signorell?i(\s+Reis)?", ""
  $label = $label -replace "\d{3}\s*kbps", ""
  $label = $label -replace "_", " "
  $label = ($label -replace "\s{2,}", " ").Trim(" ", "-")
  return $label
}

function Format-Duration([string]$hms) {
  if ($hms -notmatch "(\d+):(\d+):(\d+)") { return "" }
  $h = [int]$Matches[1]; $m = [int]$Matches[2]
  if ($h -gt 0) { return "{0}h {1:D2}m" -f $h, $m }
  return "{0}m" -f $m
}

# ---------------------------------------------------------------- dados existentes
$existing = @{}
if (Test-Path $jsonPath) {
  $old = Get-Content -Raw -Encoding UTF8 $jsonPath | ConvertFrom-Json
  foreach ($o in $old) { $existing[[int]$o.number] = $o }
}

# ---------------------------------------------------------------- IDs do Drive
$idMap = @{}
if ($IdsCsv -and (Test-Path $IdsCsv)) {
  $delim = ","
  if ((Get-Content $IdsCsv -TotalCount 1) -match ";") { $delim = ";" }
  Import-Csv $IdsCsv -Delimiter $delim | ForEach-Object { $idMap[$_.Nome_Arquivo.Trim()] = $_.ID_Google_Drive.Trim() }
  Write-Host "IDs lidos do CSV: $($idMap.Count)"
}
if ($ApiKey -and $FolderId) {
  $token = $null
  do {
    $q = [uri]::EscapeDataString("'$FolderId' in parents and trashed = false")
    $url = "https://www.googleapis.com/drive/v3/files?q=$q&fields=nextPageToken,files(id,name)&pageSize=1000&key=$ApiKey"
    if ($token) { $url += "&pageToken=$token" }
    $r = Invoke-RestMethod -Uri $url -Headers @{ Referer = "https://signorellireis-star.github.io/" }
    foreach ($f in $r.files) { $idMap[$f.name.Trim()] = $f.id }
    $token = $r.nextPageToken
  } while ($token)
  Write-Host "IDs obtidos pela API: $($idMap.Count)"
}

# ---------------------------------------------------------------- processamento
$shell = New-Object -ComObject Shell.Application
$folder = $shell.Namespace($SourceDir)
$files = Get-ChildItem -LiteralPath $SourceDir -Filter *.mp3 -File

$sets = @()
$covers = 0
foreach ($f in $files) {
  if ($f.Name -notmatch "^SET\s*(\d+)") { Write-Warning "Ignorado: $($f.Name)"; continue }
  $num = [int]$Matches[1]
  $label = Get-CleanLabel $f.Name
  $item = $folder.ParseName($f.Name)
  $durRaw = $folder.GetDetailsOf($item, 27)
  $bitrate = ($folder.GetDetailsOf($item, 28) -replace "[^\d]", "")

  $coverRel = $null
  $coverFile = Join-Path $coversDir ("set-{0:D3}.jpg" -f $num)
  if (Test-Path $coverFile) {
    $coverRel = "assets/covers/set-{0:D3}.jpg" -f $num
  } elseif (-not $SkipCovers) {
    try {
      $img = Get-Id3Cover $f.FullName
      if ($img -and (Save-Cover $img $coverFile $CoverSize)) {
        $coverRel = "assets/covers/set-{0:D3}.jpg" -f $num; $covers++
      }
    } catch { Write-Warning "Capa falhou em $($f.Name): $_" }
  }

  $prev = $existing[$num]
  $fileId = ""
  if ($idMap.ContainsKey($f.Name)) { $fileId = $idMap[$f.Name] }
  elseif ($prev -and $prev.fileId) { $fileId = $prev.fileId }

  $tracklist = @()
  if ($prev -and $prev.tracklist) { $tracklist = @($prev.tracklist) }

  $displayLabel = $label
  if (-not $displayLabel) { $displayLabel = "Selected Mix" }

  $sets += [pscustomobject][ordered]@{
    number      = $num
    code        = "SET {0:D2}" -f $num
    title       = $displayLabel
    fileName    = $f.Name
    genres      = @(Get-Genres $label)
    tags        = @(Get-Tags $label)
    duration    = Format-Duration $durRaw
    durationRaw = $durRaw
    bitrate     = $(if ($bitrate) { "$bitrate kbps" } else { "" })
    sizeMB      = [math]::Round($f.Length / 1MB)
    fileId      = $fileId
    coverImage  = $coverRel
    tracklist   = $tracklist
  }
  Write-Host ("SET {0,3} | {1,-38} | {2,-8} | capa: {3}" -f $num, $displayLabel, (Format-Duration $durRaw), [bool]$coverRel)
}

$sets = $sets | Sort-Object number
$json = ConvertTo-Json -InputObject @($sets) -Depth 6
[System.IO.File]::WriteAllText($jsonPath, $json, (New-Object System.Text.UTF8Encoding($false)))

$withId = ($sets | Where-Object { $_.fileId }).Count
$withCover = ($sets | Where-Object { $_.coverImage }).Count
Write-Host ""
Write-Host "OK: $($sets.Count) sets -> $jsonPath"
Write-Host "    Capas: $withCover (novas nesta execucao: $covers) | Com ID do Drive: $withId"
