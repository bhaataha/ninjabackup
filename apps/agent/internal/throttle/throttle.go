package throttle

import (
	"fmt"
	"log"
	"time"
)

// Schedule defines a bandwidth throttle window
type Schedule struct {
	DayOfWeek  []time.Weekday `json:"dayOfWeek"`  // Which days this applies
	StartHour  int            `json:"startHour"`   // 0-23
	EndHour    int            `json:"endHour"`     // 0-23
	MaxMbps    int            `json:"maxMbps"`     // Max bandwidth in Mbps (0 = unlimited)
	Priority   string         `json:"priority"`    // "high", "normal", "low"
}

// ThrottleConfig holds all throttle rules
type ThrottleConfig struct {
	Enabled       bool       `json:"enabled"`
	DefaultMaxMbps int       `json:"defaultMaxMbps"` // Default limit when no schedule matches
	Schedules     []Schedule `json:"schedules"`
}

// Throttler manages bandwidth throttling for backup operations
type Throttler struct {
	config ThrottleConfig
}

// NewThrottler creates a new throttler
func NewThrottler(config ThrottleConfig) *Throttler {
	return &Throttler{config: config}
}

// GetCurrentLimit returns the current bandwidth limit in bytes/sec based on active schedules
func (t *Throttler) GetCurrentLimit() int64 {
	if !t.config.Enabled {
		return 0 // Unlimited
	}

	now := time.Now()
	currentDay := now.Weekday()
	currentHour := now.Hour()

	// Check schedules in order (first match wins)
	for _, sched := range t.config.Schedules {
		if !containsDay(sched.DayOfWeek, currentDay) {
			continue
		}

		if isInTimeWindow(currentHour, sched.StartHour, sched.EndHour) {
			if sched.MaxMbps == 0 {
				return 0 // Unlimited during this window
			}
			limit := int64(sched.MaxMbps) * 1024 * 1024 / 8 // Convert Mbps to bytes/sec
			log.Printf("Throttle: %d Mbps (schedule: %s %02d:00-%02d:00)",
				sched.MaxMbps, currentDay, sched.StartHour, sched.EndHour)
			return limit
		}
	}

	// Default limit
	if t.config.DefaultMaxMbps > 0 {
		return int64(t.config.DefaultMaxMbps) * 1024 * 1024 / 8
	}

	return 0 // Unlimited
}

// GetResticBandwidthFlag returns the Restic --limit-upload flag value
func (t *Throttler) GetResticBandwidthFlag() string {
	limit := t.GetCurrentLimit()
	if limit <= 0 {
		return "" // No limit
	}

	// Restic uses KiB/s
	kbps := limit / 1024
	return fmt.Sprintf("--limit-upload=%d", kbps)
}

// ShouldBackupNow checks if backup should run based on schedule priority
func (t *Throttler) ShouldBackupNow() (bool, string) {
	if !t.config.Enabled {
		return true, "throttle disabled"
	}

	now := time.Now()
	currentDay := now.Weekday()
	currentHour := now.Hour()

	for _, sched := range t.config.Schedules {
		if !containsDay(sched.DayOfWeek, currentDay) {
			continue
		}

		if isInTimeWindow(currentHour, sched.StartHour, sched.EndHour) {
			if sched.Priority == "low" {
				return false, fmt.Sprintf("low priority window (%02d:00-%02d:00)", sched.StartHour, sched.EndHour)
			}
			return true, fmt.Sprintf("allowed (priority: %s)", sched.Priority)
		}
	}

	return true, "no matching schedule"
}

// DefaultBusinessHoursConfig returns a sensible default config
// Throttles during business hours (9-17), unlimited at night and weekends
func DefaultBusinessHoursConfig() ThrottleConfig {
	weekdays := []time.Weekday{
		time.Monday, time.Tuesday, time.Wednesday, time.Thursday, time.Friday,
	}

	return ThrottleConfig{
		Enabled:        true,
		DefaultMaxMbps: 0, // Unlimited by default
		Schedules: []Schedule{
			{
				DayOfWeek: weekdays,
				StartHour: 9,
				EndHour:   17,
				MaxMbps:   50,   // 50 Mbps during business hours
				Priority:  "normal",
			},
			{
				DayOfWeek: weekdays,
				StartHour: 17,
				EndHour:   9,
				MaxMbps:   0,    // Unlimited after hours
				Priority:  "high",
			},
			{
				DayOfWeek: []time.Weekday{time.Saturday, time.Sunday},
				StartHour: 0,
				EndHour:   24,
				MaxMbps:   0,    // Unlimited on weekends
				Priority:  "high",
			},
		},
	}
}

// ─── Helpers ─────────────────────────────────────────────

func containsDay(days []time.Weekday, day time.Weekday) bool {
	for _, d := range days {
		if d == day {
			return true
		}
	}
	return false
}

func isInTimeWindow(current, start, end int) bool {
	if start <= end {
		return current >= start && current < end
	}
	// Overnight window (e.g. 22:00-06:00)
	return current >= start || current < end
}
