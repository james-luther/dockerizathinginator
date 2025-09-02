# Dockerizathinginator Windows Build Script

param(
    [string]$Target = "build",
    [switch]$Clean,
    [switch]$Dev,
    [switch]$Help
)

# Configuration
$APP_NAME = "dockerizathinginator"
$VERSION = "2.0.0"
$BUILD_DIR = "build"

function Write-Header {
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "  Dockerizathinginator Build System  " -ForegroundColor Cyan
    Write-Host "             Version $VERSION          " -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Help {
    Write-Host "Usage: .\build.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Target <target>  Specify build target (build, dev, clean, test)"
    Write-Host "  -Clean            Clean build artifacts"
    Write-Host "  -Dev              Start development mode"
    Write-Host "  -Help             Show this help message"
    Write-Host ""
    Write-Host "Targets:"
    Write-Host "  deps              Install dependencies"
    Write-Host "  build             Build application"
    Write-Host "  dev               Development mode with hot reload"
    Write-Host "  clean             Clean build artifacts"
    Write-Host "  test              Run tests"
    Write-Host "  package           Create distribution package"
}

function Test-Dependencies {
    Write-Host "Checking dependencies..." -ForegroundColor Yellow
    
    # Check Go
    try {
        $goVersion = go version
        Write-Host "✓ Go: $goVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Go is not installed or not in PATH" -ForegroundColor Red
        Write-Host "  Download from: https://golang.org/dl/" -ForegroundColor Yellow
        return $false
    }
    
    # Check Wails
    try {
        $wailsVersion = wails version
        Write-Host "✓ Wails: $wailsVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Wails is not installed" -ForegroundColor Red
        Write-Host "  Install with: go install github.com/wailsapp/wails/v2/cmd/wails@latest" -ForegroundColor Yellow
        return $false
    }
    
    # Check Ansible (optional warning)
    try {
        $ansibleVersion = ansible --version | Select-Object -First 1
        Write-Host "✓ Ansible: $ansibleVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠ Ansible not found - required for deployment functionality" -ForegroundColor Yellow
        Write-Host "  Install options:" -ForegroundColor Yellow
        Write-Host "    - WSL2: sudo apt install ansible" -ForegroundColor Gray
        Write-Host "    - pip: pip install ansible" -ForegroundColor Gray
    }
    
    return $true
}

function Install-Dependencies {
    Write-Host "Installing Go dependencies..." -ForegroundColor Yellow
    go mod tidy
    go mod download
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        return $false
    }
}

function Build-Application {
    Write-Host "Building $APP_NAME..." -ForegroundColor Yellow
    
    if (!(Install-Dependencies)) {
        return $false
    }
    
    wails build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Build completed successfully" -ForegroundColor Green
        Write-Host "Executable location: $BUILD_DIR\bin\$APP_NAME.exe" -ForegroundColor Cyan
        return $true
    } else {
        Write-Host "✗ Build failed" -ForegroundColor Red
        return $false
    }
}

function Start-Development {
    Write-Host "Starting development mode..." -ForegroundColor Yellow
    Write-Host "This will open the app with hot reload enabled" -ForegroundColor Gray
    
    if (!(Test-Dependencies)) {
        Write-Host "Please install missing dependencies first" -ForegroundColor Red
        return
    }
    
    wails dev
}

function Clean-BuildArtifacts {
    Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow
    
    if (Test-Path $BUILD_DIR) {
        Remove-Item -Recurse -Force $BUILD_DIR
        Write-Host "✓ Removed $BUILD_DIR directory" -ForegroundColor Green
    }
    
    if (Test-Path "app.syso") {
        Remove-Item "app.syso"
        Write-Host "✓ Removed app.syso" -ForegroundColor Green
    }
    
    go clean
    Write-Host "✓ Cleaned Go cache" -ForegroundColor Green
}

function Run-Tests {
    Write-Host "Running tests..." -ForegroundColor Yellow
    go test ./...
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ All tests passed" -ForegroundColor Green
    } else {
        Write-Host "✗ Some tests failed" -ForegroundColor Red
    }
}

function Create-Package {
    Write-Host "Creating distribution package..." -ForegroundColor Yellow
    
    if (!(Test-Path "$BUILD_DIR\bin\$APP_NAME.exe")) {
        Write-Host "Application not built. Building first..." -ForegroundColor Yellow
        if (!(Build-Application)) {
            return
        }
    }
    
    # Create dist directory
    New-Item -ItemType Directory -Force -Path "dist" | Out-Null
    
    # Copy executable
    Copy-Item -Path "$BUILD_DIR\bin\*" -Destination "dist\" -Recurse -Force
    
    # Copy Ansible playbooks
    Copy-Item -Path "ansible" -Destination "dist\" -Recurse -Force
    
    # Copy documentation
    if (Test-Path "README.md") {
        Copy-Item "README.md" "dist\"
    }
    if (Test-Path "LICENSE") {
        Copy-Item "LICENSE" "dist\"
    }
    
    Write-Host "✓ Package created in dist\ directory" -ForegroundColor Green
}

# Main script logic
Write-Header

if ($Help) {
    Show-Help
    exit 0
}

if ($Clean) {
    Clean-BuildArtifacts
    exit 0
}

if ($Dev) {
    Start-Development
    exit 0
}

switch ($Target.ToLower()) {
    "deps" {
        if (Test-Dependencies) {
            Install-Dependencies
        }
    }
    "build" {
        if (Test-Dependencies) {
            Build-Application
        }
    }
    "dev" {
        Start-Development
    }
    "clean" {
        Clean-BuildArtifacts
    }
    "test" {
        Run-Tests
    }
    "package" {
        Create-Package
    }
    default {
        Write-Host "Unknown target: $Target" -ForegroundColor Red
        Show-Help
        exit 1
    }
}

Write-Host ""
Write-Host "Build script completed." -ForegroundColor Cyan