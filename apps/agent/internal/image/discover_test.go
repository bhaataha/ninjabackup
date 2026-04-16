package image

import "testing"

func TestParseWindowsVolumes_Array(t *testing.T) {
	in := []byte(`[
		{"DriveLetter":"C","FileSystemLabel":"System","FileSystem":"NTFS","Size":500107862016,"SizeRemaining":250000000000,"DriveType":"Fixed"},
		{"DriveLetter":"D","FileSystemLabel":"Data","FileSystem":"NTFS","Size":1000204886016,"SizeRemaining":800000000000,"DriveType":"Fixed"}
	]`)
	got, err := parseWindowsVolumes(in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("want 2 volumes, got %d", len(got))
	}
	if got[0].MountPoint != `C:\` || !got[0].IsSystem {
		t.Errorf("unexpected first volume: %+v", got[0])
	}
	if got[1].DevicePath != `\\.\D:` {
		t.Errorf("unexpected device path: %s", got[1].DevicePath)
	}
}

func TestParseWindowsVolumes_Single(t *testing.T) {
	// PowerShell ConvertTo-Json drops the array when there's only one item.
	in := []byte(`{"DriveLetter":"C","FileSystemLabel":"System","FileSystem":"NTFS","Size":500107862016,"SizeRemaining":250000000000,"DriveType":"Fixed"}`)
	got, err := parseWindowsVolumes(in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("want 1 volume, got %d", len(got))
	}
}

func TestParseLinuxVolumes(t *testing.T) {
	in := []byte(`{
		"blockdevices": [
			{
				"name": "sda", "type": "disk", "size": 500107862016,
				"children": [
					{"name": "sda1", "mountpoint": "/boot", "fstype": "ext4", "size": 524288000, "fsavail": 200000000, "label": "boot"},
					{"name": "sda2", "mountpoint": "/", "fstype": "ext4", "size": 499583574016, "fsavail": 250000000000, "label": "root"}
				]
			}
		]
	}`)
	got, err := parseLinuxVolumes(in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("want 2 mounted volumes, got %d", len(got))
	}
	var foundRoot bool
	for _, v := range got {
		if v.MountPoint == "/" && v.IsSystem && v.DevicePath == "/dev/sda2" {
			foundRoot = true
		}
	}
	if !foundRoot {
		t.Errorf("root volume not found correctly: %+v", got)
	}
}

func TestParseDiskutilBytes(t *testing.T) {
	cases := []struct {
		in   string
		want int64
	}{
		{"500.3 GB (500277792768 Bytes) (exactly 977105064 512-Byte-Units)", 500277792768},
		{"no parentheses here", 0},
		{"100 MB (104857600 Bytes)", 104857600},
	}
	for _, c := range cases {
		if got := parseDiskutilBytes(c.in); got != c.want {
			t.Errorf("parseDiskutilBytes(%q) = %d, want %d", c.in, got, c.want)
		}
	}
}
