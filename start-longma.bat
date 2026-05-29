@echo off
REM LongMa — Launch from WSL2 to Windows Desktop (WSLg)
REM Double-click this file from the network path:
REM   \\wsl.localhost\Ubuntu-24.04\home\guish\.opencode-workspace\projects\longma\

echo =============================================
echo  LongMa — DeepSeek Desktop Agent
echo  Starting via WSLg...
echo =============================================

wsl.exe --cd "~/.opencode-workspace/projects/longma" -- "./run-windows.sh"

echo.
if %errorlevel% neq 0 (
    echo [ERROR] LongMa exited with code %errorlevel%
    echo.
    echo Troubleshooting:
    echo   1. Ensure WSLg is installed: wsl --version
    echo   2. Try running from WSL terminal:
    echo      cd ~/.opencode-workspace/projects/longma ^&^& ./run-windows.sh
    pause
) else (
    echo LongMa closed.
)
