# LongMa — Launch from PowerShell to WSL2/WSLg
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " LongMa — DeepSeek Desktop Agent" -ForegroundColor Cyan
Write-Host " Launching via WSLg..." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

wsl.exe --cd "~/.opencode-workspace/projects/longma" -- "./run-windows.sh"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] LongMa exited with code $LASTEXITCODE" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:"
    Write-Host "  1. Ensure WSLg is installed: wsl --version"
    Write-Host "  2. Try running from WSL terminal:"
    Write-Host "     cd ~/.opencode-workspace/projects/longma && ./run-windows.sh"
    Read-Host "Press Enter to exit"
}
