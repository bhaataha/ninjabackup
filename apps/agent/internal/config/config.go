package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

// Config holds all agent configuration
type Config struct {
	// Identity
	AgentID           string `json:"agent_id"`
	TenantID          string `json:"tenant_id"`
	RegistrationToken string `json:"registration_token,omitempty"`

	// Server connection
	ServerURL string `json:"server_url"`
	APIKey    string `json:"api_key,omitempty"`

	// Restic
	ResticPath       string `json:"restic_path"`
	ResticRepository string `json:"restic_repository"` // e.g., s3:s3.amazonaws.com/bucket
	ResticPassword   string `json:"restic_password"`   // encryption passphrase

	// Backup settings
	BackupPaths    []string `json:"backup_paths"`
	ExcludePattern []string `json:"exclude_patterns"`

	// Performance
	BandwidthLimitMbps int    `json:"bandwidth_limit_mbps"`
	CPUPriority        string `json:"cpu_priority"` // low, normal, high

	// Features
	VSSEnabled         bool `json:"vss_enabled"`
	CompressionEnabled bool `json:"compression_enabled"`

	// Heartbeat interval in seconds
	HeartbeatInterval int `json:"heartbeat_interval"`
}

// Default returns a config with sensible defaults
func Default() *Config {
	return &Config{
		ServerURL:          "http://localhost:3038/api/v1",
		ResticPath:         findResticBinary(),
		BandwidthLimitMbps: 0, // unlimited
		CPUPriority:        "normal",
		VSSEnabled:         runtime.GOOS == "windows",
		CompressionEnabled: true,
		HeartbeatInterval:  60, // seconds
	}
}

// configDir returns the config directory path
func configDir() string {
	switch runtime.GOOS {
	case "windows":
		appData := os.Getenv("PROGRAMDATA")
		if appData == "" {
			appData = `C:\ProgramData`
		}
		return filepath.Join(appData, "NinjaBackup")
	case "darwin":
		return "/Library/Application Support/NinjaBackup"
	default: // linux
		return "/etc/ninjabackup"
	}
}

// configPath returns the full path to the config file
func configPath() string {
	return filepath.Join(configDir(), "config.json")
}

// Load reads config from disk, or returns defaults if not found
func Load() (*Config, error) {
	cfg := Default()

	data, err := os.ReadFile(configPath())
	if err != nil {
		if os.IsNotExist(err) {
			// Check for registration token in CLI args
			if len(os.Args) >= 3 && os.Args[1] == "--register" {
				cfg.RegistrationToken = os.Args[2]
			}
			if len(os.Args) >= 5 && os.Args[3] == "--server" {
				cfg.ServerURL = os.Args[4]
			}
			return cfg, nil
		}
		return nil, fmt.Errorf("reading config: %w", err)
	}

	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("parsing config: %w", err)
	}

	return cfg, nil
}

// Save writes the current config to disk
func Save(cfg *Config) error {
	dir := configDir()
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("creating config dir: %w", err)
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling config: %w", err)
	}

	if err := os.WriteFile(configPath(), data, 0600); err != nil {
		return fmt.Errorf("writing config: %w", err)
	}

	return nil
}

// findResticBinary attempts to locate the restic executable
func findResticBinary() string {
	// Check common locations
	candidates := []string{}

	switch runtime.GOOS {
	case "windows":
		candidates = []string{
			`C:\Program Files\NinjaBackup\restic.exe`,
			`C:\Program Files\restic\restic.exe`,
			"restic.exe",
		}
	case "darwin":
		candidates = []string{
			"/usr/local/bin/restic",
			"/opt/homebrew/bin/restic",
			"restic",
		}
	default:
		candidates = []string{
			"/usr/bin/restic",
			"/usr/local/bin/restic",
			"/snap/bin/restic",
			"restic",
		}
	}

	for _, path := range candidates {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}

	return "restic" // fallback to PATH
}
