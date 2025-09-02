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

# Global variables for validated command paths
$GoCommand = $null
$WailsCommand = $null
$AnsibleCommand = $null

function Get-ValidatedCommand {
    param(
        [Parameter(Mandatory=$true)]
        [string]$CommandName
    )
    
    try {
        $command = Get-Command $CommandName -ErrorAction Stop
        
        # Verify it's an executable command (Application, ExternalScript, or Cmdlet)
        if ($command.CommandType -in @('Application', 'ExternalScript', 'Cmdlet')) {
            # For applications and scripts, return the full path
            if ($command.Source) {
                return $command.Source
            }
            # For cmdlets, return the name (they don't have a file path)
            elseif ($command.CommandType -eq 'Cmdlet') {
                return $command.Name
            }
        }
        
        Write-Warning "Command '$CommandName' found but is not an executable type: $($command.CommandType)"
        return $null
    }
    catch {
        return $null
    }
}

function Initialize-Commands {
    Write-Host "Validating system commands..." -ForegroundColor Yellow
    
    # Validate and store full paths to prevent path injection
    # Get-ValidatedCommand already verifies command existence and executability
    $script:GoCommand = Get-ValidatedCommand "go"
    if (-not $script:GoCommand) {
        Write-Host "Error: 'go' command not found or is not a valid executable." -ForegroundColor Red
        exit 1
    }
    
    $script:WailsCommand = Get-ValidatedCommand "wails"
    if (-not $script:WailsCommand) {
        Write-Host "Error: 'wails' command not found or is not a valid executable." -ForegroundColor Red
        exit 1
    }
    
    # Ansible is optional for basic operations, so don't exit if not found
    $script:AnsibleCommand = Get-ValidatedCommand "ansible"
    if (-not $script:AnsibleCommand) {
        Write-Host "Warning: 'ansible' command not found. Deployment features will be unavailable." -ForegroundColor Yellow
    }
    
    Write-Host "Command validation completed." -ForegroundColor Green
}

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
    if ($null -eq $script:GoCommand) {
        Write-Host "✗ Go is not installed or not in PATH" -ForegroundColor Red
        Write-Host "  Download from: https://golang.org/dl/" -ForegroundColor Yellow
        return $false
    }
    else {
        try {
            $goVersion = & $script:GoCommand version
            Write-Host "✓ Go: $goVersion" -ForegroundColor Green
            Write-Host "  Path: $script:GoCommand" -ForegroundColor Gray
        }
        catch {
            Write-Host "✗ Go command failed to execute" -ForegroundColor Red
            return $false
        }
    }
    
    # Check Wails
    if ($null -eq $script:WailsCommand) {
        Write-Host "✗ Wails is not installed" -ForegroundColor Red
        Write-Host "  Install with: go install github.com/wailsapp/wails/v2/cmd/wails@latest" -ForegroundColor Yellow
        return $false
    }
    else {
        try {
            $wailsVersion = & $script:WailsCommand version
            Write-Host "✓ Wails: $wailsVersion" -ForegroundColor Green
            Write-Host "  Path: $script:WailsCommand" -ForegroundColor Gray
        }
        catch {
            Write-Host "✗ Wails command failed to execute" -ForegroundColor Red
            return $false
        }
    }
    
    # Check Ansible (optional warning)
    if ($null -eq $script:AnsibleCommand) {
        Write-Host "⚠ Ansible not found - required for deployment functionality" -ForegroundColor Yellow
        Write-Host "  Install options:" -ForegroundColor Yellow
        Write-Host "    - WSL2: sudo apt install ansible" -ForegroundColor Gray
        Write-Host "    - pip: pip install ansible" -ForegroundColor Gray
    }
    else {
        try {
            $ansibleVersion = & $script:AnsibleCommand --version | Select-Object -First 1
            Write-Host "✓ Ansible: $ansibleVersion" -ForegroundColor Green
            Write-Host "  Path: $script:AnsibleCommand" -ForegroundColor Gray
        }
        catch {
            Write-Host "⚠ Ansible command failed to execute" -ForegroundColor Yellow
        }
    }
    
    return $true
}

function Install-Dependencies {
    Write-Host "Installing Go dependencies..." -ForegroundColor Yellow
    
    if ($null -eq $script:GoCommand) {
        Write-Host "✗ Go command not available" -ForegroundColor Red
        return $false
    }
    
    & $script:GoCommand mod tidy
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to tidy Go modules" -ForegroundColor Red
        return $false
    }
    
    & $script:GoCommand mod download
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✗ Failed to download dependencies" -ForegroundColor Red
        return $false
    }
}

function Build-Application {
    Write-Host "Building $APP_NAME..." -ForegroundColor Yellow
    
    if (!(Install-Dependencies)) {
        return $false
    }
    
    if ($null -eq $script:WailsCommand) {
        Write-Host "✗ Wails command not available" -ForegroundColor Red
        return $false
    }
    
    & $script:WailsCommand build
    
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
    
    if ($null -eq $script:WailsCommand) {
        Write-Host "✗ Wails command not available" -ForegroundColor Red
        return
    }
    
    & $script:WailsCommand dev
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
    
    if ($null -ne $script:GoCommand) {
        & $script:GoCommand clean
        Write-Host "✓ Cleaned Go cache" -ForegroundColor Green
    }
    else {
        Write-Host "⚠ Go command not available, skipping cache clean" -ForegroundColor Yellow
    }
}

function Run-Tests {
    Write-Host "Running tests..." -ForegroundColor Yellow
    
    if ($null -eq $script:GoCommand) {
        Write-Host "✗ Go command not available" -ForegroundColor Red
        return $false
    }
    
    & $script:GoCommand test ./...
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ All tests passed" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✗ Some tests failed" -ForegroundColor Red
        return $false
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

# Initialize and validate commands early for security
Initialize-Commands

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