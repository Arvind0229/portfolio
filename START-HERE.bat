@echo off
REM ---------------------------------------------------------------------
REM  Arvind Gupta - Portfolio
REM  Double-click this file to run the site on this computer.
REM
REM  Three checks run before the server starts. Each one is here because
REM  its absence produced a confusing failure instead of a clear one.
REM
REM   1. An earlier copy still running. The old version opened the browser
REM      at localhost:3000 whatever port Next actually chose. With a
REM      previous copy alive, Next moved to 3001 and said so in a line
REM      nobody reads - so the browser kept talking to the stale server on
REM      3000 ("missing required error components, refreshing...") while
REM      the healthy one sat elsewhere with nobody asking it for anything.
REM      Worse, both wrote into the same build folder.
REM
REM   2. A half-written .next. Next writes its build into that folder as it
REM      goes, so an interrupted run leaves a partial one behind and the
REM      symptom is ENOENT on page.js. Cleared only when the evidence of a
REM      broken build is actually there.
REM
REM   3. The browser now opens when the server answers, not after a fixed
REM      six-second guess that a cold first build beat every time.
REM ---------------------------------------------------------------------

setlocal enabledelayedexpansion
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

REM --- 1. Is an earlier copy still running? ---------------------------
REM  Ports 3000 to 3005, not just 3000: the copy doing the damage is
REM  usually the one that quietly moved up a port, and it is writing into
REM  the same .next as the first.
REM  Only node.exe is ever offered up for killing. Ports in this range are
REM  popular with other development tools, and a script that quietly ends
REM  whatever it finds on 3005 would eventually end something that mattered
REM  and was nothing to do with this site.
set "BUSYLIST="
for %%P in (3000 3001 3002 3003 3004 3005) do (
  for /f "tokens=5" %%p in ('netstat -ano ^| findstr LISTENING ^| findstr /C::%%P') do (
    tasklist /FI "PID eq %%p" 2>nul | findstr /I "node.exe" >nul && set "BUSYLIST=!BUSYLIST! %%p"
  )
)

if not "!BUSYLIST!"=="" (
  echo.
  echo  [i] An earlier copy of this site is still running.
  echo      Process id^(s^):!BUSYLIST!
  echo.
  echo      Two copies at once is what causes the "refreshing..." loop:
  echo      the browser talks to the old server while the new one waits on
  echo      another port - and both write into the same build folder.
  echo.
  echo      Press any key to stop them and continue,
  echo      or close this window to leave them alone.
  pause >nul
  for %%k in (!BUSYLIST!) do taskkill /F /PID %%k >nul 2>nul
  echo  [ok] Stopped.
  REM Windows releases the socket a moment after the process ends.
  timeout /t 3 >nul
)

REM --- 2. Dependencies ------------------------------------------------
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

REM --- 3. Clear a half-written build ----------------------------------
REM  The marker is page.js, not the folder above it.
REM
REM  The first version of this check looked for .next\server\app and was
REM  useless: the folder that actually broke had .server\app present, with
REM  _not-found and assistant compiled inside it and page.js - the home page
REM  - missing. That is precisely the shape of an interrupted build, and
REM  precisely what the ENOENT error names.
REM
REM  Deleting when page.js is absent can occasionally throw away a healthy
REM  .next: in dev, a route is compiled on first request, so a server that
REM  started and was closed before anyone opened the home page leaves the
REM  same evidence. The cost of that mistake is one extra rebuild. The cost
REM  of the opposite mistake is the error you cannot get past.
if exist ".next" (
  if not exist ".next\server\app\page.js" (
    echo  [..] Clearing an incomplete build from last time
    rmdir /s /q ".next" 2>nul
  )
)

echo.
echo  [..] Starting the site. The first build takes 1-2 minutes.
echo       The browser opens by itself once it is ready.
echo       If it does not, open this address yourself:
echo.
echo         http://localhost:3000
echo.
echo       Leave this window open while you use the site.
echo       Press Ctrl+C here to stop it.
echo.

REM --- 4. Open the browser once the server actually answers ------------
REM  Polls with curl (shipped with Windows 10 and 11) instead of waiting a
REM  fixed number of seconds, so a slow first build never opens a browser
REM  onto nothing. If curl is missing the loop simply never fires and the
REM  address printed above is used by hand - a quiet degradation, not a
REM  failure.
REM  The whole loop is quoted. Unquoted, the ^& and ^&^& would be split by
REM  the shell reading THIS file rather than passed to the one being
REM  started, and the poll would run once and give up. There are no double
REM  quotes inside, deliberately - nesting them here is the classic way a
REM  batch file breaks on someone else's machine.
REM  `ping`, not `timeout`, as the one-second pause. `timeout` refuses to run
REM  when stdin is redirected - which is exactly what `start /b` does to it -
REM  and fails with "Input redirection is not supported". The ping trick is
REM  ugly and it is the one that works everywhere.
start "" /b cmd /c "@echo off & for /l %%i in (1,1,180) do (ping -n 2 127.0.0.1 >nul & curl -s -o nul http://localhost:3000/ && (start http://localhost:3000 & exit))"

call npm run dev

endlocal
