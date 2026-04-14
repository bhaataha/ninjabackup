# NinjaBackup Dashboard

Premium dark-themed web dashboard built with Next.js 16.

## Quick Start

```bash
pnpm install
pnpm dev
```

Dashboard runs at **http://localhost:3039**.

## Pages

| Route | Description |
|:---|:---|
| `/login` | Authentication with MFA support |
| `/dashboard` | Main KPIs + live activity feed |
| `/dashboard/agents` | Agent management + registration |
| `/dashboard/jobs` | Backup job monitoring |
| `/dashboard/policies` | Backup policy configuration |
| `/dashboard/snapshots` | Snapshot timeline view |
| `/dashboard/restore` | File browser + restore wizard |
| `/dashboard/storage` | Storage vault management |
| `/dashboard/alerts` | Alert rules + notifications |
| `/dashboard/reports` | Analytics charts + PDF export |
| `/dashboard/users` | User management + RBAC |
| `/dashboard/audit` | HMAC-verified audit log |
| `/dashboard/settings` | Tenant configuration |

## API Integration

The dashboard uses a centralized API client (`src/lib/api.ts`) with:
- **Auto token refresh** — Transparent JWT renewal on 401
- **Typed methods** — All 10 API module groups
- **Error handling** — ApiError class with status codes
- **Redirect** — Auto-redirect to `/login` on session expiry

### Usage

```tsx
import { agents, jobs, auth, setTokens } from '@/lib/api';

// Login
const result = await auth.login(email, password);
setTokens(result);

// Fetch data
const agentList = await agents.list();
const jobStats = await jobs.getStats();
```

## Real-Time (WebSocket)

```tsx
import { useSocket } from '@/hooks/useSocket';

function Dashboard() {
  const { connected, jobProgress, agentStatuses, alerts, activityFeed } = useSocket({
    tenantId: 'your-tenant-id',
  });

  // jobProgress: Map<jobId, { progress, bytesProcessed, status }>
  // agentStatuses: Map<agentId, { status, timestamp }>
  // activityFeed: { type, message, receivedAt }[]
}
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3038/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3038
```

## Design System

The dashboard uses a custom CSS design system with CSS custom properties:

- **Colors**: Dark theme with blue/purple accents
- **Typography**: System font stack
- **Components**: Cards, badges, progress bars, tables, modals
- **Animations**: fadeInUp, fadeInDown, pulse, micro-hover effects
