package vss

import (
	"fmt"
	"log"
	"os/exec"
	"runtime"
	"strings"
)

// Snapshot represents a VSS shadow copy
type Snapshot struct {
	ShadowID   string
	Volume     string
	DevicePath string // e.g., \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopyX
}

// IsSupported returns true if VSS is available on this platform
func IsSupported() bool {
	return runtime.GOOS == "windows"
}

// CreateSnapshot creates a VSS shadow copy of the specified volume
// volume should be like "C:" or "C:\"
func CreateSnapshot(volume string) (*Snapshot, error) {
	if !IsSupported() {
		return nil, fmt.Errorf("VSS is only supported on Windows")
	}

	log.Printf("Creating VSS snapshot for volume %s...", volume)

	// Use vssadmin to create shadow copy
	// In production, use the COM API via windows crate for more control
	cmd := exec.Command("powershell", "-Command",
		fmt.Sprintf(`(Get-WmiObject -List Win32_ShadowCopy).Create("%s\\","ClientAccessible")`, strings.TrimSuffix(volume, "\\")))

	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("VSS create failed: %s (output: %s)", err, string(output))
	}

	// Parse the shadow copy ID from output
	// In production, parse the WMI return value properly
	snapshot := &Snapshot{
		Volume: volume,
	}

	// List shadow copies to find the one we just created
	listCmd := exec.Command("powershell", "-Command",
		`Get-WmiObject Win32_ShadowCopy | Sort-Object InstallDate -Descending | Select-Object -First 1 | Format-List ID, DeviceObject`)

	listOutput, err := listCmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to list shadow copies: %s", err)
	}

	lines := strings.Split(string(listOutput), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "ID") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				snapshot.ShadowID = strings.TrimSpace(parts[1])
			}
		}
		if strings.HasPrefix(line, "DeviceObject") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				snapshot.DevicePath = strings.TrimSpace(parts[1])
			}
		}
	}

	log.Printf("VSS snapshot created: %s -> %s", snapshot.ShadowID, snapshot.DevicePath)
	return snapshot, nil
}

// DeleteSnapshot removes a VSS shadow copy
func DeleteSnapshot(shadowID string) error {
	if !IsSupported() {
		return nil
	}

	log.Printf("Deleting VSS snapshot %s...", shadowID)

	cmd := exec.Command("powershell", "-Command",
		fmt.Sprintf(`(Get-WmiObject Win32_ShadowCopy | Where-Object {$_.ID -eq '%s'}).Delete()`, shadowID))

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("VSS delete failed: %s (output: %s)", err, string(output))
	}

	log.Println("VSS snapshot deleted")
	return nil
}

// MountPath returns a path that can be used to access files from the snapshot
// This mounts the shadow copy as a directory
func (s *Snapshot) MountPath() string {
	// The device path can be used directly with restic by appending a backslash
	// e.g., \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Users\...
	if s.DevicePath != "" {
		return s.DevicePath + "\\"
	}
	return s.Volume
}
