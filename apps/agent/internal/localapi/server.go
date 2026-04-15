// Package localapi exposes a small loopback HTTP server inside the agent
// process so the tray companion app and the CLI can read live status and
// trigger actions without going through the cloud API.
//
// Bound to 127.0.0.1 only — never reachable from the network.
package localapi

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/ninjabackup/agent/internal/config"
)

// Status is the snapshot the tray (or CLI) reads.
type Status struct {
	AgentID       string    `json:"agentId"`
	TenantID      string    `json:"tenantId"`
	Hostname      string    `json:"hostname"`
	Version       string    `json:"version"`
	State         string    `json:"state"` // IDLE | BACKING_UP | RESTORING | ERROR | PAUSED
	CurrentJobID  string    `json:"currentJobId,omitempty"`
	Progress      float64   `json:"progress"`
	BytesUploaded int64     `json:"bytesUploaded"`
	LastBackupAt  time.Time `json:"lastBackupAt,omitempty"`
	LastError     string    `json:"lastError,omitempty"`
	Paused        bool      `json:"paused"`
	ServerURL     string    `json:"serverUrl"`
}

// Handlers wires the agent's runtime state into the local API.
type Handlers struct {
	mu     sync.RWMutex
	status Status

	// Callbacks dispatched on tray/CLI requests.
	OnBackupNow func() error
	OnPause     func(paused bool)
}

// NewHandlers returns a fresh Handlers with the initial status.
func NewHandlers(initial Status) *Handlers {
	return &Handlers{status: initial}
}

// SetStatus atomically replaces the current status snapshot.
func (h *Handlers) SetStatus(s Status) {
	h.mu.Lock()
	h.status = s
	h.mu.Unlock()
}

// PatchStatus applies a function to the current snapshot under the lock.
func (h *Handlers) PatchStatus(fn func(*Status)) {
	h.mu.Lock()
	fn(&h.status)
	h.mu.Unlock()
}

// GetStatus returns a copy of the current status.
func (h *Handlers) GetStatus() Status {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.status
}

// Serve starts the loopback server. Returns the listener so the caller can
// close it on shutdown.
func (h *Handlers) Serve() (net.Listener, error) {
	mux := http.NewServeMux()
	mux.HandleFunc("/status", h.statusHandler)
	mux.HandleFunc("/backup", h.backupHandler)
	mux.HandleFunc("/pause", h.pauseHandler)

	addr := fmt.Sprintf("127.0.0.1:%d", config.LocalAPIPort)
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("local api bind: %w", err)
	}
	go func() {
		_ = http.Serve(ln, mux)
	}()
	return ln, nil
}

func (h *Handlers) statusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(h.GetStatus())
}

func (h *Handlers) backupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if h.OnBackupNow == nil {
		http.Error(w, "no backup handler", http.StatusServiceUnavailable)
		return
	}
	if err := h.OnBackupNow(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusAccepted)
	_, _ = w.Write([]byte(`{"ok":true}`))
}

func (h *Handlers) pauseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Paused bool `json:"paused"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if h.OnPause != nil {
		h.OnPause(body.Paused)
	}
	h.PatchStatus(func(s *Status) { s.Paused = body.Paused })
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"ok":true}`))
}
