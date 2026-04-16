package restic

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/ninjabackup/agent/internal/config"
	"github.com/ninjabackup/agent/internal/throttle"
)

// Engine wraps the Restic CLI for backup operations
type Engine struct {
	cfg        *config.Config
	resticPath string
	throttler  *throttle.Throttler // optional — sets CPU priority on restic processes
}

// SetThrottler wires a bandwidth/CPU throttler into the engine.
// Must be called before any backup or restore operation.
func (e *Engine) SetThrottler(t *throttle.Throttler) {
	e.throttler = t
}

// BackupResult contains the summary of a backup operation
type BackupResult struct {
	SnapshotID     string    `json:"snapshot_id"`
	FilesNew       int       `json:"files_new"`
	FilesChanged   int       `json:"files_changed"`
	FilesUnchanged int       `json:"files_unmodified"`
	BytesAdded     int64     `json:"data_added"`
	BytesTotal     int64     `json:"total_bytes_processed"`
	Duration       float64   `json:"duration"`
	StartTime      time.Time `json:"start_time"`
	EndTime        time.Time `json:"end_time"`
}

// SnapshotInfo contains info about a restic snapshot
type SnapshotInfo struct {
	ID       string   `json:"short_id"`
	Time     string   `json:"time"`
	Paths    []string `json:"paths"`
	Hostname string   `json:"hostname"`
	Tags     []string `json:"tags"`
}

// ResticProgress is emitted during backup via --json
type ResticProgress struct {
	MessageType    string  `json:"message_type"` // "status" or "summary"
	SecondsElapsed float64 `json:"seconds_elapsed,omitempty"`
	BytesDone      int64   `json:"bytes_done,omitempty"`
	TotalBytes     int64   `json:"total_bytes,omitempty"`
	FilesDone      int     `json:"files_done,omitempty"`
	TotalFiles     int     `json:"total_files,omitempty"`
	PercentDone    float64 `json:"percent_done,omitempty"`

	// Summary fields (message_type == "summary")
	FilesNew       int   `json:"files_new,omitempty"`
	FilesChanged   int   `json:"files_changed,omitempty"`
	FilesUnchanged int   `json:"files_unmodified,omitempty"`
	DataAdded      int64 `json:"data_added,omitempty"`
	SnapshotID     string `json:"snapshot_id,omitempty"`
}

// ProgressCallback is called with progress updates during backup
type ProgressCallback func(progress ResticProgress)

// NewEngine creates a new Restic wrapper
func NewEngine(cfg *config.Config) *Engine {
	return &Engine{
		cfg:        cfg,
		resticPath: cfg.ResticPath,
	}
}

// InitRepo initializes a new Restic repository if it doesn't exist
func (e *Engine) InitRepo() error {
	log.Println("Initializing Restic repository...")
	cmd := e.buildCommand("init")
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Check if already initialized
		if strings.Contains(string(output), "already initialized") ||
			strings.Contains(string(output), "already exists") {
			log.Println("Repository already initialized")
			return nil
		}
		return fmt.Errorf("restic init failed: %s", string(output))
	}
	log.Println("Repository initialized successfully")
	return nil
}

// Backup performs a backup of the specified paths
func (e *Engine) Backup(paths []string, excludes []string, tags []string, onProgress ProgressCallback) (*BackupResult, error) {
	startTime := time.Now()
	log.Printf("Starting backup of %d paths...", len(paths))

	args := []string{"backup", "--json"}

	// Add paths
	args = append(args, paths...)

	// Add excludes
	for _, pattern := range excludes {
		args = append(args, "--exclude", pattern)
	}

	// Add tags
	for _, tag := range tags {
		args = append(args, "--tag", tag)
	}

	// Bandwidth limit
	if e.cfg.BandwidthLimitMbps > 0 {
		args = append(args, "--limit-upload", fmt.Sprintf("%d", e.cfg.BandwidthLimitMbps*1024))
	}

	// Compression
	if e.cfg.CompressionEnabled {
		args = append(args, "--compression", "auto")
	}

	cmd := e.buildCommand(args[0], args[1:]...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("stdout pipe: %w", err)
	}

	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start restic: %w", err)
	}

	// Apply CPU scheduling priority so restic doesn't starve interactive work.
	if e.throttler != nil && cmd.Process != nil {
		e.throttler.ApplyToProcess(cmd.Process.Pid)
	}

	var result BackupResult
	result.StartTime = startTime

	// Parse JSON progress output line by line
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		var progress ResticProgress
		if err := json.Unmarshal([]byte(line), &progress); err != nil {
			continue
		}

		if progress.MessageType == "status" && onProgress != nil {
			onProgress(progress)
		}

		if progress.MessageType == "summary" {
			result.SnapshotID = progress.SnapshotID
			result.FilesNew = progress.FilesNew
			result.FilesChanged = progress.FilesChanged
			result.FilesUnchanged = progress.FilesUnchanged
			result.BytesAdded = progress.DataAdded
		}
	}

	if err := cmd.Wait(); err != nil {
		return nil, fmt.Errorf("restic backup failed: %w", err)
	}

	result.EndTime = time.Now()
	result.Duration = result.EndTime.Sub(result.StartTime).Seconds()

	log.Printf("Backup complete: snapshot=%s, new=%d, changed=%d, added=%s",
		result.SnapshotID, result.FilesNew, result.FilesChanged, formatBytes(result.BytesAdded))

	return &result, nil
}

// Restore restores files from a snapshot
func (e *Engine) Restore(snapshotID string, targetPath string, include []string) error {
	log.Printf("Restoring snapshot %s to %s...", snapshotID, targetPath)

	args := []string{"restore", snapshotID, "--target", targetPath, "--json"}

	for _, pattern := range include {
		args = append(args, "--include", pattern)
	}

	cmd := e.buildCommand(args[0], args[1:]...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start restic restore: %w", err)
	}

	// Apply CPU scheduling priority to the restore process.
	if e.throttler != nil && cmd.Process != nil {
		e.throttler.ApplyToProcess(cmd.Process.Pid)
	}

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("restic restore failed: %w", err)
	}

	log.Println("Restore complete")
	return nil
}

// ListSnapshots returns all snapshots in the repository
func (e *Engine) ListSnapshots() ([]SnapshotInfo, error) {
	cmd := e.buildCommand("snapshots", "--json")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("list snapshots: %w", err)
	}

	var snapshots []SnapshotInfo
	if err := json.Unmarshal(output, &snapshots); err != nil {
		return nil, fmt.Errorf("parse snapshots: %w", err)
	}

	return snapshots, nil
}

// Forget removes old snapshots based on retention policy
func (e *Engine) Forget(keepDaily, keepWeekly, keepMonthly, keepYearly int, prune bool) error {
	log.Println("Applying retention policy...")

	args := []string{"forget",
		"--keep-daily", fmt.Sprintf("%d", keepDaily),
		"--keep-weekly", fmt.Sprintf("%d", keepWeekly),
		"--keep-monthly", fmt.Sprintf("%d", keepMonthly),
		"--keep-yearly", fmt.Sprintf("%d", keepYearly),
	}

	if prune {
		args = append(args, "--prune")
	}

	cmd := e.buildCommand(args[0], args[1:]...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("restic forget failed: %s", string(output))
	}

	log.Println("Retention policy applied successfully")
	return nil
}

// Check verifies the repository integrity
func (e *Engine) Check() error {
	log.Println("Checking repository integrity...")
	cmd := e.buildCommand("check")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("restic check failed: %s", string(output))
	}
	log.Println("Repository integrity verified")
	return nil
}

// Stats returns repository statistics
func (e *Engine) Stats() (map[string]interface{}, error) {
	cmd := e.buildCommand("stats", "--json")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("stats: %w", err)
	}

	var stats map[string]interface{}
	if err := json.Unmarshal(output, &stats); err != nil {
		return nil, fmt.Errorf("parse stats: %w", err)
	}

	return stats, nil
}

// buildCommand creates a restic command with the correct environment
func (e *Engine) buildCommand(command string, args ...string) *exec.Cmd {
	fullArgs := append([]string{command}, args...)
	cmd := exec.Command(e.resticPath, fullArgs...)

	// Set environment variables for Restic
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("RESTIC_REPOSITORY=%s", e.cfg.ResticRepository),
		fmt.Sprintf("RESTIC_PASSWORD=%s", e.cfg.ResticPassword),
	)

	// S3 credentials if configured
	if awsKey := os.Getenv("AWS_ACCESS_KEY_ID"); awsKey != "" {
		cmd.Env = append(cmd.Env,
			fmt.Sprintf("AWS_ACCESS_KEY_ID=%s", awsKey),
			fmt.Sprintf("AWS_SECRET_ACCESS_KEY=%s", os.Getenv("AWS_SECRET_ACCESS_KEY")),
		)
	}

	return cmd
}

func formatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}
