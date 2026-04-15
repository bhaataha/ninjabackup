'use client';

import { use, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { useSocket } from '@/hooks/useSocket';
import { agents as agentsApi, jobs as jobsApi, policies as policiesApi } from '@/lib/api';

type DiskInfo = { drive: string; totalGb: number; freeGb: number; fsType?: string };
type Agent = {
  id: string;
  hostname: string;
  displayName?: string;
  status: string;
  osType: 'WINDOWS' | 'LINUX' | 'MACOS';
  osVersion?: string;
  agentVersion?: string;
  cpuInfo?: string;
  ramGb?: number;
  totalDataBytes?: number;
  totalBackups?: number;
  lastSeen?: string;
  lastBackup?: string;
  createdAt?: string;
  diskInfo?: DiskInfo[];
};

type Policy = { id: string; name: string; type: string; schedule: string; enabled: boolean };
type Job = {
  id: string;
  type: 'FILE' | 'IMAGE';
  status: string;
  progress?: number;
  startedAt?: string;
  bytesProcessed?: number;
  durationSec?: number;
  errorMessage?: string;
};

function formatBytes(b?: number) {
  if (!b || b === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(date?: string) {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDuration(sec?: number) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'disks' | 'policies'>('overview');

  const { data: agent, loading: agentLoading, error: agentError } = useFetch<Agent>(
    () => agentsApi.getById(id) as Promise<Agent>,
    [id],
    { interval: 15_000 },
  );
  const { data: jobsData } = useFetch<Job[]>(() => jobsApi.list({ agentId: id }) as Promise<Job[]>, [id], { interval: 10_000 });
  const { data: policiesData } = useFetch<Policy[]>(() => policiesApi.list() as Promise<Policy[]>);
  const { jobProgress } = useSocket({ tenantId: 'current' });

  const jobs = (jobsData ?? []).map((j) => {
    const live = jobProgress.get(j.id);
    return live ? { ...j, progress: live.progress, bytesProcessed: live.bytesProcessed } : j;
  });

  if (agentLoading && !agent) {
    return <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>Loading agent…</div>;
  }
  if (agentError || !agent) {
    return <div style={{ padding: 'var(--space-xl)', color: 'var(--accent-danger)' }}>Failed to load agent: {agentError ?? 'Not found'}</div>;
  }

  const osIcon = agent.osType === 'WINDOWS' ? '🪟' : agent.osType === 'LINUX' ? '🐧' : '🍎';

  async function runBackup() {
    const policy = policiesData?.[0];
    if (!policy) {
      alert('No backup policies available. Create one first.');
      return;
    }
    try {
      await jobsApi.trigger({ agentId: id, policyId: policy.id });
      alert(`Backup triggered with policy: ${policy.name}`);
    } catch (e: any) {
      alert(`Failed: ${e?.message ?? 'unknown error'}`);
    }
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
            <a href="/dashboard/agents" style={{ fontSize: '1.2rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
              ←
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-glow)',
                  border: '1px solid var(--border-active)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                }}
              >
                {osIcon}
              </div>
              <div>
                <h1 className="page-title">{agent.displayName ?? agent.hostname}</h1>
                <p className="page-subtitle">
                  {agent.hostname} · {agent.osVersion ?? agent.osType} · v{agent.agentVersion ?? '?'}
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span
              className={`status-badge ${
                agent.status === 'BACKING_UP' ? 'backing-up' : agent.status === 'ONLINE' ? 'online' : agent.status === 'ERROR' ? 'error' : 'offline'
              }`}
            >
              {agent.status.replace('_', ' ')}
            </span>
            <button className="btn btn-primary" onClick={runBackup}>
              ▶ Run Backup
            </button>
          </div>
        </div>
      </header>

      <div className="page-body">
        <div
          style={{
            display: 'flex',
            gap: '2px',
            marginBottom: 'var(--space-xl)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            border: '1px solid var(--border-glass)',
            width: 'fit-content',
          }}
        >
          {(['overview', 'jobs', 'disks', 'policies'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div>
            <div className="kpi-grid">
              <KpiCard color="blue" icon="📦" value={String(agent.totalBackups ?? 0)} label="Total Backups" />
              <KpiCard color="green" icon="💾" value={formatBytes(agent.totalDataBytes)} label="Total Data Protected" />
              <KpiCard color="yellow" icon="🕐" value={timeAgo(agent.lastBackup)} label="Last Backup" />
              <KpiCard color="blue" icon="📡" value={timeAgo(agent.lastSeen)} label="Last Seen" />
            </div>

            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-lg)' }}>🖥️ System Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-lg)' }}>
                <InfoCell icon="⚡" label="CPU" value={agent.cpuInfo ?? '—'} />
                <InfoCell icon="🧠" label="RAM" value={agent.ramGb ? `${agent.ramGb} GB` : '—'} />
                <InfoCell icon="📦" label="Agent Version" value={`v${agent.agentVersion ?? '?'}`} />
                <InfoCell icon={osIcon} label="OS" value={agent.osVersion ?? agent.osType} />
                <InfoCell icon="🏷️" label="Hostname" value={agent.hostname} />
                <InfoCell icon="📅" label="Registered" value={agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : '—'} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Backup Jobs</h3>
            </div>
            {jobs.length === 0 ? (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>No backup jobs for this agent yet.</div>
            ) : (
              <div className="table-container" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Data</th>
                      <th>Duration</th>
                      <th>Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: job.type === 'IMAGE' ? 'var(--accent-glow)' : 'rgba(139, 92, 246, 0.1)',
                              color: job.type === 'IMAGE' ? 'var(--accent-primary)' : 'var(--accent-purple)',
                            }}
                          >
                            {job.type}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              job.status === 'SUCCESS' ? 'success' : job.status === 'RUNNING' ? 'backing-up' : job.status === 'FAILED' ? 'failed' : 'offline'
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td>
                          {job.status === 'RUNNING' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div className="progress-bar" style={{ flex: 1, maxWidth: '100px' }}>
                                <div className="progress-fill" style={{ width: `${job.progress ?? 0}%` }} />
                              </div>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                {Math.round(job.progress ?? 0)}%
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.82rem' }}>{job.progress ?? 0}%</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{formatBytes(job.bytesProcessed)}</td>
                        <td style={{ fontSize: '0.82rem' }}>{formatDuration(job.durationSec)}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{timeAgo(job.startedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'disks' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
            {(agent.diskInfo ?? []).length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No disk info reported by agent.</div>
            ) : (
              agent.diskInfo!.map((disk) => {
                const usedGb = disk.totalGb - disk.freeGb;
                const usedPct = (usedGb / disk.totalGb) * 100;
                return (
                  <div key={disk.drive} className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.8rem' }}>💿</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{disk.drive}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{disk.fsType ?? ''}</div>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '99px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background:
                            usedPct > 90 ? 'var(--accent-danger-glow)' : usedPct > 70 ? 'var(--accent-warning-glow)' : 'var(--accent-success-glow)',
                          color: usedPct > 90 ? 'var(--accent-danger)' : usedPct > 70 ? 'var(--accent-warning)' : 'var(--accent-success)',
                        }}
                      >
                        {usedPct.toFixed(0)}% used
                      </span>
                    </div>

                    <div className="progress-bar" style={{ height: '10px', marginBottom: '12px' }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${usedPct}%`,
                          background:
                            usedPct > 90
                              ? 'linear-gradient(90deg, var(--accent-danger), #dc2626)'
                              : usedPct > 70
                              ? 'linear-gradient(90deg, var(--accent-warning), #d97706)'
                              : 'linear-gradient(90deg, var(--accent-primary), var(--accent-purple))',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span>
                        <strong>{usedGb} GB</strong> used
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {disk.freeGb} GB free of {disk.totalGb} GB
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'policies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {(policiesData ?? []).length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No policies defined yet.</div>
            ) : (
              (policiesData ?? []).map((policy) => (
                <div key={policy.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        background: policy.type === 'FILE' ? 'rgba(139, 92, 246, 0.1)' : 'var(--accent-glow)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                      }}
                    >
                      {policy.type === 'FILE' ? '📄' : '💿'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{policy.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <code style={{ padding: '1px 6px', background: 'var(--bg-input)', borderRadius: '4px', fontSize: '0.7rem' }}>
                          {policy.schedule}
                        </code>
                        <span style={{ marginLeft: '8px' }}>{policy.type}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`status-badge ${policy.enabled ? 'online' : 'offline'}`}>{policy.enabled ? 'Active' : 'Disabled'}</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={async () => {
                        await policiesApi.assignAgent(policy.id, id);
                        alert('Policy assigned');
                      }}
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

function KpiCard({ color, icon, value, label }: { color: 'blue' | 'green' | 'yellow' | 'red'; icon: string; value: string; label: string }) {
  return (
    <div className={`kpi-card ${color}`}>
      <div className={`kpi-icon ${color}`}>{icon}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}

function InfoCell({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div
      style={{
        padding: '14px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-glass)',
      }}
    >
      <div
        style={{
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          marginBottom: '4px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {icon} {label}
      </div>
      <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>{value}</div>
    </div>
  );
}
