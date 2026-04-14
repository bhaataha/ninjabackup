'use client';

import { useState, useEffect } from 'react';
import ActivityFeed from '@/components/ActivityFeed';
import AreaChart from '@/components/AreaChart';

// Mock data — will be replaced with API calls
const MOCK_AGENTS = [
  { id: '1', hostname: 'DESKTOP-HR01', displayName: 'HR Workstation', status: 'ONLINE', osType: 'WINDOWS', lastBackup: '2026-04-14T08:00:00Z', totalDataBytes: '15728640000', agentVersion: '1.0.0' },
  { id: '2', hostname: 'SRV-DC01', displayName: 'Domain Controller', status: 'BACKING_UP', osType: 'WINDOWS', lastBackup: '2026-04-14T07:30:00Z', totalDataBytes: '128849018880', agentVersion: '1.0.0' },
  { id: '3', hostname: 'DESKTOP-DEV03', displayName: 'Dev Machine 3', status: 'ONLINE', osType: 'WINDOWS', lastBackup: '2026-04-14T08:00:00Z', totalDataBytes: '53687091200', agentVersion: '1.0.0' },
  { id: '4', hostname: 'SRV-FILE01', displayName: 'File Server', status: 'ERROR', osType: 'WINDOWS', lastBackup: '2026-04-13T08:00:00Z', totalDataBytes: '536870912000', agentVersion: '0.9.8' },
  { id: '5', hostname: 'DEV-LINUX01', displayName: 'Build Server', status: 'ONLINE', osType: 'LINUX', lastBackup: '2026-04-14T06:00:00Z', totalDataBytes: '85899345920', agentVersion: '1.0.0' },
  { id: '6', hostname: 'LAPTOP-CEO', displayName: 'CEO Laptop', status: 'OFFLINE', osType: 'MACOS', lastBackup: '2026-04-12T14:00:00Z', totalDataBytes: '42949672960', agentVersion: '1.0.0' },
];

const MOCK_JOBS = [
  { id: '1', agent: 'SRV-DC01', type: 'FILE', status: 'RUNNING', progress: 67, startedAt: '2026-04-14T08:15:00Z', bytesProcessed: '86345678900' },
  { id: '2', agent: 'DESKTOP-HR01', type: 'FILE', status: 'SUCCESS', progress: 100, startedAt: '2026-04-14T08:00:00Z', bytesProcessed: '15728640000' },
  { id: '3', agent: 'SRV-FILE01', type: 'FILE', status: 'FAILED', progress: 43, startedAt: '2026-04-14T07:00:00Z', bytesProcessed: '230686310400', errorMessage: 'Connection timeout to S3' },
  { id: '4', agent: 'DESKTOP-DEV03', type: 'FILE', status: 'SUCCESS', progress: 100, startedAt: '2026-04-14T06:30:00Z', bytesProcessed: '53687091200' },
  { id: '5', agent: 'DEV-LINUX01', type: 'IMAGE', status: 'SUCCESS', progress: 100, startedAt: '2026-04-14T06:00:00Z', bytesProcessed: '85899345920' },
];

function formatBytes(bytes: string | number): string {
  const b = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  if (b === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'ONLINE': return 'online';
    case 'OFFLINE': return 'offline';
    case 'BACKING_UP': return 'backing-up';
    case 'ERROR': return 'error';
    case 'SUCCESS': return 'success';
    case 'FAILED': return 'failed';
    case 'RUNNING': return 'backing-up';
    case 'PENDING': return 'pending';
    default: return 'offline';
  }
}

function getOsIcon(os: string): string {
  switch (os) {
    case 'WINDOWS': return '🪟';
    case 'LINUX': return '🐧';
    case 'MACOS': return '🍎';
    default: return '💻';
  }
}

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [runningJobProgress, setRunningJobProgress] = useState(67);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setRunningJobProgress((prev) => Math.min(prev + 0.3, 99));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const onlineCount = MOCK_AGENTS.filter((a) => a.status === 'ONLINE').length;
  const backingUpCount = MOCK_AGENTS.filter((a) => a.status === 'BACKING_UP').length;
  const protectedToday = MOCK_JOBS.filter((j) => j.status === 'SUCCESS').length;
  const failedToday = MOCK_JOBS.filter((j) => j.status === 'FAILED').length;
  const totalStorage = MOCK_AGENTS.reduce((sum, a) => sum + parseInt(a.totalDataBytes), 0);

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Overview of your backup infrastructure · {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button className="btn btn-primary">
            + New Agent
          </button>
        </div>
      </header>

      <div className="page-body">
        {/* KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi-card blue">
            <div className="kpi-icon blue">🖥️</div>
            <div className="kpi-value">{onlineCount + backingUpCount}</div>
            <div className="kpi-label">Agents Online</div>
            <div className="kpi-trend up">↑ {backingUpCount} backing up</div>
          </div>

          <div className="kpi-card green">
            <div className="kpi-icon green">✅</div>
            <div className="kpi-value">{protectedToday}</div>
            <div className="kpi-label">Protected Today</div>
            <div className="kpi-trend up">↑ 100% success rate</div>
          </div>

          <div className="kpi-card red">
            <div className="kpi-icon red">❌</div>
            <div className="kpi-value">{failedToday}</div>
            <div className="kpi-label">Failed Today</div>
            <div className="kpi-trend down">SRV-FILE01 needs attention</div>
          </div>

          <div className="kpi-card yellow">
            <div className="kpi-icon yellow">💾</div>
            <div className="kpi-value">{formatBytes(totalStorage)}</div>
            <div className="kpi-label">Total Storage Used</div>
            <div className="kpi-trend up">↑ 12.4 GB this week</div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
          {/* Recent Jobs */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Recent Backup Jobs</h2>
              <button className="btn btn-secondary btn-sm">View All</button>
            </div>

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
                  {MOCK_JOBS.map((job) => (
                    <tr key={job.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.agent}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: job.type === 'IMAGE' ? 'var(--accent-glow)' : 'rgba(139, 92, 246, 0.1)',
                          color: job.type === 'IMAGE' ? 'var(--accent-primary)' : 'var(--accent-purple)',
                        }}>
                          {job.type}
                        </span>
                      </td>
                      <td><span className={`status-badge ${getStatusClass(job.status)}`}>{job.status}</span></td>
                      <td>
                        {job.status === 'RUNNING' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="progress-bar" style={{ flex: 1 }}>
                              <div className="progress-fill" style={{ width: `${runningJobProgress}%` }}></div>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                              {Math.round(runningJobProgress)}%
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem' }}>{job.progress}%</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{formatBytes(job.bytesProcessed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Agent Status */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Agent Status</h2>
              <button className="btn btn-secondary btn-sm">Manage</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {MOCK_AGENTS.map((agent) => (
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
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border-hover)';
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)';
                    (e.currentTarget as HTMLAnchorElement).style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border-glass)';
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.02)';
                    (e.currentTarget as HTMLAnchorElement).style.transform = 'translateX(0)';
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>{getOsIcon(agent.osType)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{agent.displayName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{agent.hostname}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`status-badge ${getStatusClass(agent.status)}`}>{agent.status.replace('_', ' ')}</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Last backup: {timeAgo(agent.lastBackup)}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Storage Overview */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Storage Usage</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-lg)' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Total Usage</div>
              <div className="progress-bar" style={{ height: '10px', marginBottom: '8px' }}>
                <div className="progress-fill" style={{ width: '48%' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600 }}>{formatBytes(totalStorage)}</span>
                <span style={{ color: 'var(--text-muted)' }}>of 5.0 TB quota</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Hot Tier (0-30d)</div>
              <div className="progress-bar" style={{ height: '10px', marginBottom: '8px' }}>
                <div className="progress-fill" style={{ width: '72%', background: 'linear-gradient(90deg, var(--accent-warning), var(--accent-danger))' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600 }}>623.4 GB</span>
                <span style={{ color: 'var(--text-muted)' }}>Fast access</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Cold Tier (90d+)</div>
              <div className="progress-bar" style={{ height: '10px', marginBottom: '8px' }}>
                <div className="progress-fill" style={{ width: '25%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600 }}>241.8 GB</span>
                <span style={{ color: 'var(--text-muted)' }}>Archive</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Backup Success Rate (14 days)</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-success)', fontWeight: 700 }}>96.4%</span>
            </div>
            <AreaChart
              data={[12, 14, 13, 15, 14, 12, 13, 15, 14, 16, 15, 14, 15, 14]}
              color="#10b981"
              height={140}
              labels={['Apr 1', 'Apr 2', 'Apr 3', 'Apr 4', 'Apr 5', 'Apr 6', 'Apr 7', 'Apr 8', 'Apr 9', 'Apr 10', 'Apr 11', 'Apr 12', 'Apr 13', 'Apr 14']}
            />
          </div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Data Protected (GB/day)</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 700 }}>+18.2 GB today</span>
            </div>
            <AreaChart
              data={[85, 92, 88, 95, 102, 89, 94, 110, 105, 98, 115, 108, 120, 118]}
              color="#3b82f6"
              height={140}
              labels={['Apr 1', 'Apr 2', 'Apr 3', 'Apr 4', 'Apr 5', 'Apr 6', 'Apr 7', 'Apr 8', 'Apr 9', 'Apr 10', 'Apr 11', 'Apr 12', 'Apr 13', 'Apr 14']}
            />
          </div>
        </div>

        {/* Activity Feed */}
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <ActivityFeed />
        </div>
      </div>
    </>
  );
}
