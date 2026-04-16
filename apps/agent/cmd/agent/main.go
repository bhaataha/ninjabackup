package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ninjabackup/agent/internal/api"
	"github.com/ninjabackup/agent/internal/certs"
	"github.com/ninjabackup/agent/internal/config"
	"github.com/ninjabackup/agent/internal/localapi"
	"github.com/ninjabackup/agent/internal/restic"
	"github.com/ninjabackup/agent/internal/scheduler"
	"github.com/ninjabackup/agent/internal/service"
	"github.com/ninjabackup/agent/internal/sysinfo"
	"github.com/ninjabackup/agent/internal/throttle"
	"github.com/ninjabackup/agent/internal/updater"
)

const Version = "1.0.1"

func main() {
	// CLI flags
	registerToken := flag.String("register", "", "Registration token from dashboard")
	serverURL := flag.String("server", "", "API server URL")
	installFlag := flag.Bool("install", false, "Install as system service")
	uninstallFlag := flag.Bool("uninstall", false, "Remove system service")
	statusFlag := flag.Bool("status", false, "Check service status")
	serviceMode := flag.Bool("service", false, "Run in service mode")
	versionFlag := flag.Bool("version", false, "Show version")
	flag.Parse()

	// Version
	if *versionFlag {
		fmt.Printf("NinjaBackup Agent v%s\n", Version)
		os.Exit(0)
	}

	// Service management
	if *installFlag {
		exePath, _ := os.Executable()
		if err := service.Install(exePath); err != nil {
			log.Fatalf("Install failed: %v", err)
		}
		os.Exit(0)
	}
	if *uninstallFlag {
		if err := service.Uninstall(); err != nil {
			log.Fatalf("Uninstall failed: %v", err)
		}
		os.Exit(0)
	}
	if *statusFlag {
		status, _ := service.Status()
		fmt.Printf("Service status: %s\n", status)
		os.Exit(0)
	}

	// Banner (skip in service mode for clean logs)
	if !*serviceMode {
		fmt.Printf(`
  _   _ _       _       ____             _                
 | \ | (_)_ __ (_) __ _| __ )  __ _  ___| | ___   _ _ __  
 |  \| | | '_ \| |/ _' |  _ \ / _' |/ __| |/ / | | | '_ \ 
 | |\  | | | | | | (_| | |_) | (_| | (__|   <| |_| | |_) |
 |_| \_|_|_| |_| |\__,_|____/ \__,_|\___|_|\_\\__,_| .__/ 
              _/ |                                  |_|    
             |__/    Agent v%s
`, Version)
	}

	// ──────────── Rollback sentinel check ────────────
	// Must run before anything meaningful so that a bad update binary can be
	// detected and swapped back within the grace window (90 seconds).
	// If a rollback is performed the function triggers a service restart and
	// we should exit cleanly; the old binary will take over.
	if updater.CheckUpdateSentinel(90 * time.Second) {
		log.Println("[updater] rollback initiated — exiting this process")
		os.Exit(0)
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Handle registration via CLI flag
	if *registerToken != "" {
		cfg.RegistrationToken = *registerToken
		if *serverURL != "" {
			cfg.ServerURL = *serverURL
		}
	}

	// Check if this is a first-time registration
	if cfg.AgentID == "" {
		if cfg.RegistrationToken == "" {
			log.Fatal("No agent ID found. Run with: agent --register <TOKEN> --server <URL>")
		}
		if err := registerAgent(cfg); err != nil {
			log.Fatalf("Registration failed: %v", err)
		}
	}

	log.Printf("Agent ID: %s", cfg.AgentID)
	log.Printf("Server:   %s", cfg.ServerURL)
	log.Printf("Version:  %s", Version)

	// ──────────── Initialize Components ────────────

	// mTLS certificates
	certMgr := certs.NewCertManager()
	if !certMgr.CertsExist() {
		info := sysinfo.Gather()
		log.Println("Generating mTLS certificate...")
		if err := certMgr.GenerateAgentCert(cfg.AgentID, info.Hostname); err != nil {
			log.Printf("Warning: mTLS cert generation failed: %v", err)
		}
	}

	// API client
	apiClient := api.NewClient(cfg)

	// Restic engine
	resticEngine := restic.NewEngine(cfg)

	// Bandwidth + CPU throttle
	throttleCfg := throttle.DefaultBusinessHoursConfig()
	bwThrottle := throttle.NewThrottler(throttleCfg)

	// Wire throttler into restic so CPU priority is applied to every
	// backup/restore process automatically.
	resticEngine.SetThrottler(bwThrottle)

	// Command channel: heartbeat pushes pending commands here,
	// scheduler drains them and dispatches to the right handler.
	commandCh := make(chan api.AgentCommand, 32)

	// Scheduler
	sched := scheduler.New(cfg, apiClient, resticEngine, commandCh)

	// ──────────── Start Background Services ────────────

	// 1. Heartbeat (every 60s) — also picks up pending commands from the server
	go apiClient.StartHeartbeat(cfg.AgentID, Version, commandCh)
	log.Println("[✓] Heartbeat started (60s interval)")

	// 2. Job scheduler — cron + command dispatch
	go sched.Start()
	log.Println("[✓] Job scheduler started (cron-driven)")

	// 3. Auto-update (every 6 hours)
	autoUpdater := updater.NewUpdater(cfg.ServerURL, Version)
	go autoUpdater.StartAutoUpdateLoop(6 * time.Hour)
	log.Println("[✓] Auto-update loop started (6h interval)")

	// 3a. Cert auto-rotation — checks once a day, regenerates 30 days before expiry
	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		check := func() {
			rotated, err := certMgr.RotateIfNeeded(cfg.AgentID, sysinfo.Gather().Hostname, 30*24*time.Hour)
			if err != nil {
				log.Printf("Cert rotation failed: %v", err)
			} else if rotated {
				log.Printf("[✓] mTLS certificate rotated (was within 30 days of expiry)")
			}
		}
		check() // run once at startup
		for range ticker.C {
			check()
		}
	}()
	log.Println("[✓] Cert rotation loop started (24h interval, 30d threshold)")

	// 4. Local IPC server for tray companion app
	hostname := sysinfo.Gather().Hostname
	localHandlers := localapi.NewHandlers(localapi.Status{
		AgentID:   cfg.AgentID,
		TenantID:  cfg.TenantID,
		Hostname:  hostname,
		Version:   Version,
		State:     "IDLE",
		ServerURL: cfg.ServerURL,
	})
	localHandlers.OnBackupNow = func() error {
		// Push a backup:start command into the same channel the heartbeat fills.
		commandCh <- api.AgentCommand{Type: "backup:start", Payload: map[string]any{"trigger": "tray"}}
		return nil
	}
	localHandlers.OnPause = func(p bool) {
		log.Printf("[tray] backups paused=%v", p)
	}
	if ln, err := localHandlers.Serve(); err != nil {
		log.Printf("Warning: local IPC server failed: %v", err)
	} else {
		log.Printf("[✓] Local IPC: 127.0.0.1:%d (tray)", config.LocalAPIPort)
		_ = ln // kept open for the lifetime of the process
	}

	// 5. Log current throttle status
	if bwThrottle != nil {
		limit := bwThrottle.GetCurrentLimit()
		if limit > 0 {
			log.Printf("[✓] Bandwidth throttle: %d KB/s", limit/1024)
		} else {
			log.Println("[✓] Bandwidth throttle: unlimited")
		}
	}

	log.Println("────────────────────────────────────────")
	log.Println("NinjaBackup Agent is running.")
	if *serviceMode {
		log.Println("Running as system service.")
	} else {
		log.Println("Press Ctrl+C to stop.")
	}
	log.Println("────────────────────────────────────────")

	// ──────────── Startup health confirmation ────────────
	// If we were started by an auto-update, mark startup healthy after 2
	// minutes.  This clears the rollback sentinel so a future crash won't
	// be misidentified as an update-related failure.
	go func() {
		time.Sleep(2 * time.Minute)
		updater.MarkStartupHealthy()
	}()

	// ──────────── Wait for Shutdown ────────────

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down NinjaBackup Agent...")
	sched.Stop()
	apiClient.ReportStatus(cfg.AgentID, "OFFLINE")
	log.Println("Goodbye!")
}

func registerAgent(cfg *config.Config) error {
	log.Println("Registering agent with server...")
	apiClient := api.NewClient(cfg)

	// Gather system info
	info := sysinfo.Gather()

	result, err := apiClient.Register(api.RegisterRequest{
		RegistrationToken: cfg.RegistrationToken,
		Hostname:          info.Hostname,
		OsType:            info.OsType,
		OsVersion:         info.OsVersion,
		AgentVersion:      Version,
		CpuInfo:           info.CpuInfo,
		RamGb:             info.RamGb,
		DiskInfo:          info.DiskInfo,
	})
	if err != nil {
		return fmt.Errorf("registration API call failed: %w", err)
	}

	// Save agent ID to config
	cfg.AgentID = result.AgentID
	cfg.TenantID = result.TenantID
	cfg.RegistrationToken = "" // consumed
	if err := config.Save(cfg); err != nil {
		return fmt.Errorf("failed to save config: %w", err)
	}

	log.Printf("✅ Registered successfully! Agent ID: %s", result.AgentID)
	return nil
}
