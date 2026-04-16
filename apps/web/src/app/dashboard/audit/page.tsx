'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { audit as auditApi } from '@/lib/api';
import { Badge } from '@/components/Badge';
import { TableSkeleton } from '@/components/Skeleton';
import { EmptyState, ErrorBanner } from '@/components/EmptyState';

type AuditLog = {
  id: string;
  userName?: string;
  userEmail?: string;
  user?: string;
  email?: string;
  action: string;
  resource?: string;
  ipAddress?: string;
  ip?: string;
  createdAt: string;
  hmacValid?: boolean;
};

function getActionStyle(action: string) {
  if (action.includes('failed') || action.includes('failure')) return { color: 'var(--accent-danger)', icon: '❌' };
  if (action.includes('login')) return { color: 'var(--accent-primary)', icon: '🔑' };
  if (action.includes('create')) return { color: 'var(--accent-success)', icon: '➕' };
  if (action.includes('delete') || action.includes('remove')) return { color: 'var(--accent-danger)', icon: '🗑️' };
  if (action.includes('backup')) return { color: 'var(--accent-primary)', icon: '📦' };
  if (action.includes('register')) return { color: 'var(--accent-purple)', icon: '🖥️' };
  return { color: 'var(--text-secondary)', icon: '📝' };
}

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const { data, loading, error, refetch } = useFetch<AuditLog[]>(
    () => auditApi.list({ action: actionFilter || undefined, limit: 200 }) as Promise<AuditLog[]>,
    [actionFilter],
  );

  const logs = data ?? [];
  const filtered = search
    ? logs.filter(
        (l) =>
          l.action.toLowerCase().includes(search.toLowerCase()) ||
          (l.userName ?? l.user ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (l.resource ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : logs;

  function exportCsv() {
    const header = ['Time', 'User', 'Email', 'Action', 'Resource', 'IP'];
    const rows = filtered.map((l) => [
      l.createdAt,
      l.userName ?? l.user ?? '',
      l.userEmail ?? l.email ?? '',
      l.action,
      l.resource ?? '',
      l.ipAddress ?? l.ip ?? '',
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Audit Log</h1>
            <p className="page-subtitle">All actions are logged with HMAC signatures for integrity</p>
          </div>
          <button className="btn btn-secondary" onClick={exportCsv} disabled={filtered.length === 0}>
            📥 Export CSV
          </button>
        </div>
      </header>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by action, user, or resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '10px 16px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input"
            style={{ maxWidth: 220 }}
          >
            <option value="">All actions</option>
            <option value="auth.login">auth.login</option>
            <option value="agent.register">agent.register</option>
            <option value="backup.start">backup.start</option>
            <option value="backup.complete">backup.complete</option>
            <option value="backup.failed">backup.failed</option>
            <option value="policy.create">policy.create</option>
            <option value="vault.create">vault.create</option>
            <option value="user.create">user.create</option>
          </select>
          <button className="btn btn-sm btn-secondary" onClick={refetch}>
            🔄 Refresh
          </button>
        </div>

        {error && <ErrorBanner message={error} onRetry={refetch} />}

        {loading && logs.length === 0 ? (
          <TableSkeleton rows={8} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="📝" title="No audit entries" description="Actions taken by users and the system will appear here." />
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>IP Address</th>
                  <th>Integrity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const style = getActionStyle(log.action);
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {log.userName ?? log.user ?? 'System'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.userEmail ?? log.email ?? '—'}</div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            color: style.color,
                          }}
                        >
                          {style.icon} {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{log.resource ?? '—'}</td>
                      <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {log.ipAddress ?? log.ip ?? '—'}
                      </td>
                      <td>
                        {log.hmacValid !== false ? (
                          <Badge tone="success" size="xs">🔒 HMAC Valid</Badge>
                        ) : (
                          <Badge tone="danger" size="xs">⚠️ Invalid</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
