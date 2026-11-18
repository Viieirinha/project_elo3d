# Instala o agente ELO 3D como TAREFA AGENDADA do Windows:
#   - inicia sozinho quando você entra no Windows e roda escondido (sem janela);
#   - se o agente parar por qualquer motivo, o Windows o reinicia em 1 minuto.
#
# Como usar (PowerShell, dentro da pasta "agente"):
#   powershell -ExecutionPolicy Bypass -File .\instalar-windows.ps1            # instala e inicia
#   powershell -ExecutionPolicy Bypass -File .\instalar-windows.ps1 -Remover   # desinstala
#
# AVISO: este script NÃO foi testado em um Windows real (foi escrito sem acesso a uma máquina Windows).
# Se algo falhar, rode o agente manualmente com "node src\index.js" e me envie a mensagem de erro.
param([switch]$Remover)
$ErrorActionPreference = 'Stop'
$nome = 'ELO3D Agente'
$pasta = $PSScriptRoot

if ($Remover) {
  Stop-ScheduledTask -TaskName $nome -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $nome -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host 'Tarefa removida.'
  exit 0
}

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { throw 'Node.js não encontrado. Instale a versão LTS em https://nodejs.org e execute este script de novo.' }
if (-not (Test-Path (Join-Path $pasta '.env'))) { throw "Arquivo .env não encontrado em $pasta. Copie .env.example para .env e preencha os valores." }

# Roda escondido; o agente grava o próprio registro em agente.log (nesta pasta).
$comando = "& '$node' 'src\index.js'"
$acao = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -Command `"$comando`"" -WorkingDirectory $pasta
$gatilho = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$config = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $nome -Action $acao -Trigger $gatilho -Settings $config -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName $nome

Write-Host ''
Write-Host 'Agente instalado e iniciado.' -ForegroundColor Green
Write-Host "Acompanhe em: $pasta\agente.log"
Write-Host 'Para desinstalar: .\instalar-windows.ps1 -Remover'
