$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir
$git = "C:\Users\Felipe_Reis\AppData\Local\Programs\Git\cmd\git.exe"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Sr.L - Enviando projeto para o GitHub" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Adiciona todos os arquivos modificados
& $git add -A

# Se houver mudanças pendentes, comita
$status = & $git status --porcelain
if ($status) {
  $mensagem = Read-Host "Digite uma descricao para a alteracao (ou Enter para padrao)"
  if (-not $mensagem) {
    $mensagem = "Atualizacao do acervo e site Sr.L"
  }
  & $git commit -m $mensagem
} else {
  Write-Host "Nenhuma alteracao pendente para comitar." -ForegroundColor Yellow
}

Write-Host "Enviando para o GitHub (branch main)..." -ForegroundColor Green
& $git push -u origin main

Write-Host ""
Write-Host "Sucesso! O site foi enviado para o GitHub." -ForegroundColor Green
Write-Host "Acesse: https://github.com/signorellireis-star/Sr.L"
