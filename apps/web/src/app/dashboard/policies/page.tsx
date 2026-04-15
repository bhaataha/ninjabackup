'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { policies as policiesApi } from '@/lib/api';

type Retention = { daily?: number; weekly?: number; monthly?: number; yearly?: number };
type Policy = {
  id: string;
  name: string;
  type: 'FILE' | 'IMAGE';
  schedule: string;
  scheduleHuman?: string;
  enabled: boolean;
  includePaths?: string[];
  excludePaths?: string[];
  retention?: Retention;
  compression?: boolean;
  vss?: boolean;
  agentCount?: number;
  storageVaultName?: string;
};

function humanizeCron(cron: string): string {
  const map: Record<string, string> = {
    '0 2 * * *': 'Daily at 02:00',
    '0 * * * *': 'Every hour',
    '0 3 * * 0': 'Sundays at 03:00',
    '0 12 * * 1-5': 'Weekdays at 12:00',
  };
  return map[cron] ?? cron;
}

export default function PoliciesPage() {
  const { data, loading, error, refetch } = useFetch<Policy[]>(() => policiesApi.list() as Promise<Policy[]>);
  const [showCreate, setShowCreate] = useState(false);

  const policies = data ?? [];

  async function toggle(p: Policy) {
    try {
      await policiesApi.update(p.id, { enabled: !p.enabled });
      refetch();
    } catch (e) {
      console.error('Failed to toggle policy', e);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this policy? This cannot be undone.')) return;
    try {
      await policiesApi.delete(id);
      refetch();
    } catch (e) {
      console.error('Failed to delete policy', e);
    }
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Backup Policies</h1>
            <p className="page-subtitle">
              {loading ? 'Loading…' : `${policies.length} policies · ${policies.filter((p) => p.enabled).length} active`}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Create Policy
          </button>
        </div>
      </header>

      <div className="page-body">
        {error && (
          <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ color: 'var(--accent-danger)', fontSize: '0.85rem' }}>{error}</div>
          </div>
        )}

        {!loading && policies.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>No backup policies yet</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Create your first policy to start backing up.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 'var(--space-lg)' }}>
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="card"
                style={{
                  opacity: policy.enabled ? 1 : 0.6,
                  borderColor: !policy.enabled ? 'rgba(100, 116, 139, 0.1)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{policy.name}</h3>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: policy.type === 'IMAGE' ? 'var(--accent-glow)' : 'rgba(139, 92, 246, 0.1)',
                          color: policy.type === 'IMAGE' ? 'var(--accent-primary)' : 'var(--accent-purple)',
                        }}
                      >
                        {policy.type}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      🕐 {policy.scheduleHuman ?? humanizeCron(policy.schedule)} · ☁️ {policy.storageVaultName ?? '—'}
                    </div>
                  </div>
                  <div
                    onClick={() => toggle(policy)}
                    style={{
                      width: '40px',
                      height: '22px',
                      borderRadius: '11px',
                      cursor: 'pointer',
                      background: policy.enabled ? 'var(--accent-primary)' : 'var(--bg-input)',
                      border: `1px solid ${policy.enabled ? 'transparent' : 'var(--border-default)'}`,
                      position: 'relative',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: '1px',
                        left: policy.enabled ? '20px' : '1px',
                        transition: 'all var(--transition-fast)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    ></div>
                  </div>
                </div>

                {policy.includePaths && policy.includePaths.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}
                    >
                      Include
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {policy.includePaths.map((p, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            background: 'var(--accent-success-glow)',
                            color: 'var(--accent-success)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {policy.retention && (
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}
                    >
                      Retention
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '0.8rem' }}>
                      {Object.entries(policy.retention)
                        .filter(([, v]) => (v ?? 0) > 0)
                        .map(([k, v]) => (
                          <div key={k}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{v}</span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: '2px' }}>{k}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 'var(--space-md)',
                    borderTop: '1px solid var(--border-default)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    🖥️ {policy.agentCount ?? 0} agents assigned
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn btn-sm btn-secondary">Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(policy.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreatePolicyModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); refetch(); }} />}
    </>
  );
}

function CreatePolicyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'FILE' | 'IMAGE'>('FILE');
  const [schedule, setSchedule] = useState('0 2 * * *');
  const [includePaths, setIncludePaths] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!name) {
      setErr('Name is required.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await policiesApi.create({
        name,
        type,
        schedule,
        enabled: true,
        includePaths: includePaths.split(',').map((s) => s.trim()).filter(Boolean),
        excludePaths: [],
        retention: { daily: 7, weekly: 4, monthly: 12, yearly: 1 },
        compression: true,
        vss: true,
      });
      onCreated();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to create policy');
    } finally {
      setBusy(false);
    }
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
      <div className="card" style={{ maxWidth: 520, width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>Create Backup Policy</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Daily File Backup" />

          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as 'FILE' | 'IMAGE')} className="input">
            <option value="FILE">FILE — restic file-level</option>
            <option value="IMAGE">IMAGE — full disk image</option>
          </select>

          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Schedule (cron)</label>
          <input value={schedule} onChange={(e) => setSchedule(e.target.value)} className="input" placeholder="0 2 * * *" />

          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Include paths (comma-separated)</label>
          <input
            value={includePaths}
            onChange={(e) => setIncludePaths(e.target.value)}
            className="input"
            placeholder="C:\\Users, D:\\Projects"
          />
        </div>
        {err && <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginTop: 'var(--space-sm)' }}>{err}</div>}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
          <button className="btn btn-sm btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-sm btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
