@echo off
REM Roda o agente com a janela aberta (útil para testar antes de instalar como tarefa agendada).
cd /d "%~dp0"
node src\index.js
pause
