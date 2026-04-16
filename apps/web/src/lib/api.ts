/**
 * NinjaBackup API Client
 * 
 * Central API abstraction for the Dashboard.
 * Handles authentication, token refresh, error handling,
 * and provides typed methods for each endpoint group.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3038/api/v1';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Token Management ────────────────────────────────────

let tokens: TokenPair | null = null;

export function setTokens(t: TokenPair) {
  tokens = t;
  if (typeof window !== 'undefined') {
    localStorage.setItem('nbk_access', t.accessToken);
    localStorage.setItem('nbk_refresh', t.refreshToken);
  }
}

export function getTokens(): TokenPair | null {
  if (tokens) return tokens;
  if (typeof window !== 'undefined') {
    const access = localStorage.getItem('nbk_access');
    const refresh = localStorage.getItem('nbk_refresh');
    if (access && refresh) {
      tokens = { accessToken: access, refreshToken: refresh };
      return tokens;
    }
  }
  return null;
}

export function clearTokens() {
  tokens = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('nbk_access');
    localStorage.removeItem('nbk_refresh');
  }
}

// ─── HTTP Client ─────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: any,
  retry = true,
): Promise<T> {
  const t = getTokens();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (t) {
    headers['Authorization'] = `Bearer ${t.accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle 401 — attempt token refresh
  if (res.status === 401 && retry && t?.refreshToken) {
    const refreshed = await refreshTokens(t.refreshToken);
    if (refreshed) {
      return request<T>(method, path, body, false);
    }
    clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, error.message || 'API Error', error);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function refreshTokens(refreshToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Auth ────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; requiresMfa?: boolean; mfaToken?: string }>('POST', '/auth/login', { email, password }),

  register: (data: { email: string; password: string; firstName: string; lastName: string; organizationName: string; tenantName?: string }) =>
    request<{ accessToken: string; refreshToken: string }>('POST', '/auth/register', data),

  verifyMfa: (code: string, mfaToken?: string) =>
    request<{ accessToken: string; refreshToken: string }>('POST', '/auth/mfa/verify', { code, mfaToken }),

  setupMfa: () =>
    request<{ secret: string; qrCodeUrl: string; otpauthUrl?: string }>('POST', '/auth/mfa/setup'),

  confirmMfa: (code: string) =>
    request<{ ok: boolean }>('POST', '/auth/mfa/confirm', { code }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('POST', '/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>('POST', '/auth/reset-password', { token, newPassword }),

  logout: () => {
    clearTokens();
    if (typeof window !== 'undefined') window.location.href = '/login';
  },
};

// ─── Tenants ─────────────────────────────────────────────

export const tenants = {
  getCurrent: () => request<any>('GET', '/tenants/current'),
  getDashboard: () => request<any>('GET', '/tenants/dashboard'),
  updateSettings: (data: any) => request<any>('PATCH', '/tenants/settings', data),
};

// ─── Users ───────────────────────────────────────────────

export const users = {
  list: () => request<any[]>('GET', '/users'),
  getById: (id: string) => request<any>('GET', `/users/${id}`),
  create: (data: any) => request<any>('POST', '/users', data),
  update: (id: string, data: any) => request<any>('PATCH', `/users/${id}`, data),
  delete: (id: string) => request<void>('DELETE', `/users/${id}`),
};

// ─── Pagination helper ───────────────────────────────────
// API list endpoints sometimes return { data, meta } and sometimes a raw array.
// Dashboards consume arrays — unwrap the page if needed.

async function unwrapPage<T>(p: Promise<{ data: T[]; meta?: any } | T[]>): Promise<T[]> {
  const r = await p;
  return Array.isArray(r) ? r : r.data ?? [];
}

// ─── Agents ──────────────────────────────────────────────

export const agents = {
  list: () => unwrapPage<any>(request<{ data: any[]; meta?: any } | any[]>('GET', '/agents')),
  getById: (id: string) => request<any>('GET', `/agents/${id}`),
  update: (id: string, data: any) => request<any>('PATCH', `/agents/${id}`, data),
  delete: (id: string) => request<void>('DELETE', `/agents/${id}`),
  getStats: () => request<any>('GET', '/agents/stats'),
  createToken: () => request<{ token: string; expiresAt: string }>('POST', '/agents/token'),
};

// ─── Storage Vaults ──────────────────────────────────────

export const storage = {
  list: () => request<any[]>('GET', '/storage'),
  getById: (id: string) => request<any>('GET', `/storage/${id}`),
  create: (data: any) => request<any>('POST', '/storage', data),
  update: (id: string, data: any) => request<any>('PATCH', `/storage/${id}`, data),
  delete: (id: string) => request<void>('DELETE', `/storage/${id}`),
  testConnection: (id: string) => request<{ success: boolean; latencyMs: number }>('POST', `/storage/${id}/test`),
  getUsage: (id: string) => request<any>('GET', `/storage/${id}/usage`),
};

// ─── Policies ────────────────────────────────────────────

export const policies = {
  list: () => request<any[]>('GET', '/policies'),
  getById: (id: string) => request<any>('GET', `/policies/${id}`),
  create: (data: any) => request<any>('POST', '/policies', data),
  update: (id: string, data: any) => request<any>('PATCH', `/policies/${id}`, data),
  delete: (id: string) => request<void>('DELETE', `/policies/${id}`),
  assignAgent: (id: string, agentId: string) => request<any>('POST', `/policies/${id}/agents/${agentId}`),
  unassignAgent: (id: string, agentId: string) => request<void>('DELETE', `/policies/${id}/agents/${agentId}`),
  getAgents: (id: string) => request<{ agentIds: string[] } | any[]>('GET', `/policies/${id}/agents`),
};

// ─── Jobs ────────────────────────────────────────────────

export const jobs = {
  list: (params?: { status?: string; agentId?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return unwrapPage<any>(
      request<{ data: any[]; meta?: any } | any[]>('GET', `/jobs${qs ? `?${qs}` : ''}`),
    );
  },
  listPaged: (params?: { status?: string; agentId?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ data: any[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      'GET',
      `/jobs${qs ? `?${qs}` : ''}`,
    );
  },
  getById: (id: string) => request<any>('GET', `/jobs/${id}`),
  trigger: (data: { agentId: string; policyId: string; type?: string }) =>
    request<any>('POST', '/jobs', data),
  cancel: (id: string) => request<any>('POST', `/jobs/${id}/cancel`),
  getStats: () => request<any>('GET', '/jobs/stats'),
};

// ─── Snapshots ───────────────────────────────────────────

export const snapshots = {
  list: (agentId?: string) => {
    const qs = agentId ? `?agentId=${agentId}` : '';
    return request<any[]>('GET', `/snapshots${qs}`);
  },
  getById: (id: string) => request<any>('GET', `/snapshots/${id}`),
  browse: (id: string, path: string) =>
    request<any>('GET', `/snapshots/${id}/browse?path=${encodeURIComponent(path)}`),
  delete: (id: string) => request<void>('DELETE', `/snapshots/${id}`),
  deleteBulk: (ids: string[]) =>
    request<{ deleted: number }>('POST', `/snapshots/bulk-delete`, { ids }),
};

// ─── Restore ─────────────────────────────────────────────

export const restore = {
  list: () => request<any[]>('GET', '/restore'),
  trigger: (data: { snapshotId: string; agentId: string; targetPath?: string; includePaths?: string[] }) =>
    request<any>('POST', '/restore', data),
  preview: (data: { snapshotId: string; agentId: string; targetPath?: string; selectedPaths?: string[] }) =>
    request<{
      snapshotId: string;
      snapshotType: string;
      sourceAgent: string;
      targetAgent: string;
      pathCount: number;
      estimatedSizeBytes: string;
      estimatedFiles: number;
      targetPath: string;
      warnings: string[];
    }>('POST', '/restore/preview', data),
  getStatus: (id: string) => request<any>('GET', `/restore/${id}`),
};

// ─── Alerts ──────────────────────────────────────────────

export const alerts = {
  list: () => unwrapPage<any>(request<{ data: any[]; meta?: any } | any[]>('GET', '/alerts')),
  acknowledge: (id: string) => request<any>('POST', `/alerts/${id}/acknowledge`),
  rules: {
    list: () => request<any[]>('GET', '/alerts/rules'),
    create: (data: any) => request<any>('POST', '/alerts/rules', data),
    update: (id: string, data: any) => request<any>('PATCH', `/alerts/rules/${id}`, data),
    delete: (id: string) => request<void>('DELETE', `/alerts/rules/${id}`),
  },
};

// ─── Audit ───────────────────────────────────────────────

export const audit = {
  list: (params?: { action?: string; userId?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return unwrapPage<any>(
      request<{ data: any[]; meta?: any } | any[]>('GET', `/audit${qs ? `?${qs}` : ''}`),
    );
  },
  verify: () =>
    request<{ total: number; valid: number; invalid: number; tampered: string[] }>('GET', '/audit/verify'),
};

// ─── API Keys ────────────────────────────────────────────

export const apiKeys = {
  list: () => request<any[]>('GET', '/api-keys'),
  create: (data: { name: string; permissions: string[] }) =>
    request<{ id: string; name: string; key: string; keyPrefix: string }>('POST', '/api-keys', data),
  rename: (id: string, name: string) => request<{ ok: boolean }>('PATCH', `/api-keys/${id}`, { name }),
  revoke: (id: string) => request<void>('DELETE', `/api-keys/${id}`),
};

// ─── Webhooks ────────────────────────────────────────────

export const webhooks = {
  list: () => request<any[]>('GET', '/webhooks'),
  create: (data: { name: string; url: string; events: string[] }) => request<any>('POST', '/webhooks', data),
  update: (id: string, data: any) => request<any>('PATCH', `/webhooks/${id}`, data),
  delete: (id: string) => request<void>('DELETE', `/webhooks/${id}`),
  test: (id: string) => request<{ success: boolean; status: number; durationMs: number }>('POST', `/webhooks/${id}/test`),
  deliveries: (webhookId?: string) =>
    request<any[]>('GET', `/webhooks/deliveries${webhookId ? `?webhookId=${webhookId}` : ''}`),
};

// ─── Reports ─────────────────────────────────────────────

export const reports = {
  summary: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<any>('GET', `/reports/summary${qs ? `?${qs}` : ''}`);
  },
  storageUsage: () => request<any>('GET', '/reports/storage-usage'),
  agentActivity: () => request<any>('GET', '/reports/agent-activity'),
  successRate: (days?: number) =>
    request<{ labels: string[]; values: number[]; rate: number }>('GET', `/reports/success-rate?days=${days ?? 14}`),
  exportPdf: (kind: 'summary' | 'storage' | 'agents' | 'compliance') =>
    request<{ url: string }>('POST', `/reports/${kind}/export`),
};

// ─── Notifications ───────────────────────────────────────

export const NOTIFICATION_EVENTS = [
  'BACKUP_SUCCESS',
  'BACKUP_FAILED',
  'AGENT_OFFLINE',
  'STORAGE_WARNING',
  'RESTORE_COMPLETE',
] as const;
export type NotifEvent = (typeof NOTIFICATION_EVENTS)[number];
export interface EventPrefs { email: boolean; inApp: boolean }
export interface NotificationPrefs {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  events: Partial<Record<NotifEvent, EventPrefs>>;
}

export const notifications = {
  list: () => request<any[]>('GET', '/notifications'),
  markRead: (id: string) => request<void>('POST', `/notifications/${id}/read`),
  markAllRead: () => request<void>('POST', '/notifications/read-all'),
  unreadCount: () => request<{ count: number }>('GET', '/notifications/unread-count'),
  getPrefs: () => request<NotificationPrefs>('GET', '/notifications/prefs'),
  savePrefs: (prefs: Partial<NotificationPrefs>) =>
    request<NotificationPrefs>('PUT', '/notifications/prefs', prefs),
};

// ─── Snapshot file browse / versions ─────────────────────

export const files = {
  versions: (snapshotId: string, path: string) =>
    request<any[]>('GET', `/snapshots/${snapshotId}/versions?path=${encodeURIComponent(path)}`),
  download: (snapshotId: string, path: string) =>
    request<{ url: string; expiresAt: string }>('POST', `/snapshots/${snapshotId}/download`, { path }),
};

// ─── Agent installer downloads ───────────────────────────

export const installer = {
  list: () =>
    request<
      { platform: string; arch: string; version: string; url: string; sha256: string; sizeBytes: number }[]
    >('GET', '/installer'),
  installScript: (platform: 'windows' | 'linux' | 'macos', token: string, server?: string) => {
    const qs = new URLSearchParams({ platform, token, ...(server ? { server } : {}) }).toString();
    return request<{ script: string }>('GET', `/installer/script?${qs}`);
  },
};

// ─── Settings ────────────────────────────────────────────

export const settings = {
  get: () => request<any>('GET', '/settings'),
  update: (data: any) => request<any>('PATCH', '/settings', data),
};
