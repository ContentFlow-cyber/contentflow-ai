@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ContentFlow AI - a iniciar
echo.
echo  ContentFlow AI - iniciar o site no seu computador
echo  ================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo  [ERRO] O Node.js nao esta instalado.
  echo  Vai abrir o site para o descarregar. Instale a versao LTS e volte a abrir este ficheiro.
  start https://nodejs.org
  pause
  exit /b 1
)
if not exist ".env.local" (
  copy ".env.example" ".env.local" >nul
  echo  Criei o ficheiro .env.local. As chaves ficam por preencher: so as paginas publicas funcionam ate as preencher.
  echo.
)
if not exist "node_modules" (
  echo  A instalar as bibliotecas ^(so na primeira vez, pode demorar alguns minutos^)...
  call npm install
  if errorlevel 1 (
    echo.
    echo  [ERRO] A instalacao falhou. Copie as linhas com "error" acima e envie-as.
    pause
    exit /b 1
  )
)
echo.
echo  A iniciar. O navegador abre sozinho em alguns segundos: http://localhost:3000
echo  Para parar, feche esta janela ou carregue em Ctrl+C.
echo.
start "" cmd /c "timeout /t 10 >nul & start http://localhost:3000"
call npm run dev
pause
