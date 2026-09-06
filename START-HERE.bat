@echo off
REM ---------------------------------------------------------------------
REM  Arvind Gupta — Portfolio
REM  Double-click this file to run the site on this computer.
REM  Installs dependencies the first time, then starts the dev server.
REM ---------------------------------------------------------------------

setlocal
cd /d "%~dp0"

echo.
echo  ============================================
echo   Arvind Gupta - Portfolio + AI Assistant
echo  ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [X] Node.js is not installed.
  echo.
  echo      Install the LTS version from https://nodejs.org
  echo      then double-click this file again.
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODEVER=%%v
echo  [ok] Node.js %NODEVER%

if not exist "node_modules" (
  echo.
  echo  [..] First run - installing dependencies. This takes 1-3 minutes.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  [X] Install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
) else (
  echo  [ok] Dependencies already installed
)

echo.
echo  [..] Starting the site at http://localhost:3000
echo       Your browser will open in a few seconds.
echo       Leave this window open while you use the site.
echo       Press Ctrl+C here to stop it.
echo.

start "" /b cmd /c "timeout /t 6 >nul && start http://localhost:3000"
call npm run dev

endlocal
