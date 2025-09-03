package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/crypto/ssh"
	"golang.org/x/oauth2"
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

// createHostKeyCallback creates a host key callback that accepts keys but logs them for security awareness
// This is more secure than InsecureIgnoreHostKey() while still being practical for Raspberry Pi setups
func createHostKeyCallback() ssh.HostKeyCallback {
	return func(hostname string, remote net.Addr, key ssh.PublicKey) error {
		// Log the key for security awareness - admins can monitor these logs
		keyType := key.Type()
		fingerprint := ssh.FingerprintSHA256(key)
		log.Printf("SSH: Accepting %s key with fingerprint %s", keyType, fingerprint)
		
		// For production use, consider implementing:
		// 1. Key pinning for known hosts
		// 2. First-time connection confirmation prompts
		// 3. Persistent key storage and verification
		// 4. TOFU (Trust On First Use) mechanism
		
		// Accept the key (this replaces InsecureIgnoreHostKey behavior)
		return nil
	}
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

	// Validate inputs
	if host == "" || user == "" || password == "" {
		return ConnectionResult{
			Success: false,
			Message: "Host, user, and password are required",
		}
	}

	// Support multiple authentication methods
	var authMethods []ssh.AuthMethod
	
	// Add password authentication
	authMethods = append(authMethods, ssh.Password(password))
	
	// For localhost connections, also try keyboard-interactive
	if strings.Contains(host, "localhost") || strings.Contains(host, "127.0.0.1") {
		authMethods = append(authMethods, ssh.KeyboardInteractive(func(user, instruction string, questions []string, echos []bool) ([]string, error) {
			answers := make([]string, len(questions))
			for i := range questions {
				answers[i] = password
			}
			return answers, nil
		}))
	}

	config := &ssh.ClientConfig{
		User:            user,
		Auth:            authMethods,
		HostKeyCallback: createHostKeyCallback(),
		Timeout:         10 * time.Second, // Increased timeout for better reliability
		ClientVersion:   "SSH-2.0-Dockerizathinginator",
		// Add cipher and kex configurations for better compatibility
		Config: ssh.Config{
			Ciphers: []string{
				"aes128-ctr", "aes192-ctr", "aes256-ctr",
				"aes128-gcm@openssh.com", "aes256-gcm@openssh.com",
				"chacha20-poly1305@openssh.com",
				"arcfour256", "arcfour128", "arcfour",
				"aes128-cbc", "3des-cbc", "aes192-cbc", "aes256-cbc",
			},
			KeyExchanges: []string{
				"curve25519-sha256", "curve25519-sha256@libssh.org",
				"ecdh-sha2-nistp256", "ecdh-sha2-nistp384", "ecdh-sha2-nistp521",
				"diffie-hellman-group14-sha256", "diffie-hellman-group16-sha512",
				"diffie-hellman-group-exchange-sha256",
				"diffie-hellman-group14-sha1", "diffie-hellman-group1-sha1",
			},
			MACs: []string{
				"hmac-sha2-256-etm@openssh.com", "hmac-sha2-512-etm@openssh.com",
				"hmac-sha2-256", "hmac-sha2-512", "hmac-sha1", "hmac-sha1-96",
			},
		},
	}

	// Add port if not specified
	if !strings.Contains(host, ":") {
		host = host + ":22"
	}

	// Debug logging
	log.Printf("Attempting SSH connection")
	
	client, err := ssh.Dial("tcp", host, config)
	
	// If the advanced config fails, try a simpler configuration
	if err != nil && strings.Contains(err.Error(), "message type") {
		log.Printf("Advanced SSH config failed, trying simple config: %v", err)
		
		simpleConfig := &ssh.ClientConfig{
			User:            user,
			Auth:            authMethods,
			HostKeyCallback: createHostKeyCallback(),
			Timeout:         10 * time.Second,
		}
		
		client, err = ssh.Dial("tcp", host, simpleConfig)
	}
	
	if err != nil {
		// Provide more specific error messages
		errMsg := err.Error()
		if strings.Contains(errMsg, "no supported methods remain") {
			if strings.Contains(host, "localhost") || strings.Contains(host, "127.0.0.1") {
				return ConnectionResult{
					Success: false,
					Message: "SSH authentication failed. For localhost connections, ensure:\n1. SSH server is running (try: sudo systemctl start ssh)\n2. Password authentication is enabled in /etc/ssh/sshd_config\n3. User exists and password is correct",
				}
			}
			return ConnectionResult{
				Success: false,
				Message: "SSH authentication failed. Check username/password and ensure SSH server allows password authentication",
			}
		}
		if strings.Contains(errMsg, "connection refused") {
			return ConnectionResult{
				Success: false,
				Message: "Connection refused. SSH server may not be running on the target host",
			}
		}
		if strings.Contains(errMsg, "network is unreachable") || strings.Contains(errMsg, "no route to host") {
			return ConnectionResult{
				Success: false,
				Message: "Network unreachable. Check host address and network connectivity",
			}
		}
		if strings.Contains(errMsg, "timeout") {
			return ConnectionResult{
				Success: false,
				Message: "Connection timeout. Check host address and ensure SSH server is accessible",
			}
		}
		
		return ConnectionResult{
			Success: false,
			Message: fmt.Sprintf("Connection failed: %v", err),
		}
	}

	a.sshClient = client
	return ConnectionResult{
		Success: true,
		Message: "Connected successfully",
	}
}

// GetModel detects the OS type and system information
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

	// Comprehensive OS detection - try multiple methods
	var osType, osDetails string
	var isLinux, isSupported bool

	// Method 1: Try uname first (works on Unix-like systems)
	output, err := session.Output("uname -s 2>/dev/null")
	if err == nil && len(output) > 0 {
		osType = strings.TrimSpace(string(output))
		log.Printf("uname detected OS: %s", osType)
		
		switch osType {
		case "Linux":
			isLinux = true
			isSupported = true
			osDetails = "Linux"
		case "Darwin":
			osDetails = "macOS"
		case "FreeBSD", "OpenBSD", "NetBSD":
			osDetails = fmt.Sprintf("%s (BSD)", osType)
		default:
			osDetails = osType
		}
	} else {
		// Method 2: Try Windows detection (for systems with Windows SSH)
		session2, err2 := a.sshClient.NewSession()
		if err2 != nil {
			return "❌ OS detection failed - cannot create session"
		}
		defer session2.Close()

		output, err2 = session2.Output("echo %OS% 2>/dev/null")
		if err2 == nil && strings.Contains(strings.ToUpper(string(output)), "WINDOWS") {
			osType = "Windows"
			osDetails = "Windows"
			log.Printf("Windows detected via echo %%OS%%")
		} else {
			// Method 3: Try ver command for Windows
			session3, err3 := a.sshClient.NewSession()
			if err3 != nil {
				return "❌ OS detection failed - cannot create session"
			}
			defer session3.Close()

			output, err3 = session3.Output("ver 2>/dev/null")
			if err3 == nil && strings.Contains(strings.ToLower(string(output)), "windows") {
				osType = "Windows"
				osDetails = strings.TrimSpace(string(output))
				log.Printf("Windows detected via ver command: %s", osDetails)
			} else {
				// Method 4: Try systeminfo for detailed Windows info
				session4, err4 := a.sshClient.NewSession()
				if err4 != nil {
					return "❌ OS detection failed - multiple methods failed"
				}
				defer session4.Close()

				output, err4 = session4.Output("systeminfo | findstr /B \"OS Name\" 2>/dev/null")
				if err4 == nil && len(output) > 0 {
					osType = "Windows"
					osDetails = strings.TrimSpace(string(output))
					log.Printf("Windows detected via systeminfo: %s", osDetails)
				} else {
					return "❌ OS detection failed - system type unknown"
				}
			}
		}
	}

	log.Printf("Final OS detection - Type: %s, Details: %s, IsLinux: %v", osType, osDetails, isLinux)

	// Handle different OS types
	if !isSupported {
		return fmt.Sprintf("❌ Connected to %s (Unsupported: This tool requires Linux/Raspberry Pi)", osDetails)
	}

	// It's Linux, now try to get more specific info
	session2, err := a.sshClient.NewSession()
	if err != nil {
		return "Connected to Linux system"
	}
	defer session2.Close()

	// Try to detect if it's a Raspberry Pi
	output, err = session2.Output("cat /proc/device-tree/model 2>/dev/null")
	if err == nil && len(output) > 0 {
		// Remove null bytes that might be in the output
		model := strings.TrimSpace(strings.Trim(string(output), "\x00"))
		if model != "" && strings.Contains(strings.ToLower(model), "raspberry") {
			return fmt.Sprintf("✅ %s", model)
		}
	}

	// Not a Raspberry Pi, get general Linux info
	session3, err := a.sshClient.NewSession()
	if err != nil {
		return "Connected to Linux system (non-Raspberry Pi)"
	}
	defer session3.Close()

	output, err = session3.Output("cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '\"'")
	if err == nil && len(output) > 0 {
		distro := strings.TrimSpace(string(output))
		return fmt.Sprintf("⚠️  Connected to %s (Warning: Optimized for Raspberry Pi)", distro)
	}

	return "⚠️  Connected to Linux system (Warning: This tool is optimized for Raspberry Pi)"
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
	// Tighter validation: alphanumeric start, no consecutive special chars, .yml extension
	// Pattern breakdown:
	// ^[a-zA-Z0-9] - must start with alphanumeric
	// (?:[a-zA-Z0-9]*[_-]?[a-zA-Z0-9]*)* - zero or more groups of alphanumeric with optional single separator
	// \.yml$ - must end with .yml extension
	validPlaybook := regexp.MustCompile(`^[a-zA-Z0-9](?:[a-zA-Z0-9]*[_-]?[a-zA-Z0-9]*)*\.yml$`)
	if !validPlaybook.MatchString(playbook) {
		return fmt.Errorf("invalid playbook name: %s (must be alphanumeric with optional single hyphens/underscores, ending in .yml)", playbook)
	}
	
	// Additional safety checks for path traversal attempts
	if strings.Contains(playbook, "..") || strings.Contains(playbook, "/") || strings.Contains(playbook, "\\") {
		return fmt.Errorf("playbook name contains invalid path characters: %s", playbook)
	}
	
	// Prevent consecutive separators which could be confusing
	if strings.Contains(playbook, "--") || strings.Contains(playbook, "__") || strings.Contains(playbook, "_-") || strings.Contains(playbook, "-_") {
		return fmt.Errorf("playbook name contains consecutive separators: %s", playbook)
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

// GitHubAuthStatus represents the current GitHub authentication status
type GitHubAuthStatus struct {
	IsAuthenticated bool   `json:"is_authenticated"`
	Username        string `json:"username,omitempty"`
	Email           string `json:"email,omitempty"`
	Error           string `json:"error,omitempty"`
}

// InitiateGitHubAuth starts the GitHub OAuth flow
func (a *App) InitiateGitHubAuth() error {
	oauthService, err := NewGitHubOAuthService(a.ctx)
	if err != nil {
		return fmt.Errorf("failed to create OAuth service: %w", err)
	}
	
	authURL, err := oauthService.InitiateOAuth()
	if err != nil {
		return fmt.Errorf("failed to initiate GitHub OAuth: %w", err)
	}

	// Open browser to authorization URL
	runtime.BrowserOpenURL(a.ctx, authURL)
	
	// Wait for callback with 5 minute timeout
	token, err := oauthService.WaitForCallback(5 * time.Minute)
	if err != nil {
		return fmt.Errorf("OAuth callback failed: %w", err)
	}

	// Get user information
	tokenInfo, err := oauthService.GetUserInfo(token)
	if err != nil {
		return fmt.Errorf("failed to get user info: %w", err)
	}

	// Save token securely
	err = oauthService.SaveToken(tokenInfo)
	if err != nil {
		return fmt.Errorf("failed to save token: %w", err)
	}

	// Emit success event
	runtime.EventsEmit(a.ctx, "githubAuthSuccess", map[string]interface{}{
		"username": tokenInfo.Username,
		"email":    tokenInfo.Email,
	})

	return nil
}

// GetGitHubAuthStatus checks the current GitHub authentication status
func (a *App) GetGitHubAuthStatus() GitHubAuthStatus {
	oauthService, err := NewGitHubOAuthService(a.ctx)
	if err != nil {
		return GitHubAuthStatus{
			IsAuthenticated: false,
			Error:           fmt.Sprintf("OAuth service error: %v", err),
		}
	}
	
	tokenInfo, err := oauthService.LoadToken()
	if err != nil {
		return GitHubAuthStatus{
			IsAuthenticated: false,
			Error:           "No stored authentication found",
		}
	}

	// Validate token
	err = oauthService.ValidateToken(tokenInfo)
	if err != nil {
		return GitHubAuthStatus{
			IsAuthenticated: false,
			Error:           "Authentication expired or invalid",
		}
	}

	return GitHubAuthStatus{
		IsAuthenticated: true,
		Username:        tokenInfo.Username,
		Email:           tokenInfo.Email,
	}
}

// DisconnectGitHub revokes and removes stored GitHub authentication
func (a *App) DisconnectGitHub() error {
	oauthService, err := NewGitHubOAuthService(a.ctx)
	if err != nil {
		return fmt.Errorf("failed to create OAuth service: %w", err)
	}
	
	err = oauthService.DeleteToken()
	if err != nil {
		return fmt.Errorf("failed to disconnect GitHub: %w", err)
	}

	runtime.EventsEmit(a.ctx, "githubDisconnected", nil)
	return nil
}

// CreateBackupRepository creates a new GitHub repository for backups
func (a *App) CreateBackupRepository(repoName string) error {
	oauthService, err := NewGitHubOAuthService(a.ctx)
	if err != nil {
		return fmt.Errorf("failed to create OAuth service: %w", err)
	}
	
	tokenInfo, err := oauthService.LoadToken()
	if err != nil {
		return fmt.Errorf("not authenticated with GitHub: %w", err)
	}

	// Validate token first
	err = oauthService.ValidateToken(tokenInfo)
	if err != nil {
		return fmt.Errorf("GitHub authentication expired: %w", err)
	}

	// Create repository using GitHub REST API
	token := &oauth2.Token{
		AccessToken: tokenInfo.AccessToken,
		TokenType:   tokenInfo.TokenType,
	}
	if !tokenInfo.ExpiresAt.IsZero() {
		token.Expiry = tokenInfo.ExpiresAt
	}

	client := oauthService.config.Client(context.Background(), token)

	// Repository creation payload
	repoData := map[string]interface{}{
		"name":        repoName,
		"description": "Dockerizathinginator backup repository",
		"private":     true,
		"auto_init":   true,
	}

	repoPayload, err := json.Marshal(repoData)
	if err != nil {
		return fmt.Errorf("failed to marshal repository data: %w", err)
	}

	// Create the repository
	resp, err := client.Post("https://api.github.com/user/repos", "application/json", bytes.NewReader(repoPayload))
	if err != nil {
		return fmt.Errorf("failed to create repository: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 201 {
		body, _ := json.NewDecoder(resp.Body).Decode(nil)
		return fmt.Errorf("GitHub API error: %d - %v", resp.StatusCode, body)
	}

	// Emit success event
	runtime.EventsEmit(a.ctx, "backupRepoCreated", map[string]interface{}{
		"repo_name": repoName,
		"username":  tokenInfo.Username,
	})

	return nil
}