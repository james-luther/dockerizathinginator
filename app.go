package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/crypto/ssh"
)

// App struct
type App struct {
	ctx           context.Context
	sshClient     *ssh.Client
	sshMutex      sync.Mutex
	ansibleRunner *AnsibleRunner
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		ansibleRunner: NewAnsibleRunner(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	a.sshMutex.Lock()
	defer a.sshMutex.Unlock()
	
	if a.sshClient != nil {
		a.sshClient.Close()
	}
}

// ConnectionResult represents the result of an SSH connection attempt
type ConnectionResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Model   string `json:"model,omitempty"`
}

// TestSSH tests SSH connection to the Raspberry Pi
func (a *App) TestSSH(host, user, password string) ConnectionResult {
	a.sshMutex.Lock()
	defer a.sshMutex.Unlock()

	// Close existing connection if any
	if a.sshClient != nil {
		a.sshClient.Close()
		a.sshClient = nil
	}

	config := &ssh.ClientConfig{
		User: user,
		Auth: []ssh.AuthMethod{
			ssh.Password(password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         5 * time.Second,
	}

	// Add port if not specified
	if !strings.Contains(host, ":") {
		host = host + ":22"
	}

	client, err := ssh.Dial("tcp", host, config)
	if err != nil {
		return ConnectionResult{
			Success: false,
			Message: fmt.Sprintf("Connection failed: %v", err),
		}
	}

	a.sshClient = client
	return ConnectionResult{
		Success: true,
		Message: "connected",
	}
}

// GetModel gets the Raspberry Pi model
func (a *App) GetModel(host, user, password string) string {
	// Ensure we're connected
	result := a.TestSSH(host, user, password)
	if !result.Success {
		return fmt.Sprintf("Error: %s", result.Message)
	}

	a.sshMutex.Lock()
	defer a.sshMutex.Unlock()

	if a.sshClient == nil {
		return "Error: Not connected"
	}

	session, err := a.sshClient.NewSession()
	if err != nil {
		return fmt.Sprintf("Error: %v", err)
	}
	defer session.Close()

	output, err := session.Output("cat /proc/device-tree/model")
	if err != nil {
		return fmt.Sprintf("Error: %v", err)
	}

	// Remove null bytes that might be in the output
	model := strings.TrimSpace(strings.Trim(string(output), "\x00"))
	return model
}

// StorageConfig represents storage configuration
type StorageConfig struct {
	Type         string `json:"type"`
	USBDevice    string `json:"usbDevice,omitempty"`
	NFSServer    string `json:"nfsServer,omitempty"`
	NFSPath      string `json:"nfsPath,omitempty"`
	SMBServer    string `json:"smbServer,omitempty"`
	SMBShare     string `json:"smbShare,omitempty"`
	SMBUsername  string `json:"smbUsername,omitempty"`
	SMBPassword  string `json:"smbPassword,omitempty"`
	VolumePath   string `json:"volumePath"`
}

// PrepareUSB prepares USB storage
func (a *App) PrepareUSB(host, user, password, volumePath string) error {
	config := StorageConfig{
		Type:       "usb",
		USBDevice:  "sda",
		VolumePath: volumePath,
	}
	
	return a.runAnsiblePlaybook("configure-storage.yml", host, user, password, config)
}

// PrepareNetworkNFS prepares NFS storage
func (a *App) PrepareNetworkNFS(host, user, password, volumePath, nfsServer, nfsPath string) error {
	config := StorageConfig{
		Type:       "nfs",
		NFSServer:  nfsServer,
		NFSPath:    nfsPath,
		VolumePath: volumePath,
	}
	
	return a.runAnsiblePlaybook("configure-storage.yml", host, user, password, config)
}

// PrepareNetworkCIFS prepares CIFS/SMB storage
func (a *App) PrepareNetworkCIFS(host, user, password, volumePath, smbServer, smbShare, smbUser, smbPass string) error {
	config := StorageConfig{
		Type:        "cifs",
		SMBServer:   smbServer,
		SMBShare:    smbShare,
		SMBUsername: smbUser,
		SMBPassword: smbPass,
		VolumePath:  volumePath,
	}
	
	return a.runAnsiblePlaybook("configure-storage.yml", host, user, password, config)
}

// UpdatePi updates the Raspberry Pi OS
func (a *App) UpdatePi(host, user, password string) error {
	// Send progress updates to frontend
	runtime.EventsEmit(a.ctx, "updateProgress", "Starting system update...")
	
	vars := map[string]interface{}{
		"skip_update": false,
	}
	
	return a.runAnsiblePlaybook("main.yml", host, user, password, vars)
}

// InstallDocker installs Docker on the Raspberry Pi
func (a *App) InstallDocker(host, user, password, volumePath string) error {
	runtime.EventsEmit(a.ctx, "updateProgress", "Installing Docker and required software...")
	
	vars := map[string]interface{}{
		"volume_path": volumePath,
	}
	
	return a.runAnsiblePlaybook("install-docker.yml", host, user, password, vars)
}

// InstallPortainer installs Portainer
func (a *App) InstallPortainer(host, user, password, volumePath string) error {
	runtime.EventsEmit(a.ctx, "updateProgress", "Installing Portainer...")
	
	vars := map[string]interface{}{
		"volume_path": volumePath,
	}
	
	return a.runAnsiblePlaybook("deploy-portainer.yml", host, user, password, vars)
}

// StackConfig represents which stacks and components to deploy
type StackConfig struct {
	NetworkStack bool              `json:"networkStack"`
	IoTStack     bool              `json:"iotStack"`
	MediaStack   bool              `json:"mediaStack"`
	Components   map[string]bool   `json:"components"`
}

// DeployStacks deploys the selected container stacks
func (a *App) DeployStacks(host, user, password, volumePath string, config StackConfig) error {
	runtime.EventsEmit(a.ctx, "updateProgress", "Deploying container stacks...")
	
	vars := map[string]interface{}{
		"volume_path":          volumePath,
		"deploy_network_stack": config.NetworkStack,
		"deploy_iot_stack":     config.IoTStack,
		"deploy_media_stack":   config.MediaStack,
	}
	
	// Add individual component flags
	for key, value := range config.Components {
		vars[key] = value
	}
	
	return a.runAnsiblePlaybook("main.yml", host, user, password, vars)
}

// validatePlaybookName validates that the playbook name is safe to use
func validatePlaybookName(playbook string) error {
	// Only allow alphanumeric characters, hyphens, underscores, and .yml extension
	validPlaybook := regexp.MustCompile(`^[a-zA-Z0-9_-]+\.yml$`)
	if !validPlaybook.MatchString(playbook) {
		return fmt.Errorf("invalid playbook name: %s", playbook)
	}
	
	// Check for path traversal attempts
	if strings.Contains(playbook, "..") || strings.Contains(playbook, "/") || strings.Contains(playbook, "\\") {
		return fmt.Errorf("playbook name contains invalid path characters: %s", playbook)
	}
	
	return nil
}

// runAnsiblePlaybook executes an Ansible playbook
func (a *App) runAnsiblePlaybook(playbook, host, user, password string, extraVars interface{}) error {
	// Validate playbook name to prevent command injection
	if err := validatePlaybookName(playbook); err != nil {
		return fmt.Errorf("playbook validation failed: %v", err)
	}
	// Create temporary inventory
	inventory := fmt.Sprintf(`
all:
  children:
    raspberrypi:
      hosts:
        pi:
          ansible_host: %s
          ansible_user: %s
          ansible_password: %s
`, host, user, password)

	// Write inventory to temp file
	tempDir := os.TempDir()
	inventoryFile := filepath.Join(tempDir, "inventory.yml")
	err := os.WriteFile(inventoryFile, []byte(inventory), 0600)
	if err != nil {
		return fmt.Errorf("failed to write inventory: %v", err)
	}
	defer os.Remove(inventoryFile)

	// Convert extraVars to JSON for ansible
	varsJSON, err := json.Marshal(extraVars)
	if err != nil {
		return fmt.Errorf("failed to marshal vars: %v", err)
	}

	// Build ansible-playbook command with validated path
	playbookPath := filepath.Join("ansible", "playbooks", playbook)
	
	// Verify the playbook file exists to prevent execution of non-existent files
	if _, err := os.Stat(playbookPath); err != nil {
		return fmt.Errorf("playbook file not found: %s", playbookPath)
	}
	
	// Use absolute path to prevent path injection
	absPlaybookPath, err := filepath.Abs(playbookPath)
	if err != nil {
		return fmt.Errorf("failed to get absolute path: %v", err)
	}
	
	cmd := exec.Command("ansible-playbook",
		"-i", inventoryFile,
		"-e", string(varsJSON),
		absPlaybookPath,
	)

	// Stream output to frontend
	return a.ansibleRunner.RunPlaybook(a.ctx, cmd)
}

// EmitProgress sends progress updates to the frontend
func (a *App) EmitProgress(message string) {
	runtime.EventsEmit(a.ctx, "updateProgress", message)
}

// EmitStatus sends status updates to the frontend
func (a *App) EmitStatus(status string, success bool) {
	runtime.EventsEmit(a.ctx, "statusUpdate", map[string]interface{}{
		"status":  status,
		"success": success,
	})
}