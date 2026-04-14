package retention

import (
	"fmt"
	"log"
	"strings"
)

// Policy defines retention rules (Grandfather-Father-Son)
type Policy struct {
	KeepLast    int `json:"keepLast"`
	KeepHourly  int `json:"keepHourly"`
	KeepDaily   int `json:"keepDaily"`
	KeepWeekly  int `json:"keepWeekly"`
	KeepMonthly int `json:"keepMonthly"`
	KeepYearly  int `json:"keepYearly"`
}

// DefaultPolicy returns a sensible GFS default
func DefaultPolicy() Policy {
	return Policy{
		KeepLast:    5,
		KeepHourly:  0,
		KeepDaily:   7,
		KeepWeekly:  4,
		KeepMonthly: 12,
		KeepYearly:  2,
	}
}

// ToResticArgs converts the retention policy to restic forget flags
func (p Policy) ToResticArgs() []string {
	var args []string

	if p.KeepLast > 0 {
		args = append(args, fmt.Sprintf("--keep-last=%d", p.KeepLast))
	}
	if p.KeepHourly > 0 {
		args = append(args, fmt.Sprintf("--keep-hourly=%d", p.KeepHourly))
	}
	if p.KeepDaily > 0 {
		args = append(args, fmt.Sprintf("--keep-daily=%d", p.KeepDaily))
	}
	if p.KeepWeekly > 0 {
		args = append(args, fmt.Sprintf("--keep-weekly=%d", p.KeepWeekly))
	}
	if p.KeepMonthly > 0 {
		args = append(args, fmt.Sprintf("--keep-monthly=%d", p.KeepMonthly))
	}
	if p.KeepYearly > 0 {
		args = append(args, fmt.Sprintf("--keep-yearly=%d", p.KeepYearly))
	}

	// Always prune after forget
	args = append(args, "--prune")

	return args
}

// Summary returns a human-readable summary of the policy
func (p Policy) Summary() string {
	parts := []string{}
	if p.KeepLast > 0 {
		parts = append(parts, fmt.Sprintf("%d latest", p.KeepLast))
	}
	if p.KeepDaily > 0 {
		parts = append(parts, fmt.Sprintf("%d daily", p.KeepDaily))
	}
	if p.KeepWeekly > 0 {
		parts = append(parts, fmt.Sprintf("%d weekly", p.KeepWeekly))
	}
	if p.KeepMonthly > 0 {
		parts = append(parts, fmt.Sprintf("%d monthly", p.KeepMonthly))
	}
	if p.KeepYearly > 0 {
		parts = append(parts, fmt.Sprintf("%d yearly", p.KeepYearly))
	}
	return strings.Join(parts, ", ")
}

// Validate checks if the policy has at least one retention rule
func (p Policy) Validate() error {
	total := p.KeepLast + p.KeepHourly + p.KeepDaily + p.KeepWeekly + p.KeepMonthly + p.KeepYearly
	if total == 0 {
		return fmt.Errorf("retention policy must keep at least one snapshot")
	}
	return nil
}

// LogPolicy logs the current retention policy
func (p Policy) LogPolicy() {
	log.Printf("Retention Policy: %s", p.Summary())
	log.Printf("Restic args: %s", strings.Join(p.ToResticArgs(), " "))
}
