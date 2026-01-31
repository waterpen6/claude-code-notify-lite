# Claude Code Notify Lite Installer for Windows
# Run: iwr -useb https://raw.githubusercontent.com/waterpen6/claude-code-notify-lite/main/scripts/install.ps1 | iex

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  Claude Code Notify Lite Installer" -ForegroundColor Cyan
Write-Host "  ===================================" -ForegroundColor Cyan
Write-Host ""

function Test-NodeInstalled {
    try {
        $nodeVersion = node -v 2>$null
        if ($nodeVersion) {
            $major = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
            return $major -ge 16
        }
    } catch {}
    return $false
}

function Install-ViaNpm {
    Write-Host "  Installing via npm..." -ForegroundColor Yellow

    npm install -g claude-code-notify-lite

    Write-Host ""
    Write-Host "  Running setup..." -ForegroundColor Yellow

    ccnotify install
}

function Install-Binary {
    Write-Host "  Downloading binary..." -ForegroundColor Yellow

    $installDir = Join-Path $env:USERPROFILE ".claude-code-notify-lite"
    $binDir = Join-Path $installDir "bin"

    if (-not (Test-Path $binDir)) {
        New-Item -ItemType Directory -Path $binDir -Force | Out-Null
    }

    $arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
    $binaryName = "ccnotify-win-$arch.exe"
    $downloadUrl = "https://github.com/waterpen6/claude-code-notify-lite/releases/latest/download/$binaryName"

    $exePath = Join-Path $binDir "ccnotify.exe"

    Invoke-WebRequest -Uri $downloadUrl -OutFile $exePath -UseBasicParsing

    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -notlike "*$binDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$binDir;$userPath", "User")
        $env:Path = "$binDir;$env:Path"
        Write-Host "  Added to PATH" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "  Running setup..." -ForegroundColor Yellow

    & $exePath install
}

if (Test-NodeInstalled) {
    Install-ViaNpm
} else {
    Write-Host "  Node.js 16+ not found, installing binary..." -ForegroundColor Yellow
    Install-Binary
}

Write-Host ""
Write-Host "  Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  Run 'ccnotify test' to verify." -ForegroundColor Cyan
Write-Host ""
