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

// updateSentinel is written to disk just before we restart into a new binary.
// If we find it on startup within the grace window it means the previous update
// binary may have crashed; we roll back automatically.
type updateSentinel struct {
	BackupPath  string    `json:"backupPath"`  // path to the .bak binary
	AppliedAt   time.Time `json:"appliedAt"`   // when the update was applied
	FromVersion string    `json:"fromVersion"` // the version we replaced
	ToVersion   string    `json:"toVersion"`   // the version we attempted
}

func sentinelPath() string {
	return filepath.Join(os.TempDir(), "ninjabackup_update_sentinel.json")
}

// writeSentinel persists the rollback metadata before we exec into the new binary.
func writeSentinel(s updateSentinel) error {
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(sentinelPath(), b, 0600)
}

// readSentinel loads the sentinel file if it exists.
func readSentinel() (*updateSentinel, error) {
	b, err := os.ReadFile(sentinelPath())
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var s updateSentinel
	if err := json.Unmarshal(b, &s); err != nil {
		return nil, err
	}
	return &s, nil
}

// removeSentinel deletes the sentinel file (called once startup is healthy).
func removeSentinel() {
	os.Remove(sentinelPath())
}

// CheckUpdateSentinel should be called early in main(), after basic services
// are up. If a sentinel from a previous update attempt is found AND it was
// written less than graceWindow ago, we assume the new binary crashed on first
// run and we roll the old binary back.
//
// Returns true if a rollback was performed (the process will restart and
// callers should exit).
func CheckUpdateSentinel(graceWindow time.Duration) bool {
	s, err := readSentinel()
	if err != nil {
		log.Printf("[updater] could not read sentinel: %v", err)
		removeSentinel() // corrupt sentinel — remove it
		return false
	}
	if s == nil {
		return false // no pending update
	}

	age := time.Since(s.AppliedAt)
	if age > graceWindow {
		// The previous update ran long enough; it probably worked. Clean up.
		log.Printf("[updater] update sentinel is %s old (> %s grace) — assuming healthy, removing", age.Round(time.Second), graceWindow)
		removeSentinel()
		return false
	}

	// Sentinel is fresh → the previous binary appears to have crashed quickly.
	log.Printf("[updater] ⚠️  update sentinel found (%s old) — rolling back from v%s to v%s",
		age.Round(time.Millisecond), s.ToVersion, s.FromVersion)

	if err := performRollback(s.BackupPath); err != nil {
		log.Printf("[updater] rollback failed: %v — manual intervention required (backup at %s)", err, s.BackupPath)
		removeSentinel() // don't loop forever
		return false
	}

	log.Println("[updater] rollback applied — restarting service")
	removeSentinel()
	return true
}

// MarkStartupHealthy removes the update sentinel once the agent has been running
// long enough that we consider the new binary stable. Call this after your
// health-check window has passed (e.g. 2 minutes after a successful startup).
func MarkStartupHealthy() {
	p := sentinelPath()
	if _, err := os.Stat(p); os.IsNotExist(err) {
		return // nothing to do
	}
	removeSentinel()
	log.Println("[updater] startup health confirmed — update sentinel cleared")
}

// performRollback swaps the backup binary back into place and restarts.
func performRollback(backupPath string) error {
	if runtime.GOOS == "windows" {
		return performWindowsRollback(backupPath)
	}
	return performUnixRollback(backupPath)
}

func performUnixRollback(backupPath string) error {
	currentPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("get executable: %w", err)
	}
	currentPath, err = filepath.EvalSymlinks(currentPath)
	if err != nil {
		return fmt.Errorf("resolve symlinks: %w", err)
	}

	if _, err := os.Stat(backupPath); err != nil {
		return fmt.Errorf("backup binary not found at %s: %w", backupPath, err)
	}

	// Remove the broken new binary and restore the old one.
	if err := os.Remove(currentPath); err != nil {
		return fmt.Errorf("remove broken binary: %w", err)
	}
	if err := os.Rename(backupPath, currentPath); err != nil {
		return fmt.Errorf("restore backup binary: %w", err)
	}
	if err := os.Chmod(currentPath, 0755); err != nil {
		log.Printf("[updater] chmod after rollback: %v (non-fatal)", err)
	}

	u := &Updater{}
	return u.restartService()
}

func performWindowsRollback(backupPath string) error {
	currentPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("get executable: %w", err)
	}

	if _, err := os.Stat(backupPath); err != nil {
		return fmt.Errorf("backup binary not found at %s: %w", backupPath, err)
	}

	batchContent := fmt.Sprintf(`@echo off
:retry
timeout /t 2 /nobreak >nul
tasklist /fi "imagename=%s" | find /i "%s" >nul
if not errorlevel 1 goto retry
copy /y "%s" "%s"
del "%s"
net start NinjaBackup
del "%%~f0"
`, filepath.Base(currentPath), filepath.Base(currentPath), backupPath, currentPath, backupPath)

	batchPath := filepath.Join(os.TempDir(), "ninjabackup_rollback.bat")
	if err := os.WriteFile(batchPath, []byte(batchContent), 0644); err != nil {
		return fmt.Errorf("write rollback script: %w", err)
	}
	cmd := exec.Command("cmd.exe", "/c", "start", "/b", batchPath)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start rollback script: %w", err)
	}
	return nil
}

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

// ApplyUpdate replaces the current binary with the new one.
// On Unix it writes a rollback sentinel before restarting so that if the new
// binary crashes within the grace window the agent can automatically revert.
func (u *Updater) ApplyUpdate(newBinaryPath string, update *UpdateInfo) error {
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
		// Windows can't replace a running binary directly.
		// Use a batch script to replace after exit.
		// Write sentinel so that if the new binary crashes on the first
		// Windows start we have enough info to diagnose (rollback batch
		// handles the rest).
		backupPath := filepath.Join(os.TempDir(), filepath.Base(currentPath)+".bak")
		_ = writeSentinel(updateSentinel{
			BackupPath:  backupPath,
			AppliedAt:   time.Now(),
			FromVersion: u.currentVersion,
			ToVersion:   update.Version,
		})
		return u.windowsUpdate(currentPath, newBinaryPath)
	}

	// Unix: rename the old binary aside, move new one in, write sentinel,
	// then restart.
	backupPath := currentPath + ".bak"
	os.Remove(backupPath) // clean up any previous backup

	if err := os.Rename(currentPath, backupPath); err != nil {
		return fmt.Errorf("backup current binary: %w", err)
	}

	if err := os.Rename(newBinaryPath, currentPath); err != nil {
		// Swap failed — restore immediately without restarting.
		os.Rename(backupPath, currentPath)
		return fmt.Errorf("replace binary: %w", err)
	}

	// Persist rollback metadata BEFORE we hand off to the new binary.
	if err := writeSentinel(updateSentinel{
		BackupPath:  backupPath,
		AppliedAt:   time.Now(),
		FromVersion: u.currentVersion,
		ToVersion:   update.Version,
	}); err != nil {
		log.Printf("[updater] warning: could not write rollback sentinel: %v", err)
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

		if err := u.ApplyUpdate(tmpPath, update); err != nil {
			log.Printf("Update failed: %v", err)
			os.Remove(tmpPath)
			continue
		}

		// If we get here on Unix, process will restart
		// On Windows, the batch script handles it
	}
}
