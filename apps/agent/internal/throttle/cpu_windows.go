//go:build windows

package throttle

import (
	"fmt"
	"syscall"
	"unsafe"
)

// Windows process priority class constants.
const (
	processSetInformation    = 0x0200
	idlePriorityClass        = 0x00000040
	belowNormalPriorityClass = 0x00004000
	normalPriorityClass      = 0x00000020
	aboveNormalPriorityClass = 0x00008000
)

var (
	kernel32         = syscall.NewLazyDLL("kernel32.dll")
	procOpenProcess  = kernel32.NewProc("OpenProcess")
	procSetPriority  = kernel32.NewProc("SetPriorityClass")
	procCloseHandle  = kernel32.NewProc("CloseHandle")
)

// priorityClasses maps priority name → Windows PRIORITY_CLASS value.
var priorityClasses = map[string]uint32{
	"high":   aboveNormalPriorityClass,
	"normal": normalPriorityClass,
	"low":    belowNormalPriorityClass,
}

// SetProcessPriority applies a Windows priority class to the given PID.
// priority is one of "high", "normal", "low".
func SetProcessPriority(pid int, priority string) error {
	class, ok := priorityClasses[priority]
	if !ok {
		return fmt.Errorf("unknown priority %q (want high/normal/low)", priority)
	}

	// Open a handle with PROCESS_SET_INFORMATION rights.
	handle, _, err := procOpenProcess.Call(
		uintptr(processSetInformation),
		0, // bInheritHandle = FALSE
		uintptr(pid),
	)
	if handle == 0 {
		return fmt.Errorf("OpenProcess(%d): %w", pid, err)
	}
	defer procCloseHandle.Call(handle)

	ret, _, err := procSetPriority.Call(handle, uintptr(class))
	if ret == 0 {
		return fmt.Errorf("SetPriorityClass(%d, 0x%X): %w", pid, class, err)
	}
	_ = unsafe.Sizeof(class) // keep unsafe import used
	return nil
}
