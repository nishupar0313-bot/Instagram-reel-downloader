@echo off
cd /d "%~dp0"
echo Starting InstaSave Hub...
echo.
echo Open this URL in your browser:
echo http://127.0.0.1:5500/
echo.
"C:\Users\ACER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.js
pause
