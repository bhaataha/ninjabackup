'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { policies as policiesApi, agents as agentsApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Badge, TypeBadge } from '@/components/Badge';
import { CardGridSkeleton } from '@/components/Skeleton';
import { EmptyState, ErrorBanner } from '@/components/EmptyState';
import { useT } from '@/components/LocaleProvider';

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
  const toast = useToast();
  const t = useT();
  const { data, loading, error, refetch } = useFetch<Policy[]>(() => policiesApi.list() as Promise<Policy[]>);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Policy | null>(null);
  const [managing, setManaging] = useState<Policy | null>(null);

  const policies = data ?? [];

  async function toggle(p: Policy) {
    try {
      await policiesApi.update(p.id, { enabled: !p.enabled });
      refetch();
      toast.success(p.enabled ? 'Policy disabled' : 'Policy enabled');
    } catch (e: any) {
      toast.error('Failed to toggle policy', e?.message);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this policy? This cannot be undone.')) return;
    try {
      await policiesApi.delete(id);
      refetch();
      toast.success('Policy deleted');
    } catch (e: any) {
      toast.error('Failed to delete policy', e?.message);
    }
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">{t('Backup Policies', 'מדיניות גיבוי')}</h1>
            <p className="page-subtitle">
              {loading
                ? t('Loading…', 'טוען…')
                : t(
                    `${policies.length} policies · ${policies.filter((p) => p.enabled).length} active`,
                    `${policies.length} מדיניות · ${policies.filter((p) => p.enabled).length} פעילות`,
                  )}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + {t('Create Policy', 'צור מדיניות')}
          </button>
        </div>
      </header>

      <div className="page-body">
        {error && <ErrorBanner message={error} onRetry={refetch} />}

        {loading && policies.length === 0 ? (
          <CardGridSkeleton cards={4} minWidth={420} />
        ) : !loading && policies.length === 0 ? (
          <EmptyState
            icon="📋"
            title={t('No backup policies yet', 'אין מדיניות גיבוי עדיין')}
            description={t(
              'A policy defines what to back up, how often, and how long to keep snapshots. Create your first one to start protecting machines.',
              'מדיניות מגדירה מה לגבות, באיזו תדירות, וכמה זמן לשמור. צור את הראשונה כדי להתחיל להגן על מחשבים.',
            )}
            cta={{ label: '+ ' + t('Create Policy', 'צור מדיניות'), onClick: () => setShowCreate(true) }}
          />
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
                      <TypeBadge type={policy.type} />
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
                        <Badge key={i} tone="success" size="sm" style={{ fontFamily: 'monospace' }}>
                          {p}
                        </Badge>
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
                  <button
                    onClick={() => setManaging(policy)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: 'inherit',
                    }}
                    title="Manage agent assignments"
                  >
                    🖥️ {policy.agentCount ?? 0} agents assigned →
                  </button>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => setEditing(policy)}>
                      Edit
                    </button>
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
      {editing && (
        <EditPolicyModal
          policy={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}
      {managing && (
        <ManageAgentsModal
          policy={managing}
          onClose={() => setManaging(null)}
          onChanged={() => {
            refetch();
          }}
        />
      )}
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

function EditPolicyModal({
  policy,
  onClose,
  onSaved,
}: {
  policy: Policy;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(policy.name);
  const [schedule, setSchedule] = useState(policy.schedule);
  const [includePaths, setIncludePaths] = useState((policy.includePaths ?? []).join(', '));
  const [excludePaths, setExcludePaths] = useState((policy.excludePaths ?? []).join(', '));
  const [daily, setDaily] = useState(policy.retention?.daily ?? 7);
  const [weekly, setWeekly] = useState(policy.retention?.weekly ?? 4);
  const [monthly, setMonthly] = useState(policy.retention?.monthly ?? 12);
  const [yearly, setYearly] = useState(policy.retention?.yearly ?? 1);
  const [compression, setCompression] = useState(policy.compression ?? true);
  const [vss, setVss] = useState(policy.vss ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await policiesApi.update(policy.id, {
        name,
        schedule,
        includePaths: includePaths.split(',').map((s) => s.trim()).filter(Boolean),
        excludePaths: excludePaths.split(',').map((s) => s.trim()).filter(Boolean),
        retention: { daily, weekly, monthly, yearly },
        compression,
        vss,
      });
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save policy');
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
      <div className="card" style={{ maxWidth: 560, width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>Edit Policy · {policy.type}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />

          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Schedule (cron)</label>
          <input value={schedule} onChange={(e) => setSchedule(e.target.value)} className="input" placeholder="0 2 * * *" />

          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Include paths (comma-separated)</label>
          <input value={includePaths} onChange={(e) => setIncludePaths(e.target.value)} className="input" />

          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Exclude patterns (comma-separated)</label>
          <input value={excludePaths} onChange={(e) => setExcludePaths(e.target.value)} className="input" placeholder="*.tmp, node_modules, .git" />

          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>Retention</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-sm)' }}>
            <RetentionField label="Daily" value={daily} onChange={setDaily} />
            <RetentionField label="Weekly" value={weekly} onChange={setWeekly} />
            <RetentionField label="Monthly" value={monthly} onChange={setMonthly} />
            <RetentionField label="Yearly" value={yearly} onChange={setYearly} />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={compression} onChange={(e) => setCompression(e.target.checked)} />
              Compression
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={vss} onChange={(e) => setVss(e.target.checked)} />
              VSS (Windows Shadow Copy)
            </label>
          </div>
        </div>
        {err && <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginTop: 'var(--space-sm)' }}>{err}</div>}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
          <button className="btn btn-sm btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-sm btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : '💾 Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RetentionField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="input"
        style={{ textAlign: 'center', fontWeight: 600 }}
      />
    </div>
  );
}

function ManageAgentsModal({
  policy,
  onClose,
  onChanged,
}: {
  policy: Policy;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: agentsData, loading } = useFetch<any[]>(() => agentsApi.list());
  const { data: assignmentData, refetch } = useFetch<{ agentIds: string[] } | string[] | any>(() =>
    policiesApi.getAgents(policy.id).catch(() => ({ agentIds: [] })),
  );
  const [busy, setBusy] = useState<string | null>(null);

  const agents = agentsData ?? [];
  const assignedIds: string[] = Array.isArray(assignmentData)
    ? (assignmentData as any[]).map((a) => a.id ?? a)
    : (assignmentData?.agentIds ?? []);

  async function toggle(agentId: string, currentlyAssigned: boolean) {
    setBusy(agentId);
    try {
      if (currentlyAssigned) {
        await policiesApi.unassignAgent(policy.id, agentId);
      } else {
        await policiesApi.assignAgent(policy.id, agentId);
      }
      refetch();
      onChanged();
    } finally {
      setBusy(null);
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
      <div className="card" style={{ maxWidth: 540, width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
          Assign Agents · {policy.name}
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
          Toggle which agents run this policy on their schedule.
        </p>

        {loading ? (
          <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>Loading agents…</div>
        ) : agents.length === 0 ? (
          <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>
            No agents registered yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {agents.map((a: any) => {
              const isAssigned = assignedIds.includes(a.id);
              return (
                <label
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    background: isAssigned ? 'var(--accent-glow)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isAssigned ? 'var(--border-active)' : 'var(--border-glass)'}`,
                    cursor: busy === a.id ? 'wait' : 'pointer',
                    opacity: busy === a.id ? 0.6 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAssigned}
                    disabled={busy === a.id}
                    onChange={() => toggle(a.id, isAssigned)}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{a.displayName ?? a.hostname}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {a.hostname} · {a.osType}
                    </div>
                  </div>
                  <span className={`status-badge ${a.status === 'ONLINE' ? 'online' : 'offline'}`}>{a.status}</span>
                </label>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
