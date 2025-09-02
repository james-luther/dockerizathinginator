# 🐳 Dockerizathinginator v2.0

**A cross-platform desktop application for automated Docker setup and container deployment on Raspberry Pi systems.**

[![Build and Release](https://github.com/james-luther/dockerizathinginator/actions/workflows/build.yml/badge.svg)](https://github.com/james-luther/dockerizathinginator/actions/workflows/build.yml)
[![CodeQL](https://github.com/james-luther/dockerizathinginator/actions/workflows/codeql.yml/badge.svg)](https://github.com/james-luther/dockerizathinginator/actions/workflows/codeql.yml)
[![Go Version](https://img.shields.io/badge/Go-1.22+-blue)](https://golang.org/)
[![Wails](https://img.shields.io/badge/Wails-v2.10.2-blue)](https://wails.io)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

---

## 🚀 What's New in v2.0

**Complete rewrite** from Python/Eel to **Go/Wails** with **Ansible** automation:

- ✨ **Cross-platform desktop app** (Windows, macOS, Linux)  
- 🔧 **Ansible-powered configuration** management
- 🎯 **Modern UI** with native desktop integration
- 🚀 **Automated CI/CD** with cross-platform builds
- 🔒 **Enhanced security** with proper SSH handling
- 📦 **Easy distribution** via GitHub Releases

---

## 📋 Features

### 🔌 Remote Configuration
- **SSH connectivity testing** and validation
- **Raspberry Pi model detection** and compatibility checking
- **Real-time progress updates** during deployment

### 🐳 Docker Ecosystem Setup
- **Automated Docker installation** and configuration
- **Portainer deployment** for container management
- **Docker Compose** setup with best practices

### 📚 Container Stack Deployment
Choose from pre-configured stacks:

- **🌐 Network Stack**: Pi-hole, UniFi Controller, Nginx Proxy Manager, Squid, Heimdall
- **🏠 IoT Stack**: InfluxDB, OpenHAB, Mosquitto, Home Assistant, Grafana  
- **🎬 Media Stack**: Plex, Emby, NextCloud

### 💾 Storage Configuration
- **USB drive** preparation and mounting
- **NFS network shares** integration
- **CIFS/SMB Windows shares** support
- **GitHub repository** cloning for configuration

---

## 📥 Download & Installation

### Latest Release
Download the latest version for your platform:

[![Download for Windows](https://img.shields.io/badge/Download-Windows-blue?style=for-the-badge&logo=windows)](https://github.com/james-luther/dockerizathinginator/releases/latest/download/dockerizathinginator-windows-amd64.zip)
[![Download for macOS](https://img.shields.io/badge/Download-macOS-blue?style=for-the-badge&logo=apple)](https://github.com/james-luther/dockerizathinginator/releases/latest/download/dockerizathinginator-darwin-amd64.tar.gz)
[![Download for Linux](https://img.shields.io/badge/Download-Linux-blue?style=for-the-badge&logo=linux)](https://github.com/james-luther/dockerizathinginator/releases/latest/download/dockerizathinginator-linux-amd64.tar.gz)

### System Requirements
- **Operating System**: Windows 10+, macOS 10.13+, or Linux
- **Network**: SSH access to target Raspberry Pi
- **Dependencies**: Ansible (for deployment functionality)

### Quick Start
1. Download and extract the appropriate package for your OS
2. Run the executable: `dockerizathinginator` (or `dockerizathinginator.exe` on Windows)
3. Follow the setup wizard to configure your Raspberry Pi
4. Select desired container stacks and deploy!

---

## 🛠️ Development Setup

### Prerequisites
- **Go 1.22+** - [Download here](https://golang.org/dl/)
- **Wails CLI** - [Installation guide](https://wails.io/docs/gettingstarted/installation)
- **Platform-specific dependencies**:
  - **Linux**: `build-essential`, `pkg-config`, `libwebkit2gtk-4.0-dev`
  - **macOS**: Xcode command line tools
  - **Windows**: WebView2 runtime (usually pre-installed)

### Clone & Setup
```bash
# Clone the repository
git clone https://github.com/james-luther/dockerizathinginator.git
cd dockerizathinginator

# Install Go dependencies
go mod tidy

# Install Wails CLI (if not already installed)
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### Development Commands
```bash
# Run in development mode (hot reload)
wails dev

# Or use the PowerShell build script (Windows)
.\build.ps1 -Dev

# Run tests
go test ./...

# Build for production
wails build

# Cross-platform build (via build script)
.\build.ps1 -Target build
```

### Project Structure
```
├── app.go                 # Main application logic
├── main.go               # Application entry point  
├── ansible_runner.go     # Ansible execution handler
├── go.mod                # Go module dependencies
├── wails.json           # Wails configuration
├── build.ps1            # PowerShell build script
├── frontend/            # Web UI assets
│   └── dist/           # Built frontend files
├── ansible/            # Ansible playbooks
│   ├── playbooks/     # Deployment playbooks
│   ├── inventory/     # Host configurations  
│   └── ansible.cfg    # Ansible settings
└── .github/           # CI/CD workflows
    └── workflows/     # GitHub Actions
```

---

## 🔄 CI/CD Pipeline

The project features a comprehensive GitHub Actions setup:

### 🏗️ Automated Builds
- **Multi-platform**: Windows, macOS (Intel/ARM64), Linux
- **Smart scheduling**: Monthly builds with change detection  
- **Artifact management**: 90-day retention with cleanup
- **Release automation**: Tagged releases with binaries

### 🔧 Maintenance
- **Dependency updates**: Monthly Go modules and Wails updates
- **Security scanning**: CodeQL and Gosec integration
- **Quality assurance**: Automated testing and linting

### 📦 Distribution
- **GitHub Releases**: Official releases with full cross-platform support
- **Checksums**: SHA256 verification for all binaries
- **Versioning**: Semantic versioning with automated bumping

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### 🐛 Bug Reports & Feature Requests
- Open an [issue](https://github.com/james-luther/dockerizathinginator/issues) with detailed information
- Use the provided issue templates
- Include system information and reproduction steps

### 💻 Code Contributions
1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### 📋 Development Guidelines
- Follow Go best practices and formatting (`gofmt`, `golint`)
- Write tests for new functionality
- Update documentation for user-facing changes
- Ensure cross-platform compatibility

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

### 📝 What this means:
- ✅ You can use, modify, and distribute this software
- ✅ You can use it for commercial purposes  
- ❗ Any modifications must also be open source (GPL v3.0)
- ❗ You must include the original copyright and license

---

## 👨‍💻 Author & Contact

**Author**: James Luther ([james-luther](https://github.com/james-luther))  
**Bluesky**: [@b34rdy.bsky.social](https://bsky.app/profile/b34rdy.bsky.social)

### 🔗 Links
- **Issues**: [Bug Reports & Feature Requests](https://github.com/james-luther/dockerizathinginator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/james-luther/dockerizathinginator/discussions)
- **Releases**: [Latest Downloads](https://github.com/james-luther/dockerizathinginator/releases)

---

## 🙏 Acknowledgments

- **[Wails](https://wails.io)** - Amazing Go + Web framework
- **[Ansible](https://www.ansible.com)** - Powerful automation platform  
- **Community contributors** - Thank you for your support!

---

<div align="center">

**⭐ Star this repo if it helps you!**

*Made with ❤️ and lots of ☕*

</div>