'use client';

import { useState, useMemo } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { useSocket } from '@/hooks/useSocket';
import { agents as agentsApi } from '@/lib/api';
import { StatusBadge, Badge } from '@/components/Badge';
import { TableSkeleton } from '@/components/Skeleton';
import { EmptyState, ErrorBanner } from '@/components/EmptyState';
import { useT } from '@/components/LocaleProvider';

type DiskInfo = { drive: string; totalGb: number; freeGb: number };
type Agent = {
  id: string;
  hostname: string;
  displayName?: string;
  status: 'ONLINE' | 'OFFLINE' | 'BACKING_UP' | 'ERROR' | 'RESTORING';
  osType: 'WINDOWS' | 'LINUX' | 'MACOS';
  osVersion?: string;
  agentVersion?: string;
  lastBackup?: string;
  lastSeen?: string;
  totalDataBytes?: number;
  totalBackups?: number;
  cpuInfo?: string;
  ramGb?: number;
  diskInfo?: DiskInfo[];
};

function formatBytes(b?: number) {
  if (!b || b === 0) return '0 B';
  const k = 1024,
    sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(date?: string) {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_CLASS: Record<string, string> = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BACKING_UP: 'backing-up',
  ERROR: 'error',
  RESTORING: 'backing-up',
};

const OS_ICON: Record<string, string> = { WINDOWS: '🪟', LINUX: '🐧', MACOS: '🍎' };

export default function AgentsPage() {
  const t = useT();
  const [filter, setFilter] = useState('ALL');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const { data, loading, error, refetch } = useFetch<Agent[]>(
    () => agentsApi.list() as Promise<Agent[]>,
    [],
    { interval: 15_000 },
  );
  const { agentStatuses } = useSocket({ tenantId: 'current' });

  const agents = useMemo(() => {
    if (!data) return [];
    return data.map((a) => {
      const live = agentStatuses.get(a.id);
      return live ? { ...a, status: live.status as Agent['status'] } : a;
    });
  }, [data, agentStatuses]);

  const filtered = filter === 'ALL' ? agents : agents.filter((a) => a.status === filter);
  const selected = selectedAgent ? agents.find((a) => a.id === selectedAgent) : null;

  const statCounts = useMemo(
    () => ({
      ALL: agents.length,
      ONLINE: agents.filter((a) => a.status === 'ONLINE').length,
      BACKING_UP: agents.filter((a) => a.status === 'BACKING_UP').length,
      ERROR: agents.filter((a) => a.status === 'ERROR').length,
      OFFLINE: agents.filter((a) => a.status === 'OFFLINE').length,
    }),
    [agents],
  );

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">{t('Agents', 'סוכנים')}</h1>
            <p className="page-subtitle">
              {loading
                ? t('Loading…', 'טוען…')
                : t(
                    `${agents.length} agents · ${statCounts.ONLINE + statCounts.BACKING_UP} active`,
                    `${agents.length} סוכנים · ${statCounts.ONLINE + statCounts.BACKING_UP} פעילים`,
                  )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button className="btn btn-secondary" onClick={() => setShowTokenModal(true)}>
              🔑 {t('Registration Token', 'קוד רישום')}
            </button>
            <a href="/dashboard/download" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              + {t('Add Agent', 'הוסף סוכן')}
            </a>
          </div>
        </div>
      </header>

      <div className="page-body">
        {error && <ErrorBanner message={error} onRetry={refetch} />}

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
          {Object.entries(statCounts).map(([key, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="btn btn-sm"
              style={{
                background: filter === key ? 'var(--accent-glow)' : 'var(--bg-card)',
                color: filter === key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: `1px solid ${filter === key ? 'var(--border-active)' : 'var(--border-default)'}`,
                fontWeight: filter === key ? 700 : 500,
              }}
            >
              {key === 'ALL' ? 'All' : key.replace('_', ' ')} ({count})
            </button>
          ))}
        </div>

        {loading && agents.length === 0 ? (
          <TableSkeleton rows={5} cols={7} />
        ) : !loading && agents.length === 0 ? (
          <EmptyState
            icon="🖥️"
            title="No agents registered"
            description="Generate a registration token, then run the install one-liner on the target machine."
            cta={{ label: '+ Add Agent', onClick: () => {}, href: '/dashboard/download' }}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selectedAgent ? '1fr 380px' : '1fr', gap: 'var(--space-lg)' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>OS</th>
                    <th>Status</th>
                    <th>Total Data</th>
                    <th>Backups</th>
                    <th>Last Backup</th>
                    <th>Version</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((agent) => (
                    <tr
                      key={agent.id}
                      onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                      style={{
                        cursor: 'pointer',
                        background: selectedAgent === agent.id ? 'var(--accent-glow)' : undefined,
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{OS_ICON[agent.osType] ?? '💻'}</span>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {agent.displayName ?? agent.hostname}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{agent.hostname}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{agent.osVersion ?? agent.osType}</td>
                      <td>
                        <StatusBadge status={agent.status} />
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatBytes(agent.totalDataBytes)}</td>
                      <td>{agent.totalBackups ?? 0}</td>
                      <td style={{ fontSize: '0.8rem' }}>{timeAgo(agent.lastBackup)}</td>
                      <td>
                        <Badge tone="success" size="xs">
                          v{agent.agentVersion ?? '?'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selected && (
              <div className="card" style={{ position: 'sticky', top: '100px', alignSelf: 'start' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--space-lg)',
                  }}
                >
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{selected.displayName ?? selected.hostname}</h3>
                  <button className="btn btn-sm btn-secondary" onClick={() => setSelectedAgent(null)}>
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  <Row label="Status">
                    <span className={`status-badge ${STATUS_CLASS[selected.status] ?? 'offline'}`}>{selected.status}</span>
                  </Row>
                  <Row label="Hostname">
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selected.hostname}</span>
                  </Row>
                  <Row label="OS">{selected.osVersion ?? selected.osType}</Row>
                  <Row label="CPU">{selected.cpuInfo ?? '—'}</Row>
                  <Row label="RAM">{selected.ramGb ? `${selected.ramGb} GB` : '—'}</Row>
                  <Row label="Last seen">{timeAgo(selected.lastSeen)}</Row>

                  {selected.diskInfo && selected.diskInfo.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 'var(--space-md)' }}>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Disk Usage
                      </div>
                      {selected.diskInfo.map((disk, i) => (
                        <div key={i} style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600 }}>{disk.drive}</span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {disk.totalGb - disk.freeGb} / {disk.totalGb} GB
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${((disk.totalGb - disk.freeGb) / disk.totalGb) * 100}%`,
                                background:
                                  (disk.totalGb - disk.freeGb) / disk.totalGb > 0.85
                                    ? 'linear-gradient(90deg, var(--accent-warning), var(--accent-danger))'
                                    : undefined,
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                    <a
                      href={`/dashboard/agents/${selected.id}`}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
                    >
                      🔍 Details
                    </a>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ flex: 1 }}
                      onClick={async () => {
                        if (!confirm(`Remove agent "${selected.hostname}"?`)) return;
                        await agentsApi.delete(selected.id);
                        setSelectedAgent(null);
                        refetch();
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showTokenModal && <TokenModal onClose={() => setShowTokenModal(false)} />}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{label}</span>
      <span style={{ fontSize: '0.85rem' }}>{children}</span>
    </div>
  );
}

function TokenModal({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const result = await agentsApi.createToken();
      setToken(result.token);
      setExpiresAt(result.expiresAt);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to generate token');
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!token) return;
    navigator.clipboard.writeText(token);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: '500px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>🔑 Agent Registration Token</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
          Generate a one-time token to register a new agent. Tokens expire after first use or 24 hours.
        </p>
        {!token ? (
          <button className="btn btn-primary" onClick={generate} disabled={busy}>
            {busy ? 'Generating…' : 'Generate Token'}
          </button>
        ) : (
          <>
            <div
              style={{
                background: 'var(--bg-input)',
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                wordBreak: 'break-all',
                marginBottom: 'var(--space-sm)',
                border: '1px solid var(--border-default)',
                color: 'var(--accent-primary)',
              }}
            >
              {token}
            </div>
            {expiresAt && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                Expires: {new Date(expiresAt).toLocaleString()}
              </div>
            )}
          </>
        )}
        {err && <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: 'var(--space-sm)' }}>{err}</div>}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
          {token && (
            <button className="btn btn-primary btn-sm" onClick={copy}>
              📋 Copy Token
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
