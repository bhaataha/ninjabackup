'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { apiKeys as apiKeysApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Badge, StatusBadge } from '@/components/Badge';
import { TableSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt?: string;
  active: boolean;
};

const AVAILABLE_PERMISSIONS = [
  { group: 'Agents', perms: ['agents:read', 'agents:write', 'agents:delete'] },
  { group: 'Jobs', perms: ['jobs:read', 'jobs:trigger', 'jobs:cancel'] },
  { group: 'Policies', perms: ['policies:read', 'policies:write'] },
  { group: 'Storage', perms: ['storage:read', 'storage:write'] },
  { group: 'Alerts', perms: ['alerts:read', 'alerts:write'] },
  { group: 'Restore', perms: ['restore:read', 'restore:trigger'] },
];

function timeAgo(date?: string) {
  if (!date) return 'never';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ApiKeysPage() {
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch<ApiKey[]>(() => apiKeysApi.list() as Promise<ApiKey[]>);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [generatedKey, setGeneratedKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const keys = data ?? [];

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  };

  async function generateKey() {
    setBusy(true);
    setCreateErr(null);
    try {
      const r = await apiKeysApi.create({ name: newKeyName, permissions: selectedPerms });
      setGeneratedKey(r.key);
      refetch();
      toast.success('API key created', 'Copy it now — it will not be shown again.');
    } catch (e: any) {
      setCreateErr(e?.message ?? 'Failed to create key');
      toast.error('Failed to create API key', e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this API key? Any clients using it will lose access immediately.')) return;
    try {
      await apiKeysApi.revoke(id);
      refetch();
      toast.success('API key revoked');
    } catch (e: any) {
      toast.error('Failed to revoke API key', e?.message);
    }
  }

  async function commitRename(id: string) {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await apiKeysApi.rename(id, renameValue.trim());
      setRenamingId(null);
      setRenameValue('');
      refetch();
      toast.success('API key renamed');
    } catch (e: any) {
      toast.error('Failed to rename', e?.message);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.88rem',
    outline: 'none',
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
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowCreate(true);
              setGeneratedKey('');
              setNewKeyName('');
              setSelectedPerms([]);
              setCreateErr(null);
            }}
          >
            + Create API Key
          </button>
        </div>
      </header>

      <div className="page-body">
        {error && (
          <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ color: 'var(--accent-danger)', fontSize: '0.85rem' }}>{error}</div>
          </div>
        )}

        <div
          style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: 'var(--space-xl)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
          API keys provide programmatic access to the NinjaBackup REST API. Keep your keys secure.
        </div>

        {showCreate && (
          <div
            className="card"
            style={{ marginBottom: 'var(--space-xl)', border: '1px solid var(--border-active)', boxShadow: 'var(--shadow-glow-accent)' }}
          >
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>🔑 Create New API Key</h3>

            {!generatedKey ? (
              <>
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Key Name</label>
                  <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g., CI/CD Pipeline" style={inputStyle} />
                </div>

                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '10px' }}>Permissions</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {AVAILABLE_PERMISSIONS.map((group) => (
                      <div
                        key={group.group}
                        style={{
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-glass)',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', marginBottom: '8px' }}>{group.group}</div>
                        {group.perms.map((perm) => (
                          <label
                            key={perm}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              color: 'var(--text-secondary)',
                              padding: '3px 0',
                            }}
                          >
                            <input type="checkbox" checked={selectedPerms.includes(perm)} onChange={() => togglePerm(perm)} />
                            {perm.split(':')[1]}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {createErr && <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: 'var(--space-sm)' }}>{createErr}</div>}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" onClick={generateKey} disabled={busy || !newKeyName || selectedPerms.length === 0}>
                    🔑 {busy ? 'Generating…' : 'Generate Key'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div
                  style={{
                    padding: '14px',
                    background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-md)',
                    fontSize: '0.82rem',
                    color: 'var(--accent-success)',
                  }}
                >
                  ⚠️ Copy this key now — you won&apos;t be able to see it again!
                </div>

                <div
                  style={{
                    padding: '14px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-active)',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: 'var(--accent-primary)',
                    wordBreak: 'break-all',
                    fontWeight: 600,
                    marginBottom: 'var(--space-md)',
                  }}
                >
                  {generatedKey}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(generatedKey)}>
                    📋 Copy Key
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {loading && keys.length === 0 ? (
          <TableSkeleton rows={4} cols={7} />
        ) : keys.length === 0 ? (
          <EmptyState
            icon="🔑"
            title="No API keys yet"
            description="Create one to give CI pipelines or external integrations programmatic access."
            cta={{
              label: '+ Create API Key',
              onClick: () => {
                setShowCreate(true);
                setGeneratedKey('');
                setNewKeyName('');
                setSelectedPerms([]);
                setCreateErr(null);
              },
            }}
          />
        ) : (
          <div className="card">
            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Key</th>
                    <th>Permissions</th>
                    <th>Created</th>
                    <th>Last Used</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id}>
                      <td style={{ fontWeight: 600 }}>
                        {renamingId === key.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => commitRename(key.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename(key.id);
                              if (e.key === 'Escape') {
                                setRenamingId(null);
                                setRenameValue('');
                              }
                            }}
                            className="input"
                            style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                          />
                        ) : (
                          <span
                            onClick={() => {
                              if (!key.active) return;
                              setRenamingId(key.id);
                              setRenameValue(key.name);
                            }}
                            style={{ cursor: key.active ? 'text' : 'default' }}
                            title={key.active ? 'Click to rename' : ''}
                          >
                            {key.name}
                          </span>
                        )}
                      </td>
                      <td>
                        <code
                          style={{
                            padding: '3px 8px',
                            background: 'var(--bg-input)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                          }}
                        >
                          {key.keyPrefix}••••••••
                        </code>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {key.permissions.map((p) => (
                            <Badge key={p} tone="purple" size="xs">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(key.createdAt).toLocaleDateString()}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {key.lastUsedAt ? (
                          <>
                            {timeAgo(key.lastUsedAt)}
                            <div style={{ fontSize: '0.7rem' }}>{new Date(key.lastUsedAt).toLocaleString()}</div>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>never</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={key.active ? 'ACTIVE' : 'REVOKED'} />
                      </td>
                      <td>
                        {key.active && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setRenamingId(key.id);
                                setRenameValue(key.name);
                              }}
                            >
                              Rename
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => revoke(key.id)}>
                              Revoke
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
