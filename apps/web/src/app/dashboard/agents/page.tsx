'use client';

import { useState } from 'react';

const AGENTS = [
  { id: '1', hostname: 'DESKTOP-HR01', displayName: 'HR Workstation', status: 'ONLINE', osType: 'WINDOWS', osVersion: 'Windows 11 Pro 23H2', agentVersion: '1.0.0', lastBackup: '2026-04-14T08:00:00Z', lastSeen: '2026-04-14T08:15:00Z', totalDataBytes: '15728640000', totalBackups: 142, cpuInfo: 'Intel i5-13400', ramGb: 16, diskInfo: [{ drive: 'C:', totalGb: 512, freeGb: 234 }] },
  { id: '2', hostname: 'SRV-DC01', displayName: 'Domain Controller', status: 'BACKING_UP', osType: 'WINDOWS', osVersion: 'Windows Server 2022', agentVersion: '1.0.0', lastBackup: '2026-04-14T07:30:00Z', lastSeen: '2026-04-14T08:17:00Z', totalDataBytes: '128849018880', totalBackups: 365, cpuInfo: 'Xeon E-2388G', ramGb: 64, diskInfo: [{ drive: 'C:', totalGb: 256, freeGb: 80 }, { drive: 'D:', totalGb: 2048, freeGb: 1200 }] },
  { id: '3', hostname: 'DESKTOP-DEV03', displayName: 'Dev Machine 3', status: 'ONLINE', osType: 'WINDOWS', osVersion: 'Windows 11 Pro 24H2', agentVersion: '1.0.0', lastBackup: '2026-04-14T08:00:00Z', lastSeen: '2026-04-14T08:12:00Z', totalDataBytes: '53687091200', totalBackups: 89, cpuInfo: 'Intel i9-14900K', ramGb: 64, diskInfo: [{ drive: 'C:', totalGb: 1024, freeGb: 540 }] },
  { id: '4', hostname: 'SRV-FILE01', displayName: 'File Server', status: 'ERROR', osType: 'WINDOWS', osVersion: 'Windows Server 2019', agentVersion: '0.9.8', lastBackup: '2026-04-13T08:00:00Z', lastSeen: '2026-04-14T07:05:00Z', totalDataBytes: '536870912000', totalBackups: 298, cpuInfo: 'Xeon E-2236', ramGb: 32, diskInfo: [{ drive: 'C:', totalGb: 256, freeGb: 90 }, { drive: 'E:', totalGb: 4096, freeGb: 890 }] },
  { id: '5', hostname: 'DEV-LINUX01', displayName: 'Build Server', status: 'ONLINE', osType: 'LINUX', osVersion: 'Ubuntu 22.04 LTS', agentVersion: '1.0.0', lastBackup: '2026-04-14T06:00:00Z', lastSeen: '2026-04-14T08:14:00Z', totalDataBytes: '85899345920', totalBackups: 201, cpuInfo: 'AMD Ryzen 9 7950X', ramGb: 128, diskInfo: [{ drive: '/', totalGb: 2048, freeGb: 1400 }] },
  { id: '6', hostname: 'LAPTOP-CEO', displayName: 'CEO Laptop', status: 'OFFLINE', osType: 'MACOS', osVersion: 'macOS 15.3', agentVersion: '1.0.0', lastBackup: '2026-04-12T14:00:00Z', lastSeen: '2026-04-12T16:30:00Z', totalDataBytes: '42949672960', totalBackups: 67, cpuInfo: 'Apple M3 Pro', ramGb: 36, diskInfo: [{ drive: '/', totalGb: 1024, freeGb: 620 }] },
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
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getStatusClass(s: string) {
  const map: Record<string, string> = { ONLINE: 'online', OFFLINE: 'offline', BACKING_UP: 'backing-up', ERROR: 'error', RESTORING: 'backing-up' };
  return map[s] || 'offline';
}

function getOsIcon(os: string) {
  const map: Record<string, string> = { WINDOWS: '🪟', LINUX: '🐧', MACOS: '🍎' };
  return map[os] || '💻';
}

export default function AgentsPage() {
  const [filter, setFilter] = useState('ALL');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);

  const filtered = filter === 'ALL' ? AGENTS : AGENTS.filter((a) => a.status === filter);
  const selected = selectedAgent ? AGENTS.find((a) => a.id === selectedAgent) : null;

  const statCounts = {
    ALL: AGENTS.length,
    ONLINE: AGENTS.filter((a) => a.status === 'ONLINE').length,
    BACKING_UP: AGENTS.filter((a) => a.status === 'BACKING_UP').length,
    ERROR: AGENTS.filter((a) => a.status === 'ERROR').length,
    OFFLINE: AGENTS.filter((a) => a.status === 'OFFLINE').length,
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Agents</h1>
            <p className="page-subtitle">{AGENTS.length} agents registered · {statCounts.ONLINE + statCounts.BACKING_UP} currently active</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button className="btn btn-secondary" onClick={() => setShowTokenModal(true)}>
              🔑 Registration Token
            </button>
            <button className="btn btn-primary">
              + Add Agent
            </button>
          </div>
        </div>
      </header>

      <div className="page-body">
        {/* Status Filter Badges */}
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

        {/* Content Area: Table + Detail Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedAgent ? '1fr 380px' : '1fr', gap: 'var(--space-lg)' }}>
          {/* Agents Table */}
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
                        <span style={{ fontSize: '1.2rem' }}>{getOsIcon(agent.osType)}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{agent.displayName}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{agent.hostname}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{agent.osVersion}</td>
                    <td><span className={`status-badge ${getStatusClass(agent.status)}`}>{agent.status.replace('_', ' ')}</span></td>
                    <td style={{ fontWeight: 600 }}>{formatBytes(agent.totalDataBytes)}</td>
                    <td>{agent.totalBackups}</td>
                    <td style={{ fontSize: '0.8rem' }}>{timeAgo(agent.lastBackup)}</td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: agent.agentVersion === '1.0.0' ? 'var(--accent-success-glow)' : 'var(--accent-warning-glow)',
                        color: agent.agentVersion === '1.0.0' ? 'var(--accent-success)' : 'var(--accent-warning)',
                        fontWeight: 600,
                      }}>
                        v{agent.agentVersion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail Side Panel */}
          {selected && (
            <div className="card" style={{ position: 'sticky', top: '100px', alignSelf: 'start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{selected.displayName}</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => setSelectedAgent(null)}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Status</span>
                  <span className={`status-badge ${getStatusClass(selected.status)}`}>{selected.status}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Hostname</span>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selected.hostname}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>OS</span>
                  <span style={{ fontSize: '0.85rem' }}>{selected.osVersion}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>CPU</span>
                  <span style={{ fontSize: '0.85rem' }}>{selected.cpuInfo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>RAM</span>
                  <span style={{ fontSize: '0.85rem' }}>{selected.ramGb} GB</span>
                </div>

                <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 'var(--space-md)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Disk Usage</div>
                  {selected.diskInfo.map((disk: any, i: number) => (
                    <div key={i} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{disk.drive}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{disk.totalGb - disk.freeGb} / {disk.totalGb} GB</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{
                          width: `${((disk.totalGb - disk.freeGb) / disk.totalGb) * 100}%`,
                          background: ((disk.totalGb - disk.freeGb) / disk.totalGb) > 0.85
                            ? 'linear-gradient(90deg, var(--accent-warning), var(--accent-danger))'
                            : undefined,
                        }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                  <a href={`/dashboard/agents/${selected.id}`} className="btn btn-primary btn-sm" style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>🔍 View Details</a>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>▶ Backup Now</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Registration Token Modal */}
        {showTokenModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)',
          }}
            onClick={() => setShowTokenModal(false)}
          >
            <div className="card" style={{ maxWidth: '500px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>🔑 Agent Registration Token</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                Use this token in the NinjaBackup agent installer to register the machine with your account.
              </p>
              <div style={{
                background: 'var(--bg-input)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all', marginBottom: 'var(--space-lg)',
                border: '1px solid var(--border-default)', color: 'var(--accent-primary)',
              }}>
                nbk_a4f8e2d1c3b5a7f9e1d3c5b7a9f1e3d5c7b9a1f3e5d7c9b1a3f5e7d9c1b3
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowTokenModal(false)}>Close</button>
                <button className="btn btn-primary btn-sm">📋 Copy Token</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
