package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/ninjabackup/agent/internal/config"
)

// Client handles HTTP communication with the management server
type Client struct {
	cfg        *config.Config
	httpClient *http.Client
	baseURL    string
}

// RegisterRequest is the payload for agent registration
type RegisterRequest struct {
	RegistrationToken string      `json:"registrationToken"`
	Hostname          string      `json:"hostname"`
	DisplayName       string      `json:"displayName,omitempty"`
	OsType            string      `json:"osType"`
	OsVersion         string      `json:"osVersion,omitempty"`
	AgentVersion      string      `json:"agentVersion,omitempty"`
	CpuInfo           string      `json:"cpuInfo,omitempty"`
	RamGb             int         `json:"ramGb,omitempty"`
	DiskInfo          interface{} `json:"diskInfo,omitempty"`
}

// RegisterResponse is the response from registration
type RegisterResponse struct {
	AgentID  string `json:"agentId"`
	TenantID string `json:"tenantId"`
	Status   string `json:"status"`
}

// AgentCommand is a pending command returned by the heartbeat endpoint.
type AgentCommand struct {
	ID      string                 `json:"id"`
	Type    string                 `json:"type"`
	Payload map[string]interface{} `json:"payload"`
}

// HeartbeatResponse is returned by POST /agents/:id/heartbeat
type HeartbeatResponse struct {
	Commands []AgentCommand `json:"commands"`
}

// JobStatusUpdate is sent during backup/restore progress
type JobStatusUpdate struct {
	Status          string  `json:"status,omitempty"`
	BytesProcessed  int64   `json:"bytesProcessed,omitempty"`
	BytesUploaded   int64   `json:"bytesUploaded,omitempty"`
	FilesNew        int     `json:"filesNew,omitempty"`
	FilesChanged    int     `json:"filesChanged,omitempty"`
	FilesUnchanged  int     `json:"filesUnchanged,omitempty"`
	ErrorsCount     int     `json:"errorsCount,omitempty"`
	ProgressPercent float64 `json:"progressPercent,omitempty"`
	ErrorMessage    string  `json:"errorMessage,omitempty"`
}

// BackupPolicy received from the server
type BackupPolicy struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	Type            string   `json:"type"`
	ScheduleCron    string   `json:"scheduleCron"`
	IncludePaths    []string `json:"includePaths"`
	ExcludePatterns []string `json:"excludePatterns"`
	StorageVault    struct {
		Endpoint string `json:"endpoint"`
		Bucket   string `json:"bucket"`
		Region   string `json:"region"`
	} `json:"storageVault"`
	RetentionDaily   int  `json:"retentionDaily"`
	RetentionWeekly  int  `json:"retentionWeekly"`
	RetentionMonthly int  `json:"retentionMonthly"`
	RetentionYearly  int  `json:"retentionYearly"`
	BandwidthLimit   int  `json:"bandwidthLimitMbps"`
	Compression      bool `json:"compressionEnabled"`
	VSS              bool `json:"vssEnabled"`
}

// NewClient creates a new API client
func NewClient(cfg *config.Config) *Client {
	return &Client{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		baseURL: cfg.ServerURL,
	}
}

// Register registers the agent with the management server
func (c *Client) Register(req RegisterRequest) (*RegisterResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal: %w", err)
	}

	resp, err := c.httpClient.Post(c.baseURL+"/agents/register", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("http post: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("registration failed (HTTP %d): %s", resp.StatusCode, string(respBody))
	}

	var result RegisterResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &result, nil
}

// StartHeartbeat sends periodic heartbeats to the server and forwards any
// pending commands the server returns onto the given channel.
func (c *Client) StartHeartbeat(agentID, version string, commands chan<- AgentCommand) {
	interval := time.Duration(c.cfg.HeartbeatInterval) * time.Second
	if interval < 10*time.Second {
		interval = 60 * time.Second
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		cmds, err := c.sendHeartbeat(agentID, version)
		if err != nil {
			log.Printf("Heartbeat failed: %v", err)
			continue
		}
		for _, cmd := range cmds {
			if commands == nil {
				continue
			}
			select {
			case commands <- cmd:
			default:
				log.Printf("Command channel full, dropping %s (%s)", cmd.Type, cmd.ID)
			}
		}
	}
}

func (c *Client) sendHeartbeat(agentID, version string) ([]AgentCommand, error) {
	payload := map[string]interface{}{
		"status":       "ONLINE",
		"agentVersion": version,
	}

	body, _ := json.Marshal(payload)
	resp, err := c.httpClient.Post(
		fmt.Sprintf("%s/agents/%s/heartbeat", c.baseURL, agentID),
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("heartbeat returned HTTP %d", resp.StatusCode)
	}

	var parsed HeartbeatResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		// Older servers may return a raw agent object; treat as no commands.
		return nil, nil
	}
	return parsed.Commands, nil
}

// AckCommand reports command completion (or failure) back to the server.
func (c *Client) AckCommand(commandID string, errMsg string) {
	payload := map[string]string{}
	if errMsg != "" {
		payload["error"] = errMsg
	}
	body, _ := json.Marshal(payload)
	resp, err := c.httpClient.Post(
		fmt.Sprintf("%s/agents/commands/%s/ack", c.baseURL, commandID),
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		log.Printf("Failed to ack command %s: %v", commandID, err)
		return
	}
	resp.Body.Close()
}

// ReportStatus reports the agent status to the server
func (c *Client) ReportStatus(agentID, status string) {
	payload := map[string]string{"status": status}
	body, _ := json.Marshal(payload)

	resp, err := c.httpClient.Post(
		fmt.Sprintf("%s/agents/%s/heartbeat", c.baseURL, agentID),
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		log.Printf("Failed to report status: %v", err)
		return
	}
	resp.Body.Close()
}

// UpdateJobStatus sends job progress to the server
func (c *Client) UpdateJobStatus(jobID string, update JobStatusUpdate) error {
	body, _ := json.Marshal(update)

	resp, err := c.httpClient.Post(
		fmt.Sprintf("%s/jobs/%s/status", c.baseURL, jobID),
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return fmt.Errorf("update job status: %w", err)
	}
	defer resp.Body.Close()

	return nil
}

// UpdateRestoreStatus reports restore progress / completion to the server.
func (c *Client) UpdateRestoreStatus(restoreJobID string, update map[string]any) error {
	body, _ := json.Marshal(update)
	resp, err := c.httpClient.Post(
		fmt.Sprintf("%s/restore/%s/status", c.baseURL, restoreJobID),
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return fmt.Errorf("update restore status: %w", err)
	}
	defer resp.Body.Close()
	return nil
}

// FetchPolicies gets the assigned policies from the server
func (c *Client) FetchPolicies(agentID string) ([]BackupPolicy, error) {
	url := fmt.Sprintf("%s/agents/%s/policies", c.baseURL, agentID)
	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("fetch policies: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("fetch policies (HTTP %d): %s", resp.StatusCode, string(body))
	}

	var policies []BackupPolicy
	if err := json.NewDecoder(resp.Body).Decode(&policies); err != nil {
		return nil, fmt.Errorf("decode policies: %w", err)
	}
	return policies, nil
}
