# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

dockerizathinginator is a desktop application that automates Docker setup and container deployment on Raspberry Pi 4 systems. It provides a wizard interface for remote configuration via SSH.

## Tech Stack

- **Backend**: Go with Wails v2.10.2 framework (Go-to-WebView bridge)
- **Frontend**: HTML5, CSS3, JavaScript (embedded in desktop app)
- **Configuration Management**: Ansible playbooks for automated deployment
- **Key Libraries**: golang.org/x/crypto/ssh (SSH), Wails runtime (desktop app framework)

## Development Commands

### Setup
```bash
# Clone repository
git clone https://github.com/b34rdtek/dockerizathinginator.git
cd dockerizathinginator

# Install Go dependencies
go mod tidy

# Install Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### Development
```bash
# Run development mode with hot reload
wails dev

# Or use PowerShell build script
.\build.ps1 -Dev
```

### Build Production
```bash
# Build for current platform
wails build

# Cross-platform builds (via GitHub Actions)
# Windows: build/bin/dockerizathinginator.exe
# macOS: build/bin/dockerizathinginator (Intel/ARM64)
# Linux: build/bin/dockerizathinginator

# Or use PowerShell build script
.\build.ps1 -Target build
```

### Testing and Quality
```bash
# Run tests
go test ./...
.\build.ps1 -Target test

# Security scanning (via GitHub Actions)
# CodeQL analysis runs automatically on push/PR
```

## Architecture

### Core Components

1. **main.go**: Wails application entry point and window configuration
2. **app.go**: Backend application logic with SSH and Ansible integration
   - `TestSSH()`: Validates SSH connectivity to Raspberry Pi
   - `GetModel()`: Detects Raspberry Pi model via SSH
   - `InstallDocker()`: Orchestrates Docker installation via Ansible
   - `InstallPortainer()`: Deploys Portainer container management
   - `DeployStacks()`: Deploys selected container stacks (Network/IoT/Media)

3. **ansible_runner.go**: Ansible playbook execution with real-time output streaming
4. **frontend/dist/**: Embedded web frontend assets
   - `index.html`: Single-page application UI
   - `app.js`: Frontend logic handling wizard steps and Wails bridge
   - `style.css`: Custom styles for desktop application

5. **ansible/**: Ansible playbooks and configuration
   - `playbooks/`: Main deployment playbooks
   - `inventory/`: Host inventory templates
   - `ansible.cfg`: Ansible configuration

### Key Design Patterns

- **Wails Bridge**: Exposes Go functions to frontend via Wails runtime
- **SSH Operations**: All remote commands executed through golang.org/x/crypto/ssh
- **Ansible Automation**: Configuration management via Ansible playbooks
- **Event-Driven UI**: Real-time progress updates via Wails event system
- **Cross-Platform**: Single codebase builds for Windows, macOS, and Linux

## Container Stack Options

The application can deploy three main stacks:

1. **Network Stack**: Pi-hole, UniFi Controller, Nginx Proxy Manager, Squid, Heimdall
2. **IoT Stack**: InfluxDB, OpenHAB, Mosquitto, Home Assistant, Grafana
3. **Media Stack**: Plex, Emby, NextCloud

## Storage Configuration

Supports multiple storage backends:
- USB drive preparation and mounting
- NFS network shares
- CIFS/SMB Windows shares
- GitHub repository cloning for configuration

## CI/CD Pipeline

### GitHub Actions Workflows

1. **build.yml**: Cross-platform builds for Windows, macOS (Intel/ARM64), and Linux
   - Triggers: Push to main, PRs, tags, monthly schedule, manual dispatch
   - Smart change detection for scheduled builds (skips if no changes)
   - Artifacts stored for 90 days with automatic cleanup
   - Automatic releases for tagged builds

2. **release.yml**: Automated release creation and versioning
   - Manual trigger with version increment options (patch/minor/major)
   - Automatic version bumping in project files
   - Release notes generation from commit history
   - Cross-platform binary packaging with checksums

3. **maintenance.yml**: Monthly dependency updates and security scanning
   - Automated dependency updates via Pull Requests
   - Go module and Wails framework version checks
   - Security scanning with Gosec
   - Artifact cleanup (90-day retention)

4. **codeql.yml**: Security analysis (inherited from original project)
   - Static code analysis for Go and JavaScript
   - Weekly scheduled scans
   - Automatic security issue reporting

### Versioning Strategy

- **Release Tags**: `v1.2.3` format following semantic versioning
- **Development Builds**: `v2024.09.02-abc1234` (date + commit hash)
- **Monthly Builds**: Only run if changes detected since last release
- **Artifact Retention**: 90 days for build artifacts, permanent for releases

### Package Distribution

- **GitHub Releases**: Tagged releases with cross-platform binaries
- **GitHub Packages**: Development builds and versioned packages
- **Build Artifacts**: Available for 90 days via GitHub Actions

## Important Notes

- Fully migrated from Python/Eel to Go/Wails architecture
- Cross-platform desktop application (Windows, macOS, Linux)
- Uses GPLv3.0 license
- Automated security scanning and dependency management
- SSH operations include proper error handling and input sanitization
- Ansible playbooks handle all remote configuration management