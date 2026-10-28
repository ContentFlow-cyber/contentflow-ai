@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ContentFlow AI - verificar erros
where node >nul 2>nul
if errorlevel 1 (
  echo  O Node.js nao esta instalado. Instale-o em https://nodejs.org e tente de novo.
  pause
  exit /b 1
)
if not exist "node_modules" call npm install
echo  A verificar o codigo ^(typecheck^)...
call npm run typecheck > verificacao.txt 2>&1
echo  A testar a compilacao ^(build^)...
call npm run build >> verificacao.txt 2>&1
echo.
echo  Pronto. Abra o ficheiro "verificacao.txt" desta pasta e envie-me o conteudo.
echo  Se aparecer so "Compiled successfully" e nenhum "error", esta tudo bem.
pause
