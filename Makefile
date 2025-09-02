# Dockerizathinginator Makefile

.PHONY: build dev clean install deps test run

# Variables
APP_NAME=dockerizathinginator
VERSION=2.0.0
BUILD_DIR=build
FRONTEND_DIR=frontend/dist

# Default target
all: deps build

# Install dependencies
deps:
	@echo "Installing Go dependencies..."
	go mod tidy
	go mod download

# Development build and run
dev:
	@echo "Starting development mode..."
	wails dev

# Production build
build: deps
	@echo "Building $(APP_NAME) v$(VERSION)..."
	wails build

# Build for specific platform
build-windows:
	@echo "Building for Windows..."
	wails build -platform windows/amd64

build-linux:
	@echo "Building for Linux..."
	wails build -platform linux/amd64

build-darwin:
	@echo "Building for macOS..."
	wails build -platform darwin/universal

# Build for all platforms
build-all: build-windows build-linux build-darwin

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf $(BUILD_DIR)
	rm -rf app.syso
	go clean

# Run tests
test:
	@echo "Running tests..."
	go test ./...

# Install Wails if not present
install-wails:
	@echo "Installing Wails v2..."
	go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Check if required tools are installed
check-deps:
	@echo "Checking dependencies..."
	@command -v go >/dev/null 2>&1 || { echo >&2 "Go is required but not installed. Aborting."; exit 1; }
	@command -v wails >/dev/null 2>&1 || { echo >&2 "Wails is required but not installed. Run 'make install-wails'. Aborting."; exit 1; }
	@command -v ansible >/dev/null 2>&1 || { echo >&2 "Ansible is required but not installed. Please install Ansible. Aborting."; exit 1; }
	@echo "All dependencies are installed."

# Package for distribution
package: build
	@echo "Packaging $(APP_NAME)..."
	mkdir -p dist
	cp -r $(BUILD_DIR)/bin dist/
	cp -r ansible dist/
	cp README.md dist/
	cp LICENSE dist/ || true
	@echo "Package created in dist/"

# Quick run (for development)
run:
	@echo "Running $(APP_NAME)..."
	./$(BUILD_DIR)/bin/$(APP_NAME)

# Help
help:
	@echo "Dockerizathinginator Build System"
	@echo ""
	@echo "Available targets:"
	@echo "  deps          - Install Go dependencies"
	@echo "  dev           - Start development mode with hot reload"
	@echo "  build         - Build for current platform"
	@echo "  build-windows - Build for Windows"
	@echo "  build-linux   - Build for Linux"
	@echo "  build-darwin  - Build for macOS"
	@echo "  build-all     - Build for all platforms"
	@echo "  clean         - Clean build artifacts"
	@echo "  test          - Run tests"
	@echo "  check-deps    - Check if required tools are installed"
	@echo "  install-wails - Install Wails CLI tool"
	@echo "  package       - Create distribution package"
	@echo "  run           - Run the built application"
	@echo "  help          - Show this help message"