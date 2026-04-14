'use client';

import { useState } from 'react';

const SNAPSHOTS = [
  { id: 'snap-a1b2c3', agent: 'SRV-DC01', type: 'FILE', createdAt: '2026-04-14T08:45:00Z', sizeBytes: '128849018880', filesCount: 131234, paths: ['C:\\Users', 'D:\\Projects', 'D:\\Databases'], duration: '45m', jobId: 'job-001' },
  { id: 'snap-d4e5f6', agent: 'DESKTOP-HR01', type: 'FILE', createdAt: '2026-04-14T08:08:00Z', sizeBytes: '15728640000', filesCount: 34622, paths: ['C:\\Users'], duration: '8m', jobId: 'job-002' },
  { id: 'snap-g7h8i9', agent: 'DESKTOP-DEV03', type: 'FILE', createdAt: '2026-04-14T06:45:00Z', sizeBytes: '53687091200', filesCount: 70687, paths: ['C:\\Users', 'D:\\Projects'], duration: '15m', jobId: 'job-004' },
  { id: 'snap-j1k2l3', agent: 'DEV-LINUX01', type: 'IMAGE', createdAt: '2026-04-14T06:52:00Z', sizeBytes: '85899345920', filesCount: 0, paths: ['Full Disk Image'], duration: '52m', jobId: 'job-005' },
  { id: 'snap-m4n5o6', agent: 'SRV-DC01', type: 'FILE', createdAt: '2026-04-13T08:57:00Z', sizeBytes: '127900000000', filesCount: 130789, paths: ['C:\\Users', 'D:\\Projects', 'D:\\Databases'], duration: '42m', jobId: 'job-006' },
  { id: 'snap-p7q8r9', agent: 'SRV-FILE01', type: 'FILE', createdAt: '2026-04-12T08:30:00Z', sizeBytes: '536870912000', filesCount: 289345, paths: ['E:\\SharedDrive'], duration: '2h 15m', jobId: 'job-010' },
];

function formatBytes(b: number | string) {
  const bytes = typeof b === 'string' ? parseInt(b) : b;
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SnapshotsPage() {
  const [selectedAgent, setSelectedAgent] = useState('ALL');
  const agents = ['ALL', ...Array.from(new Set(SNAPSHOTS.map((s) => s.agent)))];
  const filtered = selectedAgent === 'ALL' ? SNAPSHOTS : SNAPSHOTS.filter((s) => s.agent === selectedAgent);

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Snapshots</h1>
            <p className="page-subtitle">{SNAPSHOTS.length} snapshots across {new Set(SNAPSHOTS.map((s) => s.agent)).size} agents</p>
          </div>
        </div>
      </header>

      <div className="page-body">
        {/* Agent Filter */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
          {agents.map((a) => (
            <button key={a} onClick={() => setSelectedAgent(a)} className="btn btn-sm" style={{
              background: selectedAgent === a ? 'var(--accent-glow)' : 'var(--bg-card)',
              color: selectedAgent === a ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: `1px solid ${selectedAgent === a ? 'var(--border-active)' : 'var(--border-default)'}`,
              fontWeight: selectedAgent === a ? 700 : 500,
            }}>{a === 'ALL' ? `All (${SNAPSHOTS.length})` : a}</button>
          ))}
        </div>

        {/* Timeline View */}
        <div style={{ position: 'relative', paddingLeft: '30px' }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute', left: '10px', top: 0, bottom: 0, width: '2px',
            background: 'linear-gradient(to bottom, var(--accent-primary), var(--accent-purple), transparent)',
          }} />

          {filtered.map((snap, i) => (
            <div key={snap.id} style={{
              position: 'relative', marginBottom: 'var(--space-lg)',
              animation: `fadeInUp 0.3s ease ${i * 0.05}s both`,
            }}>
              {/* Timeline dot */}
              <div style={{
                position: 'absolute', left: '-25px', top: '20px',
                width: '12px', height: '12px', borderRadius: '50%',
                background: snap.type === 'IMAGE' ? 'var(--accent-purple)' : 'var(--accent-primary)',
                border: '2px solid var(--bg-primary)',
                boxShadow: `0 0 8px ${snap.type === 'IMAGE' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
              }} />

              <div className="card" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{snap.agent}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                        background: snap.type === 'IMAGE' ? 'rgba(139, 92, 246, 0.1)' : 'var(--accent-glow)',
                        color: snap.type === 'IMAGE' ? 'var(--accent-purple)' : 'var(--accent-primary)',
                      }}>{snap.type}</span>
                      <code style={{
                        fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px',
                        background: 'var(--bg-input)', color: 'var(--text-muted)',
                      }}>{snap.id}</code>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(snap.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {timeAgo(snap.createdAt)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{formatBytes(snap.sizeBytes)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {snap.filesCount > 0 ? `${snap.filesCount.toLocaleString()} files` : 'Full disk'} · {snap.duration}
                    </div>
                  </div>
                </div>

                {/* Paths */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: 'var(--space-sm)' }}>
                  {snap.paths.map((p, j) => (
                    <span key={j} style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem',
                      background: 'var(--bg-secondary)', color: 'var(--text-muted)',
                      fontFamily: 'monospace',
                    }}>{p}</span>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-default)' }}>
                  <button className="btn btn-sm btn-primary">♻️ Restore</button>
                  <button className="btn btn-sm btn-secondary">📂 Browse Files</button>
                  <button className="btn btn-sm btn-secondary">📋 Compare</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
