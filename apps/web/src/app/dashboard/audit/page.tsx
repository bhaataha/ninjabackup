'use client';

import { useState } from 'react';

const AUDIT_LOGS = [
  { id: '1', user: 'David Cohen', email: 'admin@company.com', action: 'auth.login', resource: '-', ip: '192.168.1.100', createdAt: '2026-04-14T08:00:00Z' },
  { id: '2', user: 'David Cohen', email: 'admin@company.com', action: 'agent.token.create', resource: 'Agent Token', ip: '192.168.1.100', createdAt: '2026-04-14T07:55:00Z' },
  { id: '3', user: 'System', email: 'system', action: 'agent.register', resource: 'SRV-DC01', ip: '10.0.0.50', createdAt: '2026-04-14T07:50:00Z' },
  { id: '4', user: 'Sarah Levi', email: 'ops@company.com', action: 'policy.create', resource: 'Daily File Backup', ip: '192.168.1.101', createdAt: '2026-04-14T07:45:00Z' },
  { id: '5', user: 'System', email: 'system', action: 'backup.start', resource: 'SRV-DC01 / Daily File', ip: '-', createdAt: '2026-04-14T07:30:00Z' },
  { id: '6', user: 'System', email: 'system', action: 'backup.complete', resource: 'DESKTOP-HR01', ip: '-', createdAt: '2026-04-14T08:08:00Z' },
  { id: '7', user: 'System', email: 'system', action: 'backup.failed', resource: 'SRV-FILE01', ip: '-', createdAt: '2026-04-14T07:23:00Z' },
  { id: '8', user: 'David Cohen', email: 'admin@company.com', action: 'vault.create', resource: 'Production S3', ip: '192.168.1.100', createdAt: '2026-04-13T16:00:00Z' },
  { id: '9', user: 'Sarah Levi', email: 'ops@company.com', action: 'user.create', resource: 'tech@company.com', ip: '192.168.1.101', createdAt: '2026-04-13T14:30:00Z' },
  { id: '10', user: 'Yossi Ben-Ari', email: 'tech@company.com', action: 'agent.backup.manual', resource: 'DESKTOP-DEV03', ip: '192.168.1.102', createdAt: '2026-04-13T12:00:00Z' },
];

function getActionStyle(action: string) {
  if (action.includes('failed')) return { color: 'var(--accent-danger)', icon: '❌' };
  if (action.includes('login')) return { color: 'var(--accent-primary)', icon: '🔑' };
  if (action.includes('create')) return { color: 'var(--accent-success)', icon: '➕' };
  if (action.includes('delete') || action.includes('remove')) return { color: 'var(--accent-danger)', icon: '🗑️' };
  if (action.includes('backup')) return { color: 'var(--accent-primary)', icon: '📦' };
  if (action.includes('register')) return { color: 'var(--accent-purple)', icon: '🖥️' };
  return { color: 'var(--text-secondary)', icon: '📝' };
}

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const filtered = search
    ? AUDIT_LOGS.filter((l) => l.action.includes(search) || l.user.includes(search) || l.resource.includes(search))
    : AUDIT_LOGS;

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Audit Log</h1>
            <p className="page-subtitle">All actions are logged with HMAC signatures for integrity</p>
          </div>
          <button className="btn btn-secondary">📥 Export CSV</button>
        </div>
      </header>

      <div className="page-body">
        {/* Search */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <input
            type="text"
            placeholder="Search by action, user, or resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', maxWidth: '400px', padding: '10px 16px',
              background: 'var(--bg-input)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
              fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Resource</th><th>IP Address</th><th>Integrity</th></tr></thead>
            <tbody>
              {filtered.map((log) => {
                const style = getActionStyle(log.action);
                return (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{log.user}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.email}</div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem',
                        fontFamily: 'monospace', fontWeight: 600, color: style.color,
                      }}>
                        {style.icon} {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{log.resource}</td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{log.ip}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                        background: 'var(--accent-success-glow)', color: 'var(--accent-success)',
                      }}>🔒 HMAC Valid</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
