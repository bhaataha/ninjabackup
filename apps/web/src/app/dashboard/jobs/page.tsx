'use client';

import { useState, useMemo } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { useSocket } from '@/hooks/useSocket';
import { jobs as jobsApi, agents as agentsApi, policies as policiesApi } from '@/lib/api';
import { TypeBadge, StatusBadge, Badge } from '@/components/Badge';
import { TableSkeleton } from '@/components/Skeleton';
import { EmptyState, ErrorBanner } from '@/components/EmptyState';
import { useT } from '@/components/LocaleProvider';

type Job = {
  id: string;
  agentId: string;
  agentHostname?: string;
  policyId?: string;
  policyName?: string;
  type: 'FILE' | 'IMAGE';
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  progress?: number;
  startedAt?: string;
  finishedAt?: string;
  durationSec?: number;
  bytesProcessed?: number;
  bytesUploaded?: number;
  filesNew?: number;
  filesChanged?: number;
  filesUnchanged?: number;
  errors?: number;
  triggeredBy?: 'schedule' | 'manual';
  errorMessage?: string;
};

const STATUS_CLASS: Record<string, string> = {
  SUCCESS: 'success',
  FAILED: 'failed',
  RUNNING: 'backing-up',
  PENDING: 'pending',
  CANCELLED: 'offline',
};

function formatBytes(b?: number): string {
  if (!b || b === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(sec?: number, startedAt?: string): string {
  if (sec) {
    const m = Math.floor(sec / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  if (startedAt) {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    return formatDuration(elapsed);
  }
  return '—';
}

export default function JobsPage() {
  const t = useT();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const { data: rawJobs, loading, error, refetch } = useFetch<Job[]>(
    () => jobsApi.list() as Promise<Job[]>,
    [],
    { interval: 10_000 },
  );
  const { jobProgress } = useSocket({ tenantId: 'current' });

  const jobs = useMemo(() => {
    if (!rawJobs) return [];
    return rawJobs.map((j) => {
      const live = jobProgress.get(j.id);
      return live
        ? {
            ...j,
            progress: live.progress,
            bytesProcessed: live.bytesProcessed,
            bytesUploaded: live.bytesUploaded,
            status: (live.status as Job['status']) ?? j.status,
          }
        : j;
    });
  }, [rawJobs, jobProgress]);

  const filtered = statusFilter === 'ALL' ? jobs : jobs.filter((j) => j.status === statusFilter);
  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: jobs.length };
    for (const s of ['RUNNING', 'SUCCESS', 'FAILED', 'PENDING', 'CANCELLED']) {
      map[s] = jobs.filter((j) => j.status === s).length;
    }
    return map;
  }, [jobs]);

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">{t('Backup Jobs', 'משימות גיבוי')}</h1>
            <p className="page-subtitle">
              {loading ? t('Loading…', 'טוען…') : t(`${jobs.length} jobs`, `${jobs.length} משימות`)}
              {error ? ` · ${error}` : ''}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowTriggerModal(true)}>
            + {t('Trigger Manual Backup', 'הפעל גיבוי ידני')}
          </button>
        </div>
      </header>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
          {['ALL', 'RUNNING', 'SUCCESS', 'FAILED', 'PENDING', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="btn btn-sm"
              style={{
                background: statusFilter === s ? 'var(--accent-glow)' : 'var(--bg-card)',
                color: statusFilter === s ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: `1px solid ${statusFilter === s ? 'var(--border-active)' : 'var(--border-default)'}`,
                fontWeight: statusFilter === s ? 700 : 500,
              }}
            >
              {s === 'ALL' ? `All (${counts.ALL})` : `${s} (${counts[s] ?? 0})`}
            </button>
          ))}
        </div>

        {error && <ErrorBanner message={`Failed to load jobs: ${error}`} onRetry={refetch} />}

        {loading && !rawJobs && <TableSkeleton rows={6} cols={9} />}

        {!loading && jobs.length === 0 && !error && (
          <EmptyState
            icon="📦"
            title="No backup jobs yet"
            description="Trigger a manual backup or wait for the next scheduled run."
            cta={{ label: '+ Trigger Manual Backup', onClick: () => setShowTriggerModal(true) }}
          />
        )}

        {jobs.length > 0 && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Policy</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Processed</th>
                  <th>Uploaded</th>
                  <th>Duration</th>
                  <th>Trigger</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => (
                  <tr key={job.id} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {job.agentHostname ?? job.agentId.slice(0, 8)}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{job.policyName ?? '—'}</td>
                    <td>
                      <TypeBadge type={job.type} />
                    </td>
                    <td>
                      <StatusBadge status={job.status} />
                    </td>
                    <td>
                      {job.status === 'RUNNING' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px' }}>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{ width: `${job.progress ?? 0}%` }}></div>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                            {Math.round(job.progress ?? 0)}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem' }}>{job.progress ?? 0}%</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{formatBytes(job.bytesProcessed)}</td>
                    <td style={{ fontSize: '0.8rem' }}>{formatBytes(job.bytesUploaded)}</td>
                    <td style={{ fontSize: '0.8rem' }}>{formatDuration(job.durationSec, job.startedAt)}</td>
                    <td>
                      <Badge tone={job.triggeredBy === 'manual' ? 'warning' : 'muted'} size="xs">
                        {job.triggeredBy ?? 'schedule'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.filter((j) => j.status === 'FAILED').length > 0 && (
          <div className="card" style={{ marginTop: 'var(--space-lg)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-danger)', marginBottom: 'var(--space-md)' }}>
              ⚠️ Failed Job Details
            </h3>
            {filtered
              .filter((j) => j.status === 'FAILED')
              .map((job) => (
                <div
                  key={job.id}
                  style={{
                    padding: 'var(--space-md)',
                    background: 'var(--accent-danger-glow)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-sm)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>
                    {job.agentHostname ?? job.agentId} — {job.policyName ?? 'unknown policy'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-danger)' }}>{job.errorMessage ?? 'Unknown error'}</div>
                </div>
              ))}
          </div>
        )}
      </div>

      {showTriggerModal && (
        <TriggerModal
          onClose={() => setShowTriggerModal(false)}
          onTriggered={() => {
            setShowTriggerModal(false);
            refetch();
          }}
        />
      )}
    </>
  );
}

function TriggerModal({ onClose, onTriggered }: { onClose: () => void; onTriggered: () => void }) {
  const { data: agents } = useFetch<any[]>(() => agentsApi.list());
  const { data: policies } = useFetch<any[]>(() => policiesApi.list());
  const [agentId, setAgentId] = useState('');
  const [policyId, setPolicyId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!agentId || !policyId) {
      setErr('Select an agent and a policy.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await jobsApi.trigger({ agentId, policyId });
      onTriggered();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to trigger backup');
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
      <div className="card" style={{ maxWidth: 480, width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>Trigger Manual Backup</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Agent</label>
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="input">
            <option value="">— Select agent —</option>
            {(agents ?? []).map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.displayName ?? a.hostname}
              </option>
            ))}
          </select>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Policy</label>
          <select value={policyId} onChange={(e) => setPolicyId(e.target.value)} className="input">
            <option value="">— Select policy —</option>
            {(policies ?? []).map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {err && <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: 'var(--space-sm)' }}>{err}</div>}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-sm btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Triggering…' : 'Trigger Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}
