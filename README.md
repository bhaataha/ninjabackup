<p align="center">
  <img src="https://img.shields.io/badge/NinjaBackup-v1.0.0-3b82f6?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDJMNCA3djEwbDggNSA4LTVWN2wtOC01eiIvPjwvc3ZnPg==&logoColor=white" alt="NinjaBackup" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/Go-1.25-00ADD8?style=for-the-badge&logo=go" alt="Go" />
  <img src="https://img.shields.io/badge/NestJS-10-ea2845?style=for-the-badge&logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js" alt="Next.js" />
</p>

# 🥷 NinjaBackup

**Enterprise-grade, multi-tenant backup platform** — White-label ready, powered by [Restic](https://restic.net/).

File backup, image backup, point-in-time restore, zero-knowledge encryption, and a premium dark dashboard — all in one platform.

---

## ✨ Features

### 🖥️ Desktop Agent (Go)
- **File-level backup** — Incremental, deduplicated, compressed via Restic
- **Image-level backup** — Full disk/volume backup with VSS (Windows)
- **VSS integration** — Back up locked files on Windows
- **Zero-Knowledge Encryption** — Client-side AES-256-GCM + Argon2id key derivation
- **mTLS certificates** — ECDSA P-256 mutual TLS authentication
- **Auto-update** — Background self-update with rollback support
- **Cross-platform service** — Windows (sc.exe), Linux (systemd), macOS (launchd)
- **S3 storage support** — Any S3-compatible backend (AWS, MinIO, Wasabi, Backblaze)

### ⚙️ API Server (NestJS)
- **Multi-tenant** — Full tenant isolation with middleware enforcement
- **12 modules** — Auth, Tenants, Users, Agents, Storage, Policies, Jobs, Snapshots, Restore, Alerts, Audit, Notifications
- **55+ REST endpoints** — Complete CRUD + operations
- **WebSocket gateway** — Real-time bidirectional (Socket.IO)
- **Audit logging** — HMAC-SHA256 signed, automatic via global interceptor
- **Notifications** — Email (SMTP) + Webhook
- **Security** — JWT + MFA (TOTP), RBAC, AES-256-GCM credential encryption

### 🌐 Dashboard (Next.js)
- **15 pages** — Premium dark theme with glassmorphic design
- **Real-time** — Live activity feed, job progress, agent status via WebSocket
- **File browser** — Navigate snapshots, select files, restore with one click
- **Reports** — Charts, sparklines, agent performance + PDF export
- **MFA login** — Secure 6-digit TOTP flow

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     NinjaBackup Platform                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    REST/WS     ┌──────────┐    Prisma    ┌────┐│
│  │ Dashboard │◄──────────────►│   API    │◄────────────►│ DB ││
│  │ (Next.js) │    :3039      │ (NestJS) │    :3038     │    ││
│  └──────────┘                └────┬─────┘              └────┘│
│                                   │                          │
│                              REST + WS                       │
│                                   │                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │ Agent 1  │    │ Agent 2  │    │ Agent N  │               │
│  │ (Go)     │    │ (Go)     │    │ (Go)     │               │
│  │ Windows  │    │ Linux    │    │ macOS    │               │
│  └──────────┘    └──────────┘    └──────────┘               │
│       │               │               │                      │
│       ▼               ▼               ▼                      │
│  ┌─────────────────────────────────────────┐                │
│  │         S3 / MinIO / Wasabi             │                │
│  │        (Encrypted Restic Repos)         │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
ninjabackup/
├── apps/
│   ├── api/                          # NestJS API Server
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/             # JWT + MFA + RBAC
│   │   │   │   ├── tenants/          # Multi-tenant management
│   │   │   │   ├── users/            # User CRUD + roles
│   │   │   │   ├── agents/           # Agent registration + status
│   │   │   │   ├── storage/          # Storage vault management
│   │   │   │   ├── policies/         # Backup policy configuration
│   │   │   │   ├── jobs/             # Job orchestration + progress
│   │   │   │   ├── snapshots/        # Snapshot browsing
│   │   │   │   ├── restore/          # Restore operations
│   │   │   │   ├── alerts/           # Alert rules + notifications
│   │   │   │   ├── audit/            # HMAC-signed audit logs
│   │   │   │   └── notifications/    # Email + Webhook
│   │   │   ├── gateway/              # WebSocket (Socket.IO)
│   │   │   ├── interceptors/         # Global audit interceptor
│   │   │   ├── middleware/           # Tenant isolation
│   │   │   └── prisma/              # Prisma service
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web/                          # Next.js Dashboard
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── login/            # Auth + MFA
│   │   │   │   └── dashboard/
│   │   │   │       ├── agents/       # Agent management
│   │   │   │       ├── jobs/         # Job monitoring
│   │   │   │       ├── policies/     # Policy config
│   │   │   │       ├── snapshots/    # Snapshot timeline
│   │   │   │       ├── restore/      # File browser + restore
│   │   │   │       ├── storage/      # Storage vaults
│   │   │   │       ├── alerts/       # Alert management
│   │   │   │       ├── reports/      # Analytics + PDF export
│   │   │   │       ├── users/        # User management
│   │   │   │       ├── audit/        # Audit log viewer
│   │   │   │       └── settings/     # Tenant settings
│   │   │   ├── components/           # Sidebar, ActivityFeed
│   │   │   ├── hooks/                # useSocket
│   │   │   └── lib/                  # API client
│   │   └── package.json
│   │
│   └── agent/                        # Go Desktop Agent
│       ├── cmd/agent/main.go         # Entry point
│       ├── internal/
│       │   ├── api/                  # Server communication
│       │   ├── config/               # Configuration
│       │   ├── restic/               # Restic CLI wrapper
│       │   ├── scheduler/            # Job scheduler
│       │   ├── sysinfo/              # System info
│       │   ├── vss/                  # Windows VSS
│       │   ├── image/                # Image backup
│       │   ├── crypto/               # Zero-Knowledge Encryption
│       │   ├── certs/                # mTLS certificates
│       │   ├── updater/              # Auto-update
│       │   └── service/              # Service installer
│       ├── installer/                # NSIS installer script
│       └── go.mod
│
├── packages/
│   └── database/                     # Prisma schema (13 models)
│
├── docker-compose.yml
├── turbo.json
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Go 1.22+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/ninjabackup.git
cd ninjabackup
pnpm install
```

### 2. Setup Environment

```bash
cp apps/api/.env.example apps/api/.env.local
```

Edit `.env.local`:

```env
# Database
DATABASE_URL=postgresql://ninja:ninja_secret@localhost:5438/ninjabackup

# Auth
JWT_SECRET=change-me-to-64-char-random-string
JWT_REFRESH_SECRET=change-me-to-another-64-char-random-string
ENCRYPTION_KEY=32-byte-hex-key-for-vault-credentials

# Optional: Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
ALERT_EMAIL=admin@company.com

# Optional: Webhook
WEBHOOK_URL=https://your-webhook.com/ninjabackup
```

### 3. Start Infrastructure

```bash
docker compose up -d postgres redis
```

### 4. Run Database Migrations

```bash
cd packages/database
npx prisma migrate dev
cd ../..
```

### 5. Start Development

```bash
# Terminal 1: API (port 3038)
cd apps/api && pnpm dev

# Terminal 2: Dashboard (port 3039)
cd apps/web && pnpm dev

# Terminal 3: Build Agent
cd apps/agent && go build -o agent.exe ./cmd/agent
```

### 6. Open Dashboard

Navigate to **http://localhost:3039**

---

## 🖥️ Agent Usage

### Installation

```bash
# Build the agent
cd apps/agent
go build -o agent.exe ./cmd/agent

# Register with server
./agent.exe --register <TOKEN> --server https://your-api.com

# Install as service (requires admin/root)
./agent.exe --install
```

### CLI Flags

| Flag | Description |
|:---|:---|
| `--register <token>` | Register agent with server using a token |
| `--server <url>` | API server URL |
| `--install` | Install as system service |
| `--uninstall` | Remove system service |
| `--status` | Check service status |
| `--service` | Run in service mode |
| `--version` | Show version |

### Configuration

Agent config is stored at:
- **Windows:** `C:\ProgramData\NinjaBackup\config.json`
- **Linux:** `/etc/ninjabackup/config.json`
- **macOS:** `/Library/Application Support/NinjaBackup/config.json`

```json
{
  "agentId": "uuid",
  "serverUrl": "https://api.company.com",
  "authToken": "jwt-token",
  "resticPath": "/usr/bin/restic",
  "agentVersion": "1.0.0"
}
```

---

## 🔒 Security

### Zero-Knowledge Encryption (ZKE)

```
User Passphrase → Argon2id → KEK (Key Encryption Key)
                                    ↓
Random DEK (Data Encryption Key) → AES-256-GCM Wrap → Stored on Server
                                    ↓
DEK → Restic Repository Password
```

- **DEK** (Data Encryption Key) is a random 256-bit AES key
- **KEK** (Key Encryption Key) is derived from the user's passphrase via Argon2id (64MB, 3 iterations)
- The server only stores the **wrapped DEK** — it can never decrypt backups
- **SHA-256 fingerprint** allows verification without exposing the key

### mTLS

- Agent generates ECDSA P-256 client certificate
- Mutual TLS ensures both agent and server authenticate each other
- Certificate stored in `ProgramData/NinjaBackup/certs/`

### Audit Logging

- All mutations (POST/PATCH/PUT/DELETE) are automatically logged
- Each log entry is signed with **HMAC-SHA256** for tamper detection
- Global interceptor — zero code changes needed in controllers

---

## 🐳 Docker Deployment

### Full Stack

```bash
docker compose up -d
```

Services:
| Service | Port | Description |
|:---|:---:|:---|
| `postgres` | 5438 | PostgreSQL 16 |
| `redis` | 6338 | Redis 7 (caching, sessions) |
| `api` | 3038 | NestJS API Server |
| `web` | 3039 | Next.js Dashboard |

### Production Build

```bash
# Build API image
docker build -t ninjabackup-api ./apps/api

# Build Web image
docker build -t ninjabackup-web ./apps/web
```

---

## 📡 API Reference

Base URL: `http://localhost:3038/api/v1`

### Authentication
| Method | Endpoint | Description |
|:---|:---|:---|
| POST | `/auth/register` | Register new tenant + user |
| POST | `/auth/login` | Login (returns JWT) |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/mfa/setup` | Setup TOTP MFA |
| POST | `/auth/mfa/verify` | Verify MFA code |

### Agents
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/agents` | List all agents |
| GET | `/agents/:id` | Get agent details |
| POST | `/agents/token` | Generate registration token |
| POST | `/agents/register` | Agent self-registration |
| POST | `/agents/:id/heartbeat` | Agent heartbeat |
| PATCH | `/agents/:id` | Update agent |
| DELETE | `/agents/:id` | Delete agent |
| GET | `/agents/stats` | Agent statistics |

### Storage Vaults
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/storage` | List storage vaults |
| POST | `/storage` | Create vault (credentials encrypted) |
| POST | `/storage/:id/test` | Test vault connection |
| GET | `/storage/:id/usage` | Get usage stats |

### Policies
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/policies` | List backup policies |
| POST | `/policies` | Create policy |
| POST | `/policies/:id/agents/:agentId` | Assign agent to policy |

### Jobs
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/jobs` | List jobs (filterable) |
| POST | `/jobs/trigger` | Trigger manual backup |
| POST | `/jobs/:id/cancel` | Cancel running job |
| GET | `/jobs/stats` | Job statistics |

### Snapshots & Restore
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/snapshots` | List snapshots |
| GET | `/snapshots/:id/browse` | Browse snapshot files |
| POST | `/restore` | Trigger restore |
| GET | `/restore/:id` | Get restore status |

### Alerts
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/alerts` | List alerts |
| POST | `/alerts/:id/acknowledge` | Acknowledge alert |
| GET | `/alerts/rules` | List alert rules |
| POST | `/alerts/rules` | Create alert rule |

### Audit
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/audit` | Query audit logs |

---

## 🔌 WebSocket Events

Connect to: `ws://localhost:3038/ws`

### Client → Server
| Event | Payload | Description |
|:---|:---|:---|
| `join:tenant` | `{ tenantId }` | Dashboard joins tenant room |
| `agent:connect` | `{ agentId, tenantId }` | Agent registers for commands |
| `job:progress` | `{ jobId, progress, ... }` | Agent reports backup progress |

### Server → Client
| Event | Payload | Description |
|:---|:---|:---|
| `agent:status` | `{ agentId, status }` | Agent online/offline notification |
| `job:progress` | `{ jobId, progress, ... }` | Live backup progress |
| `alert:new` | `{ severity, message }` | New alert notification |
| `agent:command` | `{ command, payload }` | Command sent to specific agent |

---

## 📊 Database Models

| Model | Description |
|:---|:---|
| `Tenant` | Organization / account |
| `User` | User with role (OWNER/ADMIN/OPERATOR/VIEWER) |
| `Agent` | Registered backup agent |
| `AgentToken` | Registration tokens |
| `StorageVault` | S3/MinIO storage configuration (encrypted) |
| `BackupPolicy` | Backup schedule + retention rules |
| `BackupJob` | Individual backup execution |
| `Snapshot` | Point-in-time backup snapshot |
| `RestoreJob` | Restore operation |
| `AlertRule` | Alert condition + channels |
| `Alert` | Triggered alert instance |
| `AuditLog` | HMAC-signed action log |
| `MfaSecret` | TOTP MFA secrets |

---

## 🛣️ Roadmap

- [x] Core platform (API + Dashboard + Agent)
- [x] File backup with Restic
- [x] Image backup (VSS)
- [x] Zero-Knowledge Encryption
- [x] Multi-tenant architecture
- [x] Real-time WebSocket
- [x] Reports + PDF export
- [x] Auto-update agent
- [x] NSIS installer
- [ ] Bare-metal restore (Recovery ISO)
- [ ] Bandwidth throttling scheduler
- [ ] Agent groups & tags
- [ ] White-label customization portal
- [ ] Mobile app (React Native)

---

## 📄 License

MIT © NinjaBackup

---

<p align="center">
  Built with ❤️ by <strong>IT Ninja</strong>
</p>
