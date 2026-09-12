@echo off
title Arvind Portfolio - Push to GitHub
color 0B

REM ---------------------------------------------------------------------------
REM  Pushes this repository to GitHub, which is also what deploys it.
REM
REM  Why this file exists:
REM  The push has to run on Windows. Git reads the GitHub token from the Windows
REM  Credential Manager, and nothing outside Windows can see it - which is why a
REM  push attempted from anywhere else fails with "could not read Username".
REM
REM  Vercel is connected to the GitHub repository, not to this folder. So there
REM  is no separate deploy step: the push is the deploy. Vercel sees the new
REM  commit on main and builds it.
REM ---------------------------------------------------------------------------

cd /d "%~dp0"

echo.
echo   ================================================================
echo     Push to GitHub  ^(this is also the deploy^)
echo   ================================================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo   [X] This folder is not a git repository.
  echo       Expected to be run from D:\ArvindPortfolio\portfolio
  pause
  exit /b 1
)

REM --- Refuse to push a dirty tree -------------------------------------------
REM  Pushing with uncommitted work leaves the deployed site and this folder
REM  saying different things, and the difference is invisible from both ends.
for /f %%s in ('git status --porcelain ^| find /c /v ""') do set DIRTY=%%s
if not "%DIRTY%"=="0" (
  echo   [!] There are %DIRTY% uncommitted change^(s^) in this folder:
  echo.
  git status --short
  echo.
  echo       These will NOT be pushed. Commit them first if they should go.
  echo.
  echo       Press any key to push anyway, or close this window to stop.
  pause >nul
  echo.
)

echo   [1/3] Checking what is new
git fetch origin main >nul 2>&1
echo.
git log --oneline origin/main..HEAD
echo.

for /f %%c in ('git rev-list --count origin/main..HEAD') do set AHEAD=%%c
if "%AHEAD%"=="0" (
  echo   [i] Nothing to push - GitHub already has everything.
  echo.
  pause
  exit /b 0
)
echo         %AHEAD% commit^(s^) to push.
echo.

echo   [2/3] Pushing to GitHub
echo         If a GitHub sign-in window appears, sign in - the saved token
echo         has expired. Nothing is wrong with the code.
echo.
git push origin main
if errorlevel 1 (
  echo.
  echo   [X] Push failed. Nothing was sent, nothing was lost.
  echo       The commits are still here; read the message above.
  echo.
  pause
  exit /b 1
)

echo.
echo   [3/3] Done. Vercel takes it from here.
echo.
echo   ----------------------------------------------------------------
echo     Code:   https://github.com/Arvind0229/portfolio
echo     Build:  https://vercel.com/dashboard   ^(watch the deployment^)
echo     Live:   https://arvindsportfolio.vercel.app
echo.
echo     The build takes a couple of minutes. Open the live site in a
echo     private window, or press Ctrl+Shift+R, so you are not shown a
echo     cached copy of the old one.
echo   ----------------------------------------------------------------
echo.
pause
