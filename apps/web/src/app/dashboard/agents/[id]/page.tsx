'use client';

import { useState } from 'react';

// Mock data for agent detail
const AGENT = {
  id: '2', hostname: 'SRV-DC01', displayName: 'Domain Controller',
  status: 'BACKING_UP', osType: 'WINDOWS', osVersion: 'Windows Server 2022',
  agentVersion: '1.0.0', cpuInfo: 'Intel Xeon E-2288G @ 3.70GHz', ramGb: 64,
  totalDataBytes: '128849018880', totalBackups: 142,
  lastSeen: '2026-04-14T08:15:00Z', lastBackup: '2026-04-14T07:30:00Z',
  createdAt: '2026-01-15T09:00:00Z',
  diskInfo: [
    { drive: 'C:', totalGb: 500, freeGb: 210, fsType: 'NTFS' },
    { drive: 'D:', totalGb: 2000, freeGb: 840, fsType: 'NTFS' },
    { drive: 'E:', totalGb: 1000, freeGb: 650, fsType: 'ReFS' },
  ],
  policies: [
    { id: '1', name: 'Daily File Backup', type: 'FILE', schedule: '0 2 * * *', enabled: true },
    { id: '2', name: 'Weekly Image Backup', type: 'IMAGE', schedule: '0 3 * * 0', enabled: true },
  ],
};

const RECENT_JOBS = [
  { id: '1', type: 'FILE', status: 'RUNNING', progress: 67, startedAt: '2026-04-14T08:15:00Z', bytesProcessed: '86345678900', duration: '15m' },
  { id: '2', type: 'FILE', status: 'SUCCESS', progress: 100, startedAt: '2026-04-14T02:00:00Z', bytesProcessed: '128849018880', duration: '43m' },
  { id: '3', type: 'IMAGE', status: 'SUCCESS', progress: 100, startedAt: '2026-04-07T03:00:00Z', bytesProcessed: '512000000000', duration: '2h 15m' },
  { id: '4', type: 'FILE', status: 'SUCCESS', progress: 100, startedAt: '2026-04-13T02:00:00Z', bytesProcessed: '127849018880', duration: '41m' },
  { id: '5', type: 'FILE', status: 'FAILED', progress: 23, startedAt: '2026-04-12T02:00:00Z', bytesProcessed: '29636000000', duration: '8m', error: 'VSS shadow copy failed' },
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
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AgentDetailPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'disks' | 'policies'>('overview');
  const [runningProgress, setRunningProgress] = useState(67);

  // Simulate progress
  useState(() => {
    const t = setInterval(() => setRunningProgress(p => Math.min(p + 0.2, 99)), 3000);
    return () => clearInterval(t);
  });

  const osIcon = AGENT.osType === 'WINDOWS' ? '🪟' : AGENT.osType === 'LINUX' ? '🐧' : '🍎';

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
            <a href="/dashboard/agents" style={{ fontSize: '1.2rem', color: 'var(--text-muted)', textDecoration: 'none' }}>←</a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
                background: 'var(--accent-glow)', border: '1px solid var(--border-active)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
              }}>{osIcon}</div>
              <div>
                <h1 className="page-title">{AGENT.displayName}</h1>
                <p className="page-subtitle">{AGENT.hostname} · {AGENT.osVersion} · v{AGENT.agentVersion}</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span className={`status-badge ${AGENT.status === 'BACKING_UP' ? 'backing-up' : AGENT.status === 'ONLINE' ? 'online' : 'offline'}`}>
              {AGENT.status.replace('_', ' ')}
            </span>
            <button className="btn btn-primary">▶ Run Backup</button>
            <button className="btn btn-secondary">⚙️</button>
          </div>
        </div>
      </header>

      <div className="page-body">
        {/* Tab Nav */}
        <div style={{
          display: 'flex', gap: '2px', marginBottom: 'var(--space-xl)',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
          padding: '4px', border: '1px solid var(--border-glass)', width: 'fit-content',
        }}>
          {(['overview', 'jobs', 'disks', 'policies'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 20px', borderRadius: 'var(--radius-sm)',
              background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === tab ? 'white' : 'var(--text-secondary)',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
              fontFamily: 'inherit', transition: 'all var(--transition-fast)',
              textTransform: 'capitalize',
            }}>{tab}</button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ animation: 'fadeInUp 0.3s ease' }}>
            <div className="kpi-grid">
              <div className="kpi-card blue">
                <div className="kpi-icon blue">📦</div>
                <div className="kpi-value">{AGENT.totalBackups}</div>
                <div className="kpi-label">Total Backups</div>
              </div>
              <div className="kpi-card green">
                <div className="kpi-icon green">💾</div>
                <div className="kpi-value">{formatBytes(AGENT.totalDataBytes)}</div>
                <div className="kpi-label">Total Data Protected</div>
              </div>
              <div className="kpi-card yellow">
                <div className="kpi-icon yellow">🕐</div>
                <div className="kpi-value">{timeAgo(AGENT.lastBackup)}</div>
                <div className="kpi-label">Last Backup</div>
              </div>
              <div className="kpi-card blue">
                <div className="kpi-icon blue">📡</div>
                <div className="kpi-value">{timeAgo(AGENT.lastSeen)}</div>
                <div className="kpi-label">Last Seen</div>
              </div>
            </div>

            {/* System Info */}
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🖥️</span> System Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-lg)' }}>
                {[
                  { label: 'CPU', value: AGENT.cpuInfo, icon: '⚡' },
                  { label: 'RAM', value: `${AGENT.ramGb} GB`, icon: '🧠' },
                  { label: 'Agent Version', value: `v${AGENT.agentVersion}`, icon: '📦' },
                  { label: 'OS', value: AGENT.osVersion, icon: osIcon },
                  { label: 'Hostname', value: AGENT.hostname, icon: '🏷️' },
                  { label: 'Registered', value: new Date(AGENT.createdAt).toLocaleDateString(), icon: '📅' },
                ].map(item => (
                  <div key={item.label} style={{
                    padding: '14px', borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)',
                  }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {item.icon} {item.label}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="card" style={{ animation: 'fadeInUp 0.3s ease' }}>
            <div className="card-header">
              <h3 className="card-title">Recent Backup Jobs</h3>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr><th>Type</th><th>Status</th><th>Progress</th><th>Data</th><th>Duration</th><th>Started</th></tr>
                </thead>
                <tbody>
                  {RECENT_JOBS.map(job => (
                    <tr key={job.id}>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                          background: job.type === 'IMAGE' ? 'var(--accent-glow)' : 'rgba(139, 92, 246, 0.1)',
                          color: job.type === 'IMAGE' ? 'var(--accent-primary)' : 'var(--accent-purple)',
                        }}>{job.type}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${job.status === 'SUCCESS' ? 'success' : job.status === 'RUNNING' ? 'backing-up' : 'failed'}`}>
                          {job.status}
                        </span>
                      </td>
                      <td>
                        {job.status === 'RUNNING' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="progress-bar" style={{ flex: 1, maxWidth: '100px' }}>
                              <div className="progress-fill" style={{ width: `${runningProgress}%` }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{Math.round(runningProgress)}%</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.82rem' }}>{job.progress}%</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatBytes(job.bytesProcessed)}</td>
                      <td style={{ fontSize: '0.82rem' }}>{job.duration}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{timeAgo(job.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Disks Tab */}
        {activeTab === 'disks' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)', animation: 'fadeInUp 0.3s ease' }}>
            {AGENT.diskInfo.map(disk => {
              const usedGb = disk.totalGb - disk.freeGb;
              const usedPct = (usedGb / disk.totalGb) * 100;
              return (
                <div key={disk.drive} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.8rem' }}>💿</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{disk.drive}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{disk.fsType}</div>
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 12px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700,
                      background: usedPct > 90 ? 'var(--accent-danger-glow)' : usedPct > 70 ? 'var(--accent-warning-glow)' : 'var(--accent-success-glow)',
                      color: usedPct > 90 ? 'var(--accent-danger)' : usedPct > 70 ? 'var(--accent-warning)' : 'var(--accent-success)',
                    }}>{usedPct.toFixed(0)}% used</span>
                  </div>

                  <div className="progress-bar" style={{ height: '10px', marginBottom: '12px' }}>
                    <div className="progress-fill" style={{
                      width: `${usedPct}%`,
                      background: usedPct > 90
                        ? 'linear-gradient(90deg, var(--accent-danger), #dc2626)'
                        : usedPct > 70
                          ? 'linear-gradient(90deg, var(--accent-warning), #d97706)'
                          : 'linear-gradient(90deg, var(--accent-primary), var(--accent-purple))',
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span><strong>{usedGb} GB</strong> used</span>
                    <span style={{ color: 'var(--text-muted)' }}>{disk.freeGb} GB free of {disk.totalGb} GB</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', animation: 'fadeInUp 0.3s ease' }}>
            {AGENT.policies.map(policy => (
              <div key={policy.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: 'var(--radius-md)',
                    background: policy.type === 'FILE' ? 'rgba(139, 92, 246, 0.1)' : 'var(--accent-glow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                  }}>{policy.type === 'FILE' ? '📄' : '💿'}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{policy.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <code style={{ padding: '1px 6px', background: 'var(--bg-input)', borderRadius: '4px', fontSize: '0.7rem' }}>{policy.schedule}</code>
                      <span style={{ marginLeft: '8px' }}>{policy.type}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`status-badge ${policy.enabled ? 'online' : 'offline'}`}>
                    {policy.enabled ? 'Active' : 'Disabled'}
                  </span>
                  <button className="btn btn-secondary btn-sm">Edit</button>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary" style={{ width: 'fit-content' }}>+ Assign Policy</button>
          </div>
        )}
      </div>
    </>
  );
}
