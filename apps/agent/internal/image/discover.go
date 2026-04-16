package image

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

// ─────────────────────────────────────────────────────────────────────────────
// Windows: parse `Get-Volume | ConvertTo-Json` output
// ─────────────────────────────────────────────────────────────────────────────

type winVolume struct {
	DriveLetter     string `json:"DriveLetter"`
	FileSystemLabel string `json:"FileSystemLabel"`
	FileSystem      string `json:"FileSystem"`
	Size            int64  `json:"Size"`
	SizeRemaining   int64  `json:"SizeRemaining"`
	DriveType       string `json:"DriveType"`
}

func parseWindowsVolumes(jsonBytes []byte) ([]VolumeInfo, error) {
	if len(jsonBytes) == 0 {
		return nil, nil
	}
	// PowerShell `ConvertTo-Json` returns a single object when there's one volume,
	// or an array when there are many — try the array first, then fall back.
	var arr []winVolume
	if err := json.Unmarshal(jsonBytes, &arr); err != nil {
		var single winVolume
		if err2 := json.Unmarshal(jsonBytes, &single); err2 != nil {
			return nil, fmt.Errorf("parse Get-Volume JSON: %w", err)
		}
		arr = []winVolume{single}
	}
	out := make([]VolumeInfo, 0, len(arr))
	for _, v := range arr {
		if v.DriveLetter == "" {
			continue
		}
		out = append(out, VolumeInfo{
			DevicePath: fmt.Sprintf(`\\.\%s:`, v.DriveLetter),
			MountPoint: v.DriveLetter + `:\`,
			Label:      v.FileSystemLabel,
			FileSystem: v.FileSystem,
			TotalBytes: v.Size,
			FreeBytes:  v.SizeRemaining,
			IsSystem:   v.DriveLetter == "C",
			IsBoot:     v.DriveLetter == "C",
		})
	}
	return out, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Linux: parse `lsblk -J -b -o NAME,MOUNTPOINT,FSTYPE,SIZE,FSAVAIL,LABEL,TYPE`
// ─────────────────────────────────────────────────────────────────────────────

type lsblkDevice struct {
	Name       string        `json:"name"`
	MountPoint *string       `json:"mountpoint"`
	FsType     *string       `json:"fstype"`
	Size       any           `json:"size"`     // either int (with -b) or string
	FsAvail    any           `json:"fsavail"`  // either int (with -b) or string
	Label      *string       `json:"label"`
	Type       *string       `json:"type"`
	Children   []lsblkDevice `json:"children"`
}

type lsblkOutput struct {
	BlockDevices []lsblkDevice `json:"blockdevices"`
}

func parseLinuxVolumes(jsonBytes []byte) ([]VolumeInfo, error) {
	var data lsblkOutput
	if err := json.Unmarshal(jsonBytes, &data); err != nil {
		return nil, fmt.Errorf("parse lsblk JSON: %w", err)
	}
	var out []VolumeInfo
	var walk func(parent string, devs []lsblkDevice)
	walk = func(parent string, devs []lsblkDevice) {
		for _, d := range devs {
			devPath := "/dev/" + d.Name
			if d.MountPoint != nil && *d.MountPoint != "" {
				out = append(out, VolumeInfo{
					DevicePath: devPath,
					MountPoint: *d.MountPoint,
					Label:      strFromPtr(d.Label),
					FileSystem: strFromPtr(d.FsType),
					TotalBytes: intFromAny(d.Size),
					FreeBytes:  intFromAny(d.FsAvail),
					IsSystem:   *d.MountPoint == "/",
					IsBoot:     *d.MountPoint == "/boot" || *d.MountPoint == "/boot/efi",
				})
			}
			if len(d.Children) > 0 {
				walk(devPath, d.Children)
			}
		}
	}
	walk("", data.BlockDevices)
	return out, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// macOS: parse `diskutil info -plist /` for the root vol, then enumerate via
// `diskutil list -plist` for siblings. plist is XML — to keep deps minimal we
// shell out to `diskutil info -all` and grep the human-readable lines.
// ─────────────────────────────────────────────────────────────────────────────

func parseMacVolumes() ([]VolumeInfo, error) {
	out, err := exec.Command("diskutil", "info", "-all").Output()
	if err != nil {
		return nil, fmt.Errorf("diskutil info -all: %w", err)
	}
	var vols []VolumeInfo
	var cur VolumeInfo
	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	scanner.Buffer(make([]byte, 1024*1024), 4*1024*1024)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "**********" {
			if cur.DevicePath != "" && cur.MountPoint != "" {
				cur.IsSystem = cur.MountPoint == "/" || cur.MountPoint == "/System/Volumes/Data"
				cur.IsBoot = cur.MountPoint == "/" || strings.HasPrefix(cur.MountPoint, "/Volumes/Preboot")
				vols = append(vols, cur)
			}
			cur = VolumeInfo{}
			continue
		}
		key, val, ok := splitKV(line)
		if !ok {
			continue
		}
		switch key {
		case "Device Node":
			cur.DevicePath = val
		case "Mount Point":
			if val != "Not applicable (no file system)" && val != "" {
				cur.MountPoint = val
			}
		case "Volume Name":
			cur.Label = val
		case "Type (Bundle)":
			cur.FileSystem = val
		case "File System Personality":
			if cur.FileSystem == "" {
				cur.FileSystem = val
			}
		case "Disk Size":
			cur.TotalBytes = parseDiskutilBytes(val)
		case "Container Free Space":
			cur.FreeBytes = parseDiskutilBytes(val)
		case "Volume Free Space":
			if cur.FreeBytes == 0 {
				cur.FreeBytes = parseDiskutilBytes(val)
			}
		}
	}
	// Don't lose the last block.
	if cur.DevicePath != "" && cur.MountPoint != "" {
		vols = append(vols, cur)
	}
	return vols, nil
}

// parseDiskutilBytes pulls the byte count out of strings like
// `500.3 GB (500277792768 Bytes) (...)`
func parseDiskutilBytes(s string) int64 {
	idx := strings.Index(s, "(")
	if idx == -1 {
		return 0
	}
	rest := s[idx+1:]
	end := strings.Index(rest, " Bytes")
	if end == -1 {
		return 0
	}
	n, err := strconv.ParseInt(rest[:end], 10, 64)
	if err != nil {
		return 0
	}
	return n
}

func splitKV(line string) (string, string, bool) {
	idx := strings.Index(line, ":")
	if idx == -1 {
		return "", "", false
	}
	return strings.TrimSpace(line[:idx]), strings.TrimSpace(line[idx+1:]), true
}

func strFromPtr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func intFromAny(v any) int64 {
	switch t := v.(type) {
	case float64:
		return int64(t)
	case int:
		return int64(t)
	case int64:
		return t
	case string:
		n, _ := strconv.ParseInt(t, 10, 64)
		return n
	}
	return 0
}
