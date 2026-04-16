//go:build !windows

package throttle

import (
	"fmt"
	"syscall"
)

// niceValues maps priority name → Unix nice value.
// Lower nice = higher CPU priority (range -20 to 19).
var niceValues = map[string]int{
	"high":   -5, // above normal — requires root on Linux
	"normal": 0,
	"low":    15, // well below interactive tasks
}

// SetProcessPriority applies an OS CPU scheduling priority to the given PID.
// priority is one of "high", "normal", "low".
func SetProcessPriority(pid int, priority string) error {
	nice, ok := niceValues[priority]
	if !ok {
		return fmt.Errorf("unknown priority %q (want high/normal/low)", priority)
	}
	if err := syscall.Setpriority(syscall.PRIO_PROCESS, pid, nice); err != nil {
		// EPERM is normal when trying to set negative nice without root.
		// Silently fall back to nice 0 (no change) rather than erroring out.
		if nice < 0 {
			_ = syscall.Setpriority(syscall.PRIO_PROCESS, pid, 0)
			return nil
		}
		return fmt.Errorf("setpriority(%d, %d): %w", pid, nice, err)
	}
	return nil
}
