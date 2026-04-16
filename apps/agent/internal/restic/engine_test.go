package restic

import (
	"encoding/json"
	"testing"
)

func TestResticProgress_StatusLine(t *testing.T) {
	line := []byte(`{"message_type":"status","seconds_elapsed":12.5,"bytes_done":1048576,"total_bytes":10485760,"files_done":3,"total_files":10,"percent_done":0.1}`)
	var p ResticProgress
	if err := json.Unmarshal(line, &p); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if p.MessageType != "status" {
		t.Errorf("want status, got %q", p.MessageType)
	}
	if p.BytesDone != 1048576 || p.TotalBytes != 10485760 {
		t.Errorf("byte counters wrong: %+v", p)
	}
	if p.PercentDone != 0.1 {
		t.Errorf("percent wrong: %f", p.PercentDone)
	}
}

func TestResticProgress_SummaryLine(t *testing.T) {
	line := []byte(`{"message_type":"summary","files_new":5,"files_changed":2,"files_unmodified":100,"data_added":2048576,"snapshot_id":"abc123"}`)
	var p ResticProgress
	if err := json.Unmarshal(line, &p); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if p.MessageType != "summary" {
		t.Errorf("want summary, got %q", p.MessageType)
	}
	if p.FilesNew != 5 || p.FilesChanged != 2 || p.FilesUnchanged != 100 {
		t.Errorf("file counters wrong: %+v", p)
	}
}
