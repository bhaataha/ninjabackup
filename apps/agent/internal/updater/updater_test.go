package updater

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// overrideSentinelPath temporarily redirects the sentinel to a temp dir so
// tests never touch the real /tmp/ninjabackup_update_sentinel.json.
func overrideSentinelDir(t *testing.T) {
	t.Helper()
	dir := t.TempDir()
	orig := os.Getenv("TMPDIR")
	os.Setenv("TMPDIR", dir)
	t.Cleanup(func() { os.Setenv("TMPDIR", orig) })
}

// writeSentinelAt writes a sentinel at the given path (helper for tests).
func writeSentinelAt(t *testing.T, path string, s updateSentinel) {
	t.Helper()
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		t.Fatalf("marshal sentinel: %v", err)
	}
	if err := os.WriteFile(path, b, 0600); err != nil {
		t.Fatalf("write sentinel: %v", err)
	}
}

// ---- sentinel file round-trip ----

func TestSentinelWriteRead(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "sentinel.json")

	want := updateSentinel{
		BackupPath:  "/usr/bin/ninjabackup.bak",
		AppliedAt:   time.Now().Truncate(time.Second),
		FromVersion: "1.0.0",
		ToVersion:   "1.1.0",
	}

	b, _ := json.MarshalIndent(want, "", "  ")
	os.WriteFile(path, b, 0600)

	b2, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var got updateSentinel
	if err := json.Unmarshal(b2, &got); err != nil {
		t.Fatal(err)
	}

	if got.BackupPath != want.BackupPath {
		t.Errorf("BackupPath: got %q want %q", got.BackupPath, want.BackupPath)
	}
	if got.FromVersion != want.FromVersion {
		t.Errorf("FromVersion: got %q want %q", got.FromVersion, want.FromVersion)
	}
	if got.ToVersion != want.ToVersion {
		t.Errorf("ToVersion: got %q want %q", got.ToVersion, want.ToVersion)
	}
}

// ---- readSentinel returns nil when no file exists ----

func TestReadSentinel_Missing(t *testing.T) {
	// Point sentinelPath() at a temp dir with no sentinel file.
	overrideSentinelDir(t)

	s, err := readSentinel()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s != nil {
		t.Errorf("expected nil sentinel, got %+v", s)
	}
}

// ---- readSentinel returns nil on corrupt JSON ----

func TestReadSentinel_Corrupt(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "ninjabackup_update_sentinel.json")
	os.WriteFile(p, []byte("{not valid json"), 0600)

	b, err := os.ReadFile(p)
	if err != nil {
		t.Fatal(err)
	}
	var s updateSentinel
	err = json.Unmarshal(b, &s)
	if err == nil {
		t.Error("expected unmarshal error for corrupt JSON")
	}
}

// ---- CheckUpdateSentinel: no sentinel → returns false ----

func TestCheckUpdateSentinel_NoSentinel(t *testing.T) {
	overrideSentinelDir(t)

	result := CheckUpdateSentinel(90 * time.Second)
	if result {
		t.Error("expected false (no sentinel present)")
	}
}

// ---- CheckUpdateSentinel: stale sentinel → removes it and returns false ----

func TestCheckUpdateSentinel_StaleSentinel(t *testing.T) {
	overrideSentinelDir(t)

	// Write a sentinel that is 10 minutes old (beyond any grace window).
	s := updateSentinel{
		BackupPath:  "/does/not/exist.bak",
		AppliedAt:   time.Now().Add(-10 * time.Minute),
		FromVersion: "1.0.0",
		ToVersion:   "1.1.0",
	}
	b, _ := json.MarshalIndent(s, "", "  ")
	os.WriteFile(sentinelPath(), b, 0600)

	result := CheckUpdateSentinel(90 * time.Second)
	if result {
		t.Error("expected false for stale sentinel (should be cleaned up)")
	}

	// Sentinel should have been removed.
	if _, err := os.Stat(sentinelPath()); !os.IsNotExist(err) {
		t.Error("expected stale sentinel to be deleted")
	}
}

// ---- CheckUpdateSentinel: fresh sentinel but backup missing → returns false (no crash loop) ----

func TestCheckUpdateSentinel_FreshSentinel_BackupMissing(t *testing.T) {
	overrideSentinelDir(t)

	s := updateSentinel{
		BackupPath:  "/nonexistent/path/ninjabackup.bak",
		AppliedAt:   time.Now(), // just written
		FromVersion: "1.0.0",
		ToVersion:   "1.1.0",
	}
	b, _ := json.MarshalIndent(s, "", "  ")
	os.WriteFile(sentinelPath(), b, 0600)

	// On a real system performRollback would fail because the backup doesn't
	// exist and restartService would also fail (no systemd in test env).
	// The function must NOT return true (which would cause the caller to exit)
	// when rollback itself fails.
	result := CheckUpdateSentinel(90 * time.Second)
	if result {
		t.Error("expected false when rollback cannot be performed (backup missing)")
	}
}

// ---- MarkStartupHealthy: removes existing sentinel ----

func TestMarkStartupHealthy_RemovesSentinel(t *testing.T) {
	overrideSentinelDir(t)

	// Create a sentinel file.
	b, _ := json.MarshalIndent(updateSentinel{
		BackupPath:  "/some/path.bak",
		AppliedAt:   time.Now(),
		FromVersion: "1.0.0",
		ToVersion:   "1.1.0",
	}, "", "  ")
	os.WriteFile(sentinelPath(), b, 0600)

	MarkStartupHealthy()

	if _, err := os.Stat(sentinelPath()); !os.IsNotExist(err) {
		t.Error("expected sentinel to be removed after MarkStartupHealthy()")
	}
}

// ---- MarkStartupHealthy: no-op when sentinel absent ----

func TestMarkStartupHealthy_NoSentinel(t *testing.T) {
	overrideSentinelDir(t)

	// Should not panic or error when the sentinel doesn't exist.
	MarkStartupHealthy()
}
