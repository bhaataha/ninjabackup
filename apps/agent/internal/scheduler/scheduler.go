package scheduler

import (
	"log"
	"sync"
	"time"

	"github.com/ninjabackup/agent/internal/api"
	"github.com/ninjabackup/agent/internal/config"
	"github.com/ninjabackup/agent/internal/restic"
)

// Scheduler manages scheduled backup jobs
type Scheduler struct {
	cfg    *config.Config
	api    *api.Client
	restic *restic.Engine
	stop   chan struct{}
	wg     sync.WaitGroup
}

// New creates a new scheduler
func New(cfg *config.Config, apiClient *api.Client, resticEngine *restic.Engine) *Scheduler {
	return &Scheduler{
		cfg:    cfg,
		api:    apiClient,
		restic: resticEngine,
		stop:   make(chan struct{}),
	}
}

// Start begins the scheduler loop
func (s *Scheduler) Start() {
	log.Println("Scheduler started")
	s.wg.Add(1)
	defer s.wg.Done()

	// Check for pending jobs every 30 seconds
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Also run an initial check immediately
	s.checkAndRunJobs()

	for {
		select {
		case <-ticker.C:
			s.checkAndRunJobs()
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

func (s *Scheduler) checkAndRunJobs() {
	// If no backup paths configured, skip
	if len(s.cfg.BackupPaths) == 0 {
		return
	}

	// For MVP: run backup if paths are configured
	// TODO: Fetch policies from server and use cron scheduling
	log.Println("Checking for backup jobs...")
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
		// Report progress to server
		s.api.UpdateJobStatus(jobID, api.JobStatusUpdate{
			BytesProcessed:  progress.BytesDone,
			ProgressPercent: progress.PercentDone * 100,
		})
	})

	if err != nil {
		// Report failure
		s.api.UpdateJobStatus(jobID, api.JobStatusUpdate{
			Status:       "FAILED",
			ErrorMessage: err.Error(),
		})
		s.api.ReportStatus(s.cfg.AgentID, "ERROR")
		return err
	}

	// Report success
	s.api.UpdateJobStatus(jobID, api.JobStatusUpdate{
		Status:         "SUCCESS",
		BytesProcessed: result.BytesTotal,
		BytesUploaded:  result.BytesAdded,
		FilesNew:       result.FilesNew,
		FilesChanged:   result.FilesChanged,
		FilesUnchanged: result.FilesUnchanged,
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
