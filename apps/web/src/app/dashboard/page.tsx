'use client';

import { useState, useEffect, useMemo } from 'react';
import ActivityFeed from '@/components/ActivityFeed';
import AreaChart from '@/components/AreaChart';
import { useFetch } from '@/hooks/useFetch';
import { useSocket } from '@/hooks/useSocket';
import { agents as agentsApi, jobs as jobsApi, storage as storageApi, reports as reportsApi } from '@/lib/api';
import { TypeBadge, StatusBadge } from '@/components/Badge';

type Agent = {
  id: string;
  hostname: string;
  displayName?: string;
  status: 'ONLINE' | 'OFFLINE' | 'BACKING_UP' | 'ERROR';
  osType: 'WINDOWS' | 'LINUX' | 'MACOS';
  lastBackup?: string;
  totalDataBytes?: number;
};

type Job = {
  id: string;
  agentId: string;
  agentHostname?: string;
  type: 'FILE' | 'IMAGE';
  status: string;
  progress?: number;
  startedAt?: string;
  bytesProcessed?: number;
};

type Vault = { id: string; usedBytes?: number; quotaGb?: number };

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(date?: string): string {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const STATUS_CLASS: Record<string, string> = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BACKING_UP: 'backing-up',
  ERROR: 'error',
  SUCCESS: 'success',
  FAILED: 'failed',
  RUNNING: 'backing-up',
  PENDING: 'pending',
};

const OS_ICON: Record<string, string> = { WINDOWS: '🪟', LINUX: '🐧', MACOS: '🍎' };

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { data: agentsData } = useFetch<Agent[]>(() => agentsApi.list() as Promise<Agent[]>, [], { interval: 15_000 });
  const { data: jobsData } = useFetch<Job[]>(() => jobsApi.list() as Promise<Job[]>, [], { interval: 10_000 });
  const { data: vaultsData } = useFetch<Vault[]>(() => storageApi.list() as Promise<Vault[]>);
  const { data: successRateData } = useFetch<{ labels: string[]; values: number[]; rate: number }>(
    () => reportsApi.successRate(14),
    [],
    { interval: 5 * 60_000 },
  );
  const { data: summaryData } = useFetch<{ dailyStats: { date: string; dataGb: number }[] }>(
    () => reportsApi.summary({ from: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) }) as any,
    [],
    { interval: 5 * 60_000 },
  );
  const { jobProgress, agentStatuses } = useSocket({ tenantId: 'current' });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const agents = useMemo(() => {
    return (agentsData ?? []).map((a) => {
      const live = agentStatuses.get(a.id);
      return live ? { ...a, status: live.status as Agent['status'] } : a;
    });
  }, [agentsData, agentStatuses]);

  const jobs = useMemo(() => {
    return (jobsData ?? []).slice(0, 8).map((j) => {
      const live = jobProgress.get(j.id);
      return live ? { ...j, progress: live.progress, bytesProcessed: live.bytesProcessed, status: live.status ?? j.status } : j;
    });
  }, [jobsData, jobProgress]);

  const onlineCount = agents.filter((a) => a.status === 'ONLINE').length;
  const backingUpCount = agents.filter((a) => a.status === 'BACKING_UP').length;
  const today = new Date().toISOString().slice(0, 10);
  const todaysJobs = (jobsData ?? []).filter((j) => j.startedAt?.startsWith(today));
  const protectedToday = todaysJobs.filter((j) => j.status === 'SUCCESS').length;
  const failedToday = todaysJobs.filter((j) => j.status === 'FAILED').length;
  const failedAgent = (jobsData ?? []).find((j) => j.status === 'FAILED')?.agentHostname;
  const totalStorage = (vaultsData ?? []).reduce((sum, v) => sum + (v.usedBytes ?? 0), 0);
  const totalQuota = (vaultsData ?? []).reduce((sum, v) => sum + (v.quotaGb ?? 0), 0) * 1024 * 1024 * 1024;
  const quotaPercent = totalQuota > 0 ? Math.round((totalStorage / totalQuota) * 100) : 0;

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Overview of your backup infrastructure ·{' '}
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <a href="/dashboard/agents" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            + New Agent
          </a>
        </div>
      </header>

      <div className="page-body">
        <div className="kpi-grid">
          <div className="kpi-card blue">
            <div className="kpi-icon blue">🖥️</div>
            <div className="kpi-value">{onlineCount + backingUpCount}</div>
            <div className="kpi-label">Agents Online</div>
            <div className="kpi-trend up">{backingUpCount > 0 ? `↑ ${backingUpCount} backing up` : 'idle'}</div>
          </div>

          <div className="kpi-card green">
            <div className="kpi-icon green">✅</div>
            <div className="kpi-value">{protectedToday}</div>
            <div className="kpi-label">Protected Today</div>
            <div className="kpi-trend up">
              {todaysJobs.length > 0 ? `${Math.round((protectedToday / todaysJobs.length) * 100)}% success rate` : 'No runs yet'}
            </div>
          </div>

          <div className="kpi-card red">
            <div className="kpi-icon red">❌</div>
            <div className="kpi-value">{failedToday}</div>
            <div className="kpi-label">Failed Today</div>
            <div className="kpi-trend down">{failedAgent ? `${failedAgent} needs attention` : '—'}</div>
          </div>

          <div className="kpi-card yellow">
            <div className="kpi-icon yellow">💾</div>
            <div className="kpi-value">{formatBytes(totalStorage)}</div>
            <div className="kpi-label">Total Storage Used</div>
            <div className="kpi-trend up">{quotaPercent}% of quota</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Recent Backup Jobs</h2>
              <a href="/dashboard/jobs" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                View All
              </a>
            </div>

            {jobs.length === 0 ? (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>No backup jobs yet.</div>
            ) : (
              <div className="table-container" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.agentHostname ?? job.agentId.slice(0, 8)}</td>
                        <td>
                          <TypeBadge type={job.type} />
                        </td>
                        <td>
                          <StatusBadge status={job.status} />
                        </td>
                        <td>
                          {job.status === 'RUNNING' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Agent Status</h2>
              <a href="/dashboard/agents" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                Manage
              </a>
            </div>

            {agents.length === 0 ? (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>No agents registered yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {agents.map((agent) => (
                  <a
                    key={agent.id}
                    href={`/dashboard/agents/${agent.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-md)',
                      padding: '12px var(--space-md)',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-glass)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: '1.4rem' }}>{OS_ICON[agent.osType] ?? '💻'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {agent.displayName ?? agent.hostname}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{agent.hostname}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <StatusBadge status={agent.status} />
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Last backup: {timeAgo(agent.lastBackup)}
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Storage Usage</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-lg)' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Total Usage</div>
              <div className="progress-bar" style={{ height: '10px', marginBottom: '8px' }}>
                <div className="progress-fill" style={{ width: `${quotaPercent}%` }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600 }}>{formatBytes(totalStorage)}</span>
                <span style={{ color: 'var(--text-muted)' }}>of {totalQuota > 0 ? formatBytes(totalQuota) : 'unlimited'}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Active Vaults</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{(vaultsData ?? []).length}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Protected Agents</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{agents.length}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Backup Success Rate (14 days)</h2>
              {successRateData && (
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-success)', fontWeight: 700 }}>
                  {successRateData.rate}%
                </span>
              )}
            </div>
            {successRateData && successRateData.values.length > 0 ? (
              <AreaChart
                data={successRateData.values}
                color="#10b981"
                height={140}
                labels={successRateData.labels.map((l) => l.slice(5))}
              />
            ) : (
              <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No backup data yet
              </div>
            )}
          </div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Data Protected (GB/day)</h2>
              {summaryData?.dailyStats?.length && (
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  +{summaryData.dailyStats[summaryData.dailyStats.length - 1]?.dataGb ?? 0} GB today
                </span>
              )}
            </div>
            {summaryData?.dailyStats && summaryData.dailyStats.length > 0 ? (
              <AreaChart
                data={summaryData.dailyStats.map((d) => d.dataGb)}
                color="#3b82f6"
                height={140}
                labels={summaryData.dailyStats.map((d) => d.date)}
              />
            ) : (
              <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No backup data yet
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-lg)' }}>
          <ActivityFeed />
        </div>
      </div>
    </>
  );
}
