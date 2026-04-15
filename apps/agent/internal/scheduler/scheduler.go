package scheduler

import (
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
	cfg    *config.Config
	api    *api.Client
	restic *restic.Engine
	stop   chan struct{}
	wg     sync.WaitGroup

	mu     sync.Mutex
	cron   *cron.Cron
	// policyID -> cron entry ID, so we can rebuild the schedule when policies change
	entries map[string]cron.EntryID
}

// New creates a new scheduler
func New(cfg *config.Config, apiClient *api.Client, resticEngine *restic.Engine) *Scheduler {
	return &Scheduler{
		cfg:     cfg,
		api:     apiClient,
		restic:  resticEngine,
		stop:    make(chan struct{}),
		entries: make(map[string]cron.EntryID),
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
		case <-s.stop:
			log.Println("Scheduler stopped")
			return
		}
	}
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
