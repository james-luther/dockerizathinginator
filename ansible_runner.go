package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os/exec"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// AnsibleRunner handles Ansible playbook execution
type AnsibleRunner struct{}

// NewAnsibleRunner creates a new AnsibleRunner
func NewAnsibleRunner() *AnsibleRunner {
	return &AnsibleRunner{}
}

// RunPlaybook executes an Ansible playbook and streams output
func (ar *AnsibleRunner) RunPlaybook(ctx context.Context, cmd *exec.Cmd) error {
	// Get stdout and stderr pipes
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdout pipe: %v", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to get stderr pipe: %v", err)
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start ansible: %v", err)
	}

	// Stream stdout
	go ar.streamOutput(ctx, stdout, "stdout")
	go ar.streamOutput(ctx, stderr, "stderr")

	// Wait for command to complete
	if err := cmd.Wait(); err != nil {
		runtime.EventsEmit(ctx, "ansibleError", err.Error())
		return fmt.Errorf("ansible playbook failed: %v", err)
	}

	runtime.EventsEmit(ctx, "ansibleComplete", "Playbook completed successfully")
	return nil
}

// streamOutput streams command output to the frontend
func (ar *AnsibleRunner) streamOutput(ctx context.Context, reader io.Reader, streamType string) {
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		line := scanner.Text()
		
		// Parse Ansible output for better formatting
		if parsed := ar.parseAnsibleOutput(line); parsed != "" {
			runtime.EventsEmit(ctx, "ansibleOutput", map[string]interface{}{
				"type":    streamType,
				"message": parsed,
				"raw":     line,
			})
		}
	}
}

// parseAnsibleOutput parses Ansible output for better display
func (ar *AnsibleRunner) parseAnsibleOutput(line string) string {
	// Skip empty lines
	if strings.TrimSpace(line) == "" {
		return ""
	}

	// Task headers
	if strings.HasPrefix(line, "TASK [") {
		task := strings.TrimPrefix(line, "TASK [")
		task = strings.TrimSuffix(task, "]")
		return fmt.Sprintf("📋 Task: %s", task)
	}

	// Play headers
	if strings.HasPrefix(line, "PLAY [") {
		play := strings.TrimPrefix(line, "PLAY [")
		play = strings.TrimSuffix(play, "]")
		return fmt.Sprintf("🎬 Play: %s", play)
	}

	// Success indicators
	if strings.Contains(line, "ok:") {
		return fmt.Sprintf("✅ %s", line)
	}

	// Changed indicators
	if strings.Contains(line, "changed:") {
		return fmt.Sprintf("🔄 %s", line)
	}

	// Failed indicators
	if strings.Contains(line, "failed:") || strings.Contains(line, "FAILED!") {
		return fmt.Sprintf("❌ %s", line)
	}

	// Warning indicators
	if strings.Contains(line, "WARNING") {
		return fmt.Sprintf("⚠️ %s", line)
	}

	// Skip some verbose output
	if strings.HasPrefix(line, "PLAY RECAP") {
		return "📊 Play Recap:"
	}

	// Return cleaned line for other output
	return strings.TrimSpace(line)
}

// CheckAnsibleInstalled checks if Ansible is installed
func (ar *AnsibleRunner) CheckAnsibleInstalled() (bool, string) {
	cmd := exec.Command("ansible", "--version")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return false, ""
	}
	
	lines := strings.Split(string(output), "\n")
	if len(lines) > 0 {
		return true, lines[0]
	}
	
	return true, "Ansible installed"
}

// InstallAnsible attempts to install Ansible (Windows users need WSL or manual install)
func (ar *AnsibleRunner) InstallAnsible() error {
	// Check the OS and provide appropriate instructions
	// For Windows, we'll return instructions since it requires WSL or Cygwin
	return fmt.Errorf("Please install Ansible manually. On Windows, use WSL2 or install via pip: pip install ansible")
}