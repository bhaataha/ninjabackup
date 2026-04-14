# NinjaBackup API Server

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local

# Run database migrations
cd ../../packages/database
npx prisma migrate dev
cd ../../apps/api

# Start development server
pnpm dev
```

The API server will start at **http://localhost:3038**.

## Modules

| Module | Endpoints | Description |
|:---|:---:|:---|
| Auth | 5 | Registration, login, JWT refresh, MFA setup/verify |
| Tenants | 3 | Dashboard stats, settings |
| Users | 5 | CRUD + role management |
| Agents | 8 | Registration tokens, heartbeat, CRUD, stats |
| Storage | 6 | Vault CRUD, connection test, usage |
| Policies | 7 | CRUD, agent assignment |
| Jobs | 5 | Trigger, cancel, progress, stats |
| Snapshots | 3 | List, detail, browse files |
| Restore | 3 | Trigger, status, list |
| Alerts | 6 | Rules CRUD, acknowledge |
| Audit | 1 | Query with filters |
| Notifications | — | Email + Webhook (internal service) |

## Architecture

### Global Interceptor
The `AuditInterceptor` automatically logs all mutating API calls (POST/PATCH/PUT/DELETE) with:
- User ID and tenant ID
- Action name (e.g., `agents.create`)
- Resource ID
- Duration in milliseconds
- IP address and user agent

### Tenant Middleware
Every request (except auth and agent heartbeat) passes through `TenantMiddleware` which:
1. Extracts `tenantId` from the JWT
2. Verifies the tenant exists and is active
3. Injects tenant data into the request

### WebSocket Gateway
Socket.IO gateway at `/ws` namespace:
- Tenant room isolation (clients join `tenant:{id}`)
- Agent room tracking (agents join `agent:{id}`)
- Bidirectional: server can push commands to agents
- Injectable via `EventsGateway` into any service

### Notifications
Multi-channel notification service:
- **Email**: SMTP with dark-themed HTML templates
- **Webhook**: JSON POST to configured URL
- Fire-and-forget (never blocks API responses)

## Security

- **JWT + Refresh Tokens** — 15m access / 7d refresh
- **MFA** — TOTP (Google Authenticator compatible)
- **RBAC** — OWNER > ADMIN > OPERATOR > VIEWER
- **Credential Encryption** — AES-256-GCM for storage vault secrets
- **HMAC Audit** — SHA-256 signed log entries

## Environment Variables

See `.env.example` for all available configuration options.
