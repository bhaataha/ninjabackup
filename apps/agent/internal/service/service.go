package service

import (
	"fmt"
	"log"
	"os/exec"
	"runtime"
)

const ServiceName = "NinjaBackup"
const ServiceDisplayName = "NinjaBackup Agent"
const ServiceDescription = "NinjaBackup backup agent - manages file and image backups"

// Install installs the agent as a system service
func Install(executablePath string) error {
	switch runtime.GOOS {
	case "windows":
		return installWindows(executablePath)
	case "linux":
		return installLinux(executablePath)
	case "darwin":
		return installMac(executablePath)
	default:
		return fmt.Errorf("unsupported OS: %s", runtime.GOOS)
	}
}

// Uninstall removes the agent system service
func Uninstall() error {
	switch runtime.GOOS {
	case "windows":
		return uninstallWindows()
	case "linux":
		return uninstallLinux()
	case "darwin":
		return uninstallMac()
	default:
		return fmt.Errorf("unsupported OS: %s", runtime.GOOS)
	}
}

// Status checks the service status
func Status() (string, error) {
	switch runtime.GOOS {
	case "windows":
		return statusWindows()
	default:
		return statusLinux()
	}
}

// ─── Windows ─────────────────────────────────────────────

func installWindows(execPath string) error {
	log.Println("Installing Windows service...")

	// Use sc.exe to create the service
	cmd := exec.Command("sc.exe", "create", ServiceName,
		"binPath=", fmt.Sprintf(`"%s" --service`, execPath),
		"start=", "auto",
		"DisplayName=", ServiceDisplayName,
	)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("sc create failed: %s (%s)", err, string(output))
	}

	// Set description
	cmd = exec.Command("sc.exe", "description", ServiceName, ServiceDescription)
	cmd.Run()

	// Set recovery options (restart on failure)
	cmd = exec.Command("sc.exe", "failure", ServiceName,
		"reset=", "86400",
		"actions=", "restart/60000/restart/60000/restart/60000",
	)
	cmd.Run()

	// Start the service
	cmd = exec.Command("sc.exe", "start", ServiceName)
	if output, err := cmd.CombinedOutput(); err != nil {
		log.Printf("Warning: service start failed: %s (%s)", err, string(output))
	}

	log.Println("Windows service installed and started")
	return nil
}

func uninstallWindows() error {
	exec.Command("sc.exe", "stop", ServiceName).Run()
	cmd := exec.Command("sc.exe", "delete", ServiceName)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("sc delete failed: %s (%s)", err, string(output))
	}
	log.Println("Windows service removed")
	return nil
}

func statusWindows() (string, error) {
	cmd := exec.Command("sc.exe", "query", ServiceName)
	output, err := cmd.Output()
	if err != nil {
		return "NOT_INSTALLED", nil
	}
	out := string(output)
	if contains(out, "RUNNING") {
		return "RUNNING", nil
	}
	if contains(out, "STOPPED") {
		return "STOPPED", nil
	}
	return "UNKNOWN", nil
}

// ─── Linux (systemd) ─────────────────────────────────────

const systemdUnit = `[Unit]
Description=NinjaBackup Agent
After=network.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=%s --service
Restart=always
RestartSec=30
User=root
Environment=HOME=/root
WorkingDirectory=/opt/ninjabackup
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ninjabackup

# Security hardening
ProtectSystem=full
NoNewPrivileges=false
PrivateTmp=true

[Install]
WantedBy=multi-user.target
`

func installLinux(execPath string) error {
	log.Println("Installing systemd service...")

	unitContent := fmt.Sprintf(systemdUnit, execPath)
	unitPath := "/etc/systemd/system/ninjabackup.service"

	if err := writeFile(unitPath, []byte(unitContent), 0644); err != nil {
		return fmt.Errorf("write unit file: %w", err)
	}

	exec.Command("systemctl", "daemon-reload").Run()
	exec.Command("systemctl", "enable", "ninjabackup").Run()

	if output, err := exec.Command("systemctl", "start", "ninjabackup").CombinedOutput(); err != nil {
		return fmt.Errorf("start service: %s (%s)", err, string(output))
	}

	log.Println("Systemd service installed and started")
	return nil
}

func uninstallLinux() error {
	exec.Command("systemctl", "stop", "ninjabackup").Run()
	exec.Command("systemctl", "disable", "ninjabackup").Run()
	exec.Command("rm", "/etc/systemd/system/ninjabackup.service").Run()
	exec.Command("systemctl", "daemon-reload").Run()
	log.Println("Systemd service removed")
	return nil
}

func statusLinux() (string, error) {
	cmd := exec.Command("systemctl", "is-active", "ninjabackup")
	output, err := cmd.Output()
	if err != nil {
		return "NOT_INSTALLED", nil
	}
	status := string(output)
	if contains(status, "active") {
		return "RUNNING", nil
	}
	return "STOPPED", nil
}

// ─── macOS (launchd) ─────────────────────────────────────

const launchdPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ninjabackup.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>%s</string>
        <string>--service</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/ninjabackup.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/ninjabackup.err</string>
</dict>
</plist>
`

func installMac(execPath string) error {
	log.Println("Installing launchd service...")

	plistContent := fmt.Sprintf(launchdPlist, execPath)
	plistPath := "/Library/LaunchDaemons/com.ninjabackup.agent.plist"

	if err := writeFile(plistPath, []byte(plistContent), 0644); err != nil {
		return fmt.Errorf("write plist: %w", err)
	}

	if output, err := exec.Command("launchctl", "load", plistPath).CombinedOutput(); err != nil {
		return fmt.Errorf("launchctl load: %s (%s)", err, string(output))
	}

	log.Println("Launchd service installed and started")
	return nil
}

func uninstallMac() error {
	plistPath := "/Library/LaunchDaemons/com.ninjabackup.agent.plist"
	exec.Command("launchctl", "unload", plistPath).Run()
	exec.Command("rm", plistPath).Run()
	log.Println("Launchd service removed")
	return nil
}

// ─── Helpers ─────────────────────────────────────────────

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsImpl(s, substr))
}

func containsImpl(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func writeFile(path string, data []byte, perm uint32) error {
	return exec.Command("bash", "-c", fmt.Sprintf("echo '%s' > %s && chmod %o %s", string(data), path, perm, path)).Run()
}
