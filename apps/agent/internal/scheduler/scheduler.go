package scheduler

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/ninjabackup/agent/internal/api"
	"github.com/ninjabackup/agent/internal/config"
	"github.com/ninjabackup/agent/internal/restic"
	"github.com/robfig/cron/v3"
)

// Scheduler manages scheduled backup jobs
type Scheduler struct {
	cfg      *config.Config
	api      *api.Client
	restic   *restic.Engine
	stop     chan struct{}
	wg       sync.WaitGroup
	commands <-chan api.AgentCommand

	// cancelFuncs maps a running job ID to a cancel function
	jobsMu      sync.Mutex
	cancelFuncs map[string]context.CancelFunc

	mu   sync.Mutex
	cron *cron.Cron
	// policyID -> cron entry ID, so we can rebuild the schedule when policies change
	entries map[string]cron.EntryID
}

// New creates a new scheduler.
// `commands` receives pending commands picked up by the API client's heartbeat.
func New(cfg *config.Config, apiClient *api.Client, resticEngine *restic.Engine, commands <-chan api.AgentCommand) *Scheduler {
	return &Scheduler{
		cfg:         cfg,
		api:         apiClient,
		restic:      resticEngine,
		stop:        make(chan struct{}),
		commands:    commands,
		entries:     make(map[string]cron.EntryID),
		cancelFuncs: make(map[string]context.CancelFunc),
	}
}

// Start begins the scheduler loop
func (s *Scheduler) Start() {
	log.Println("Scheduler started")
	s.wg.Add(1)
	defer s.wg.Done()

	s.cron = cron.New()
	s.cron.Start()
	defer s.cron.Stop()

	// Refresh policies from server every 2 minutes
	ticker := time.NewTicker(2 * time.Minute)
	defer ticker.Stop()

	if err := s.refreshPolicies(); err != nil {
		log.Printf("Initial policy refresh failed: %v", err)
	}

	for {
		select {
		case <-ticker.C:
			if err := s.refreshPolicies(); err != nil {
				log.Printf("Policy refresh failed: %v", err)
			}
		case cmd, ok := <-s.commands:
			if !ok {
				// channel closed
				s.commands = nil
				continue
			}
			go s.handleCommand(cmd)
		case <-s.stop:
			log.Println("Scheduler stopped")
			return
		}
	}
}

// handleCommand dispatches a server-sent command to the correct handler and
// ACKs it back to the server regardless of outcome.
func (s *Scheduler) handleCommand(cmd api.AgentCommand) {
	log.Printf("Received command %s (%s)", cmd.Type, cmd.ID)

	var runErr error
	switch cmd.Type {
	case "backup:start":
		runErr = s.handleBackupStart(cmd)
	case "backup:cancel":
		runErr = s.handleBackupCancel(cmd)
	case "restore:start":
		runErr = s.handleRestoreStart(cmd)
	case "restore:cancel":
		runErr = s.handleRestoreCancel(cmd)
	default:
		runErr = fmt.Errorf("unknown command type: %s", cmd.Type)
	}

	errMsg := ""
	if runErr != nil {
		errMsg = runErr.Error()
		log.Printf("Command %s failed: %v", cmd.ID, runErr)
	}
	s.api.AckCommand(cmd.ID, errMsg)
}

func (s *Scheduler) handleBackupStart(cmd api.AgentCommand) error {
	jobID, _ := cmd.Payload["jobId"].(string)
	if jobID == "" {
		return fmt.Errorf("backup:start missing jobId")
	}
	paths := toStringSlice(cmd.Payload["includePaths"])
	excludes := toStringSlice(cmd.Payload["excludePatterns"])

	return s.RunBackup(jobID, paths, excludes)
}

func (s *Scheduler) handleRestoreStart(cmd api.AgentCommand) error {
	jobID, _ := cmd.Payload["restoreJobId"].(string)
	if jobID == "" {
		return fmt.Errorf("restore:start missing restoreJobId")
	}
	snapshotID, _ := cmd.Payload["resticSnapshotId"].(string)
	if snapshotID == "" {
		snapshotID, _ = cmd.Payload["snapshotId"].(string)
	}
	targetPath, _ := cmd.Payload["targetPath"].(string)
	paths := toStringSlice(cmd.Payload["selectedPaths"])

	// Report progress to the server — a dedicated callback endpoint exists at
	// POST /restore/:id/status.
	reportStatus := func(status, errMsg string) {
		payload := map[string]any{"status": status}
		if errMsg != "" {
			payload["errorMessage"] = errMsg
		}
		_ = s.api.UpdateRestoreStatus(jobID, payload)
	}

	reportStatus("RUNNING", "")
	if err := s.RunRestore(snapshotID, targetPath, paths); err != nil {
		reportStatus("FAILED", err.Error())
		return err
	}
	reportStatus("SUCCESS", "")
	return nil
}

func (s *Scheduler) handleRestoreCancel(cmd api.AgentCommand) error {
	// Restic doesn't expose a cancellation token mid-restore; we record the
	// intent and rely on the next heartbeat to report COMPLETED-or-CANCELLED.
	jobID, _ := cmd.Payload["restoreJobId"].(string)
	log.Printf("Restore cancel requested for %s (restic restores are not cancellable)", jobID)
	return nil
}

func (s *Scheduler) handleBackupCancel(cmd api.AgentCommand) error {
	jobID, _ := cmd.Payload["jobId"].(string)
	if jobID == "" {
		return fmt.Errorf("backup:cancel missing jobId")
	}
	s.jobsMu.Lock()
	cancel, ok := s.cancelFuncs[jobID]
	s.jobsMu.Unlock()
	if !ok {
		log.Printf("No running job %s to cancel", jobID)
		return nil
	}
	cancel()
	return nil
}

func toStringSlice(v interface{}) []string {
	switch t := v.(type) {
	case []string:
		return t
	case []interface{}:
		out := make([]string, 0, len(t))
		for _, item := range t {
			if str, ok := item.(string); ok {
				out = append(out, str)
			}
		}
		return out
	}
	return nil
}

// Stop gracefully stops the scheduler
func (s *Scheduler) Stop() {
	close(s.stop)
	s.wg.Wait()
}

// refreshPolicies fetches current policies from the server and reconciles
// them with the running cron schedule.
func (s *Scheduler) refreshPolicies() error {
	policies, err := s.api.FetchPolicies(s.cfg.AgentID)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	seen := make(map[string]struct{}, len(policies))
	for _, p := range policies {
		seen[p.ID] = struct{}{}
		if _, exists := s.entries[p.ID]; exists {
			continue // already scheduled
		}

		policy := p // capture for closure
		id, err := s.cron.AddFunc(policy.ScheduleCron, func() {
			s.runPolicy(policy)
		})
		if err != nil {
			log.Printf("Invalid cron '%s' for policy %s: %v", policy.ScheduleCron, policy.Name, err)
			continue
		}
		s.entries[p.ID] = id
		log.Printf("Scheduled policy '%s' (%s) with cron '%s'", policy.Name, policy.ID, policy.ScheduleCron)
	}

	// Remove cron entries whose policy is no longer assigned
	for policyID, entryID := range s.entries {
		if _, stillAssigned := seen[policyID]; !stillAssigned {
			s.cron.Remove(entryID)
			delete(s.entries, policyID)
			log.Printf("Unscheduled policy %s", policyID)
		}
	}

	return nil
}

// runPolicy executes a policy's backup on schedule.
func (s *Scheduler) runPolicy(p api.BackupPolicy) {
	jobID := fmt.Sprintf("scheduled-%s-%d", p.ID, time.Now().Unix())
	log.Printf("Cron fired for policy '%s' — starting backup %s", p.Name, jobID)

	if err := s.RunBackup(jobID, p.IncludePaths, p.ExcludePatterns); err != nil {
		log.Printf("Scheduled backup failed for policy %s: %v", p.Name, err)
	}
}

// RunBackup executes a backup job and reports progress to the server
func (s *Scheduler) RunBackup(jobID string, paths []string, excludes []string) error {
	log.Printf("Running backup job %s...", jobID)

	// Register a cancellable context so backup:cancel commands can interrupt.
	ctx, cancel := context.WithCancel(context.Background())
	s.jobsMu.Lock()
	s.cancelFuncs[jobID] = cancel
	s.jobsMu.Unlock()
	defer func() {
		s.jobsMu.Lock()
		delete(s.cancelFuncs, jobID)
		s.jobsMu.Unlock()
		cancel()
	}()

	// Report RUNNING status
	s.api.ReportStatus(s.cfg.AgentID, "BACKING_UP")
	s.api.UpdateJobStatus(jobID, api.JobStatusUpdate{
		Status: "RUNNING",
	})

	// Run the backup with progress reporting
	result, err := s.restic.Backup(paths, excludes, []string{jobID}, func(progress restic.ResticProgress) {
		s.api.UpdateJobStatus(jobID, api.JobStatusUpdate{
			BytesProcessed:  progress.BytesDone,
			ProgressPercent: progress.PercentDone * 100,
		})
	})

	// If the context was cancelled mid-run, treat as cancelled rather than failure.
	if ctx.Err() != nil {
		s.api.UpdateJobStatus(jobID, api.JobStatusUpdate{
			Status:       "CANCELLED",
			ErrorMessage: "cancelled by user",
		})
		s.api.ReportStatus(s.cfg.AgentID, "ONLINE")
		return ctx.Err()
	}

	if err != nil {
		s.api.UpdateJobStatus(jobID, api.JobStatusUpdate{
			Status:       "FAILED",
			ErrorMessage: err.Error(),
		})
		s.api.ReportStatus(s.cfg.AgentID, "ERROR")
		return err
	}

	s.api.UpdateJobStatus(jobID, api.JobStatusUpdate{
		Status:          "SUCCESS",
		BytesProcessed:  result.BytesTotal,
		BytesUploaded:   result.BytesAdded,
		FilesNew:        result.FilesNew,
		FilesChanged:    result.FilesChanged,
		FilesUnchanged:  result.FilesUnchanged,
		ProgressPercent: 100,
	})

	s.api.ReportStatus(s.cfg.AgentID, "ONLINE")

	// Apply retention policy
	go func() {
		if err := s.restic.Forget(7, 4, 12, 2, true); err != nil {
			log.Printf("Retention policy failed: %v", err)
		}
	}()

	log.Printf("Backup job %s completed successfully", jobID)
	return nil
}

// RunRestore executes a restore operation
func (s *Scheduler) RunRestore(snapshotID, targetPath string, include []string) error {
	log.Printf("Running restore: snapshot=%s target=%s", snapshotID, targetPath)

	s.api.ReportStatus(s.cfg.AgentID, "RESTORING")

	err := s.restic.Restore(snapshotID, targetPath, include)
	if err != nil {
		s.api.ReportStatus(s.cfg.AgentID, "ERROR")
		return err
	}

	s.api.ReportStatus(s.cfg.AgentID, "ONLINE")
	log.Println("Restore completed successfully")
	return nil
}
