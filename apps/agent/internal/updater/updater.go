package updater

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// UpdateInfo contains version information from the server
type UpdateInfo struct {
	Version     string `json:"version"`
	DownloadURL string `json:"downloadUrl"`
	Checksum    string `json:"sha256"`
	ReleaseDate string `json:"releaseDate"`
	Changelog   string `json:"changelog"`
	Mandatory   bool   `json:"mandatory"`
}

// Updater handles automatic agent updates
type Updater struct {
	serverURL      string
	currentVersion string
	httpClient     *http.Client
}

// NewUpdater creates a new auto-updater
func NewUpdater(serverURL, currentVersion string) *Updater {
	return &Updater{
		serverURL:      serverURL,
		currentVersion: currentVersion,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// CheckForUpdates checks if a newer version is available
func (u *Updater) CheckForUpdates() (*UpdateInfo, error) {
	url := fmt.Sprintf("%s/agents/updates?os=%s&arch=%s&version=%s",
		u.serverURL, runtime.GOOS, runtime.GOARCH, u.currentVersion)

	resp, err := u.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("check updates: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNoContent || resp.StatusCode == http.StatusNotFound {
		return nil, nil // No update available
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("update check returned HTTP %d", resp.StatusCode)
	}

	var info UpdateInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("parse update info: %w", err)
	}

	return &info, nil
}

// DownloadUpdate downloads the new binary to a temp location
func (u *Updater) DownloadUpdate(update *UpdateInfo) (string, error) {
	log.Printf("Downloading update v%s...", update.Version)

	resp, err := u.httpClient.Get(update.DownloadURL)
	if err != nil {
		return "", fmt.Errorf("download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download returned HTTP %d", resp.StatusCode)
	}

	// Save to temp file
	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}
	tmpFile, err := os.CreateTemp("", fmt.Sprintf("ninjabackup-update-*%s", ext))
	if err != nil {
		return "", fmt.Errorf("create temp file: %w", err)
	}

	// Stream the body through SHA-256 while we write it to disk so we don't
	// have to re-read the file afterwards.
	hasher := sha256.New()
	n, err := io.Copy(io.MultiWriter(tmpFile, hasher), resp.Body)
	if err != nil {
		tmpFile.Close()
		os.Remove(tmpFile.Name())
		return "", fmt.Errorf("write update: %w", err)
	}
	tmpFile.Close()

	log.Printf("Downloaded %d bytes to %s", n, tmpFile.Name())

	// Verify the SHA-256 against the manifest's expected checksum. Protects
	// against MITM, a compromised CDN cache, or partial downloads. We accept
	// "sha256:<hex>" and bare hex.
	if update.Checksum != "" {
		expected := strings.TrimPrefix(update.Checksum, "sha256:")
		actual := hex.EncodeToString(hasher.Sum(nil))
		if !strings.EqualFold(actual, expected) {
			os.Remove(tmpFile.Name())
			return "", fmt.Errorf("checksum mismatch: expected %s, got %s", expected, actual)
		}
		log.Printf("✓ checksum OK (sha256:%s)", actual[:12])
	} else {
		log.Printf("⚠ no checksum supplied — skipping verification")
	}

	// Make executable on Unix
	if runtime.GOOS != "windows" {
		os.Chmod(tmpFile.Name(), 0755)
	}

	return tmpFile.Name(), nil
}

// ApplyUpdate replaces the current binary with the new one
func (u *Updater) ApplyUpdate(newBinaryPath string) error {
	currentPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("get executable path: %w", err)
	}

	currentPath, err = filepath.EvalSymlinks(currentPath)
	if err != nil {
		return fmt.Errorf("resolve symlinks: %w", err)
	}

	log.Printf("Applying update: %s -> %s", newBinaryPath, currentPath)

	if runtime.GOOS == "windows" {
		// Windows can't replace a running binary directly
		// Use a batch script to replace after exit
		return u.windowsUpdate(currentPath, newBinaryPath)
	}

	// Unix: rename the old binary, move new one in, restart
	backupPath := currentPath + ".bak"
	os.Remove(backupPath) // clean up any previous backup

	if err := os.Rename(currentPath, backupPath); err != nil {
		return fmt.Errorf("backup current binary: %w", err)
	}

	if err := os.Rename(newBinaryPath, currentPath); err != nil {
		// Rollback
		os.Rename(backupPath, currentPath)
		return fmt.Errorf("replace binary: %w", err)
	}

	log.Println("Update applied successfully. Restarting...")
	return u.restartService()
}

// windowsUpdate creates a batch script that replaces the binary after the process exits
func (u *Updater) windowsUpdate(currentPath, newPath string) error {
	batchContent := fmt.Sprintf(`@echo off
:retry
timeout /t 2 /nobreak >nul
tasklist /fi "imagename=%s" | find /i "%s" >nul
if not errorlevel 1 goto retry
copy /y "%s" "%s"
del "%s"
net start NinjaBackup
del "%%~f0"
`, filepath.Base(currentPath), filepath.Base(currentPath), newPath, currentPath, newPath)

	batchPath := filepath.Join(os.TempDir(), "ninjabackup_update.bat")
	if err := os.WriteFile(batchPath, []byte(batchContent), 0644); err != nil {
		return fmt.Errorf("write update script: %w", err)
	}

	cmd := exec.Command("cmd.exe", "/c", "start", "/b", batchPath)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start update script: %w", err)
	}

	log.Println("Update script started. Service will restart automatically.")
	return nil
}

// restartService restarts the system service (Unix)
func (u *Updater) restartService() error {
	switch runtime.GOOS {
	case "linux":
		return exec.Command("systemctl", "restart", "ninjabackup").Run()
	case "darwin":
		exec.Command("launchctl", "unload", "/Library/LaunchDaemons/com.ninjabackup.agent.plist").Run()
		return exec.Command("launchctl", "load", "/Library/LaunchDaemons/com.ninjabackup.agent.plist").Run()
	default:
		return fmt.Errorf("restart not supported on %s", runtime.GOOS)
	}
}

// StartAutoUpdateLoop periodically checks for updates
func (u *Updater) StartAutoUpdateLoop(interval time.Duration) {
	log.Printf("Auto-update loop started (check every %s)", interval)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		update, err := u.CheckForUpdates()
		if err != nil {
			log.Printf("Update check failed: %v", err)
			continue
		}

		if update == nil {
			continue // Already up to date
		}

		log.Printf("New version available: v%s (current: v%s)", update.Version, u.currentVersion)

		tmpPath, err := u.DownloadUpdate(update)
		if err != nil {
			log.Printf("Download failed: %v", err)
			continue
		}

		if err := u.ApplyUpdate(tmpPath); err != nil {
			log.Printf("Update failed: %v", err)
			os.Remove(tmpPath)
			continue
		}

		// If we get here on Unix, process will restart
		// On Windows, the batch script handles it
	}
}
