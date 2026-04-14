'use client';

import { useState } from 'react';

const MOCK_KEYS = [
  { id: '1', name: 'CI/CD Pipeline', keyPrefix: 'nb_live_', permissions: ['agents:read', 'jobs:read', 'jobs:trigger'], createdAt: '2026-03-01T10:00:00Z', lastUsedAt: '2026-04-14T08:30:00Z', active: true },
  { id: '2', name: 'Monitoring Integration', keyPrefix: 'nb_live_', permissions: ['agents:read', 'alerts:read'], createdAt: '2026-02-15T14:00:00Z', lastUsedAt: '2026-04-13T22:00:00Z', active: true },
  { id: '3', name: 'Old Script (deprecated)', keyPrefix: 'nb_test_', permissions: ['agents:read'], createdAt: '2026-01-10T09:00:00Z', lastUsedAt: '2026-03-01T10:00:00Z', active: false },
];

const AVAILABLE_PERMISSIONS = [
  { group: 'Agents', perms: ['agents:read', 'agents:write', 'agents:delete'] },
  { group: 'Jobs', perms: ['jobs:read', 'jobs:trigger', 'jobs:cancel'] },
  { group: 'Policies', perms: ['policies:read', 'policies:write'] },
  { group: 'Storage', perms: ['storage:read', 'storage:write'] },
  { group: 'Alerts', perms: ['alerts:read', 'alerts:write'] },
  { group: 'Restore', perms: ['restore:read', 'restore:trigger'] },
];

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ApiKeysPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [generatedKey, setGeneratedKey] = useState('');

  const togglePerm = (perm: string) => {
    setSelectedPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const key = 'nb_live_' + Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setGeneratedKey(key);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: 'var(--bg-input)',
    border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">API Keys</h1>
            <p className="page-subtitle">Manage programmatic access to the NinjaBackup API</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowCreate(true); setGeneratedKey(''); setNewKeyName(''); setSelectedPerms([]); }}>
            + Create API Key
          </button>
        </div>
      </header>

      <div className="page-body">
        {/* Info banner */}
        <div style={{
          padding: '14px 18px', borderRadius: 'var(--radius-md)',
          background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)',
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: 'var(--space-xl)', fontSize: '0.85rem', color: 'var(--text-secondary)',
        }}>
          <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
          API keys provide programmatic access to the NinjaBackup REST API. Keep your keys secure and never share them publicly.
        </div>

        {/* Create Key Modal */}
        {showCreate && (
          <div className="card" style={{
            marginBottom: 'var(--space-xl)', border: '1px solid var(--border-active)',
            boxShadow: 'var(--shadow-glow-accent)',
          }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔑</span> Create New API Key
            </h3>

            {!generatedKey ? (
              <>
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Key Name</label>
                  <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="e.g., CI/CD Pipeline" style={inputStyle} />
                </div>

                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>Permissions</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {AVAILABLE_PERMISSIONS.map(group => (
                      <div key={group.group} style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: '8px' }}>{group.group}</div>
                        {group.perms.map(perm => (
                          <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '3px 0' }}>
                            <input type="checkbox" checked={selectedPerms.includes(perm)} onChange={() => togglePerm(perm)}
                              style={{ accentColor: 'var(--accent-primary)' }} />
                            {perm.split(':')[1]}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" onClick={generateKey} disabled={!newKeyName || selectedPerms.length === 0}>
                    🔑 Generate Key
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <div>
                <div style={{
                  padding: '14px', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)',
                  fontSize: '0.82rem', color: 'var(--accent-success)',
                }}>⚠️ Copy this key now — you won&apos;t be able to see it again!</div>

                <div style={{
                  padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-active)', fontFamily: 'monospace', fontSize: '0.85rem',
                  color: 'var(--accent-primary)', wordBreak: 'break-all', fontWeight: 600,
                  marginBottom: 'var(--space-md)',
                }}>{generatedKey}</div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(generatedKey)}>📋 Copy Key</button>
                  <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Done</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Keys List */}
        <div className="card">
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr><th>Name</th><th>Key</th><th>Permissions</th><th>Created</th><th>Last Used</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {MOCK_KEYS.map(key => (
                  <tr key={key.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{key.name}</td>
                    <td>
                      <code style={{ padding: '3px 8px', background: 'var(--bg-input)', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {key.keyPrefix}••••••••
                      </code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {key.permissions.map(p => (
                          <span key={p} style={{
                            padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600,
                            background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)',
                          }}>{p}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(key.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {timeAgo(key.lastUsedAt)}
                    </td>
                    <td>
                      <span className={`status-badge ${key.active ? 'online' : 'offline'}`}>
                        {key.active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }}>
                        {key.active ? 'Revoke' : '🗑'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
