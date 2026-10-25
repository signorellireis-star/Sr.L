# Instala MinGit (oficial, portátil, sem necessidade de privilégios de administrador)
$ErrorActionPreference = 'Stop'

$targetDir = Join-Path $env:LOCALAPPDATA "Programs\Git"
$zipPath = Join-Path $env:TEMP "mingit.zip"

Write-Host "Verificando versão mais recente do Git portátil..."
$release = Invoke-RestMethod -Uri 'https://api.github.com/repos/git-for-windows/git/releases/latest' -Headers @{ 'User-Agent' = 'PowerShell' }
$asset = $release.assets | Where-Object { $_.name -like 'MinGit-*-64-bit.zip' } | Select-Object -First 1

if (-not $asset) {
  throw "Não foi possível localizar o asset MinGit no GitHub."
}

Write-Host "Baixando $($asset.name)..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath

Write-Host "Extraindo para $targetDir..."
if (Test-Path $targetDir) {
  Remove-Item -Path $targetDir -Recurse -Force
}
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
Expand-Archive -Path $zipPath -DestinationPath $targetDir -Force
Remove-Item -Path $zipPath -Force

# Adiciona ao PATH do usuário permanente
$userPath = [Environment]::GetEnvironmentVariable('Path', [EnvironmentVariableTarget]::User)
$cmdDir = Join-Path $targetDir "cmd"
if ($userPath -notlike "*$cmdDir*") {
  [Environment]::SetEnvironmentVariable('Path', "$cmdDir;$userPath", [EnvironmentVariableTarget]::User)
}

# Atualiza PATH na sessão atual
$env:Path = "$cmdDir;$env:Path"

Write-Host "Git instalado com sucesso!"
& git --version
