# NinjaBackup Agent

Cross-platform desktop backup agent written in Go.

## Build

```bash
# Build for current OS
go build -o agent ./cmd/agent

# Build for Windows
GOOS=windows GOARCH=amd64 go build -o agent.exe ./cmd/agent

# Build for Linux
GOOS=linux GOARCH=amd64 go build -o agent ./cmd/agent

# Build for macOS
GOOS=darwin GOARCH=arm64 go build -o agent ./cmd/agent
```

## Usage

### First Time Setup

```bash
# 1. Generate a registration token in the Dashboard
#    Dashboard → Agents → Generate Token

# 2. Register the agent
./agent --register <TOKEN> --server https://api.company.com

# 3. Install as system service (requires admin/root)
./agent --install

# The agent will now:
# - Send heartbeat every 60 seconds
# - Check for backup jobs every 30 seconds
# - Auto-update when new versions are available
```

### CLI Reference

```
NinjaBackup Agent v1.0.0

Usage:
  agent [flags]

Flags:
  --register <token>    Register with server using token
  --server <url>        API server URL
  --install             Install as system service
  --uninstall           Remove system service
  --status              Check service status
  --service             Run in service mode (used by service manager)
  --version             Show version
```

## Packages

| Package | Description |
|:---|:---|
| `cmd/agent` | Entry point, CLI argument parsing, lifecycle management |
| `internal/api` | HTTP client for server communication (register, heartbeat, job status) |
| `internal/config` | Cross-platform configuration management (JSON persistence) |
| `internal/restic` | Restic CLI wrapper (backup, restore, snapshots, forget, check, stats) |
| `internal/scheduler` | Job scheduler with progress reporting and retention management |
| `internal/sysinfo` | System information collector (hostname, OS, CPU, RAM, disks) |
| `internal/vss` | Windows Volume Shadow Copy Service integration |
| `internal/image` | Full disk/volume image backup (Windows VSS, Linux block device) |
| `internal/crypto` | Zero-Knowledge Encryption (Argon2id KEK + AES-256-GCM DEK wrap) |
| `internal/certs` | mTLS certificate management (ECDSA P-256 generation + TLS config) |
| `internal/updater` | Auto-update system (check, download, replace, restart) |
| `internal/service` | Cross-platform service installer (Windows/Linux/macOS) |

## Agent Lifecycle

```
┌─────────────┐
│  First Run   │──── --register TOKEN --server URL
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│   Register   │────►│  Save Config │
│  with Server │     │  to Disk     │
└──────┬──────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│  Main Loop   │◄───────────────────────┐
└──────┬──────┘                         │
       │                                │
       ├── Heartbeat (every 60s) ───────┤
       │                                │
       ├── Check Jobs (every 30s) ──────┤
       │       │                        │
       │       ▼                        │
       │   ┌─────────────┐             │
       │   │ Run Backup   │             │
       │   │ (Restic CLI)  │             │
       │   └──────┬──────┘             │
       │          │                     │
       │          ▼                     │
       │   ┌─────────────┐             │
       │   │  Report      │             │
       │   │  Progress    │─────────────┘
       │   └─────────────┘
       │
       └── Auto-Update (every 6h) ─── Download → Replace → Restart
```

## Configuration

### Config File Locations

| OS | Path |
|:---|:---|
| Windows | `C:\ProgramData\NinjaBackup\config.json` |
| Linux | `/etc/ninjabackup/config.json` |
| macOS | `/Library/Application Support/NinjaBackup/config.json` |

### Config Schema

```json
{
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "serverUrl": "https://api.company.com",
  "authToken": "eyJhbGciOiJIUzI1NiIs...",
  "resticPath": "C:\\Program Files\\NinjaBackup\\restic.exe",
  "agentVersion": "1.0.0"
}
```

## Security

### Zero-Knowledge Encryption

The agent implements client-side encryption where the server **never** sees the raw encryption key:

1. **DEK** (Data Encryption Key) — random 256-bit AES key, used as Restic password
2. **KEK** (Key Encryption Key) — derived from user passphrase via Argon2id (64 MB, 3 iterations, 4 threads)
3. **Wrapped DEK** — DEK encrypted with AES-256-GCM using KEK, stored on server
4. **Fingerprint** — SHA-256 hash of DEK for verification without exposure

### mTLS Certificates

- ECDSA P-256 client certificates auto-generated on first run
- Stored in `ProgramData/NinjaBackup/certs/` (Windows)
- Mutual TLS ensures both agent and server verify each other

### VSS (Windows)

- Creates Volume Shadow Copy before backup
- Ensures consistent backup of locked files (databases, PST, etc.)
- Shadow copy automatically cleaned up after backup

## Windows Installer

Build the NSIS installer:

```bash
# Requires NSIS installed (https://nsis.sourceforge.io/)
cd installer
makensis installer.nsi
```

The installer:
1. Copies agent.exe and restic.exe to Program Files
2. Prompts for server URL and registration token
3. Installs as Windows service (auto-start)
4. Registers the agent with the server
5. Starts the service

## Service Management

### Windows
```powershell
sc query NinjaBackup       # Check status
sc stop NinjaBackup        # Stop service
sc start NinjaBackup       # Start service
```

### Linux
```bash
systemctl status ninjabackup    # Check status
systemctl stop ninjabackup      # Stop service
systemctl start ninjabackup     # Start service
journalctl -u ninjabackup -f   # View logs
```

### macOS
```bash
launchctl list | grep ninjabackup    # Check status
launchctl unload /Library/LaunchDaemons/com.ninjabackup.agent.plist  # Stop
launchctl load /Library/LaunchDaemons/com.ninjabackup.agent.plist    # Start
```
