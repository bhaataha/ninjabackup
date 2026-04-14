'use client';

import { useState } from 'react';

const JOBS = [
  { id: '1', agent: 'SRV-DC01', policy: 'Daily File Backup', type: 'FILE', status: 'RUNNING', progress: 72, startedAt: '2026-04-14T08:15:00', duration: '45m', bytesProcessed: '86.3 GB', bytesUploaded: '12.1 GB', filesNew: 234, filesChanged: 1893, filesUnchanged: 128934, errors: 0, triggeredBy: 'schedule' },
  { id: '2', agent: 'DESKTOP-HR01', policy: 'Daily File Backup', type: 'FILE', status: 'SUCCESS', progress: 100, startedAt: '2026-04-14T08:00:00', duration: '8m', bytesProcessed: '14.6 GB', bytesUploaded: '1.2 GB', filesNew: 12, filesChanged: 89, filesUnchanged: 34521, errors: 0, triggeredBy: 'schedule' },
  { id: '3', agent: 'SRV-FILE01', policy: 'Hourly Critical Files', type: 'FILE', status: 'FAILED', progress: 43, startedAt: '2026-04-14T07:00:00', duration: '23m', bytesProcessed: '230.6 GB', bytesUploaded: '0 B', filesNew: 0, filesChanged: 0, filesUnchanged: 0, errors: 3, triggeredBy: 'schedule', errorMessage: 'S3 connection timeout after 3 retries' },
  { id: '4', agent: 'DESKTOP-DEV03', policy: 'Daily File Backup', type: 'FILE', status: 'SUCCESS', progress: 100, startedAt: '2026-04-14T06:30:00', duration: '15m', bytesProcessed: '50.0 GB', bytesUploaded: '4.8 GB', filesNew: 456, filesChanged: 2341, filesUnchanged: 67890, errors: 0, triggeredBy: 'schedule' },
  { id: '5', agent: 'DEV-LINUX01', policy: 'Weekly Image Backup', type: 'IMAGE', status: 'SUCCESS', progress: 100, startedAt: '2026-04-14T06:00:00', duration: '52m', bytesProcessed: '80.0 GB', bytesUploaded: '23.4 GB', filesNew: 0, filesChanged: 0, filesUnchanged: 0, errors: 0, triggeredBy: 'schedule' },
  { id: '6', agent: 'SRV-DC01', policy: 'Daily File Backup', type: 'FILE', status: 'SUCCESS', progress: 100, startedAt: '2026-04-13T08:15:00', duration: '42m', bytesProcessed: '85.0 GB', bytesUploaded: '9.8 GB', filesNew: 122, filesChanged: 1567, filesUnchanged: 129100, errors: 0, triggeredBy: 'schedule' },
  { id: '7', agent: 'DESKTOP-HR01', policy: 'Daily File Backup', type: 'FILE', status: 'SUCCESS', progress: 100, startedAt: '2026-04-13T08:00:00', duration: '7m', bytesProcessed: '14.5 GB', bytesUploaded: '0.8 GB', filesNew: 5, filesChanged: 45, filesUnchanged: 34560, errors: 0, triggeredBy: 'schedule' },
  { id: '8', agent: 'LAPTOP-CEO', policy: 'Daily File Backup', type: 'FILE', status: 'CANCELLED', progress: 12, startedAt: '2026-04-12T14:00:00', duration: '3m', bytesProcessed: '5.0 GB', bytesUploaded: '0.2 GB', filesNew: 0, filesChanged: 0, filesUnchanged: 0, errors: 0, triggeredBy: 'manual' },
];

function getStatusClass(s: string) {
  const map: Record<string, string> = { SUCCESS: 'success', FAILED: 'failed', RUNNING: 'backing-up', PENDING: 'pending', CANCELLED: 'offline' };
  return map[s] || 'offline';
}

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = statusFilter === 'ALL' ? JOBS : JOBS.filter((j) => j.status === statusFilter);

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Backup Jobs</h1>
            <p className="page-subtitle">{JOBS.length} jobs executed today</p>
          </div>
          <button className="btn btn-primary">+ Trigger Manual Backup</button>
        </div>
      </header>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
          {['ALL', 'RUNNING', 'SUCCESS', 'FAILED', 'PENDING', 'CANCELLED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className="btn btn-sm" style={{
              background: statusFilter === s ? 'var(--accent-glow)' : 'var(--bg-card)',
              color: statusFilter === s ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: `1px solid ${statusFilter === s ? 'var(--border-active)' : 'var(--border-default)'}`,
              fontWeight: statusFilter === s ? 700 : 500,
            }}>
              {s === 'ALL' ? `All (${JOBS.length})` : `${s} (${JOBS.filter((j) => j.status === s).length})`}
            </button>
          ))}
        </div>

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
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.agent}</td>
                  <td style={{ fontSize: '0.8rem' }}>{job.policy}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                      background: job.type === 'IMAGE' ? 'var(--accent-glow)' : 'rgba(139, 92, 246, 0.1)',
                      color: job.type === 'IMAGE' ? 'var(--accent-primary)' : 'var(--accent-purple)',
                    }}>{job.type}</span>
                  </td>
                  <td><span className={`status-badge ${getStatusClass(job.status)}`}>{job.status}</span></td>
                  <td>
                    {job.status === 'RUNNING' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px' }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${job.progress}%` }}></div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{job.progress}%</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem' }}>{job.progress}%</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{job.bytesProcessed}</td>
                  <td style={{ fontSize: '0.8rem' }}>{job.bytesUploaded}</td>
                  <td style={{ fontSize: '0.8rem' }}>{job.duration}</td>
                  <td>
                    <span style={{
                      fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px',
                      background: job.triggeredBy === 'manual' ? 'var(--accent-warning-glow)' : 'rgba(100, 116, 139, 0.1)',
                      color: job.triggeredBy === 'manual' ? 'var(--accent-warning)' : 'var(--text-muted)',
                      fontWeight: 600,
                    }}>{job.triggeredBy}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Error Details for Failed Jobs */}
        {filtered.filter((j) => j.status === 'FAILED').length > 0 && (
          <div className="card" style={{ marginTop: 'var(--space-lg)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-danger)', marginBottom: 'var(--space-md)' }}>⚠️ Failed Job Details</h3>
            {filtered.filter((j) => j.status === 'FAILED').map((job) => (
              <div key={job.id} style={{ padding: 'var(--space-md)', background: 'var(--accent-danger-glow)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>{job.agent} — {job.policy}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-danger)' }}>{job.errorMessage}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
