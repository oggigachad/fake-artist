@echo off
echo Starting Fake Artist Game...
echo.
echo [1/2] Starting Backend Server...
start "Fake Artist - Backend" cmd /k "cd server && npm run dev"
timeout /t 2 /nobreak > nul

echo [2/2] Starting Frontend Client...
start "Fake Artist - Frontend" cmd /k "cd client && npm run dev"

echo.
echo ====================================
echo Both servers are starting!
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo ====================================
echo.
echo Press any key to stop both servers...
pause > nul

taskkill /FI "WindowTitle eq Fake Artist - Backend*" /T /F
taskkill /FI "WindowTitle eq Fake Artist - Frontend*" /T /F
