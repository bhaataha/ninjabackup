package sysinfo

import (
	"fmt"
	"os"
	"runtime"
	"strings"
)

// SystemInfo contains information about the host machine
type SystemInfo struct {
	Hostname string      `json:"hostname"`
	OsType   string      `json:"osType"`
	OsVersion string    `json:"osVersion"`
	CpuInfo  string      `json:"cpuInfo"`
	RamGb    int         `json:"ramGb"`
	DiskInfo interface{} `json:"diskInfo"`
}

// Gather collects system information about the current machine
func Gather() SystemInfo {
	hostname, _ := os.Hostname()

	info := SystemInfo{
		Hostname:  hostname,
		OsType:    normalizeOS(runtime.GOOS),
		OsVersion: getOSVersion(),
		CpuInfo:   getCPUInfo(),
		RamGb:     getRAMGb(),
		DiskInfo:  getDiskInfo(),
	}

	return info
}

func normalizeOS(goos string) string {
	switch goos {
	case "windows":
		return "WINDOWS"
	case "darwin":
		return "MACOS"
	case "linux":
		return "LINUX"
	default:
		return strings.ToUpper(goos)
	}
}

func getOSVersion() string {
	switch runtime.GOOS {
	case "windows":
		return "Windows " + runtime.GOARCH
	case "darwin":
		return "macOS " + runtime.GOARCH
	case "linux":
		// Try to read /etc/os-release
		data, err := os.ReadFile("/etc/os-release")
		if err == nil {
			for _, line := range strings.Split(string(data), "\n") {
				if strings.HasPrefix(line, "PRETTY_NAME=") {
					return strings.Trim(strings.TrimPrefix(line, "PRETTY_NAME="), "\"")
				}
			}
		}
		return "Linux " + runtime.GOARCH
	default:
		return runtime.GOOS + " " + runtime.GOARCH
	}
}

func getCPUInfo() string {
	// Basic CPU info from runtime
	return fmt.Sprintf("%s/%s (%d cores)", runtime.GOARCH, runtime.GOOS, runtime.NumCPU())
}

func getRAMGb() int {
	// Go doesn't have a built-in way to get total RAM
	// For a production agent, use github.com/shirou/gopsutil
	// For now, return 0 (unknown)
	return 0
}

func getDiskInfo() interface{} {
	// For a production agent, use github.com/shirou/gopsutil
	// For now, return nil
	return nil
}
