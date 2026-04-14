'use client';

import { useState } from 'react';

const ALERT_RULES = [
  { id: '1', name: 'Backup Failure Alert', condition: 'job.status = FAILED', severity: 'CRITICAL', channels: ['email', 'webhook'], enabled: true },
  { id: '2', name: 'Agent Offline > 30min', condition: 'agent.offline > 30m', severity: 'WARNING', channels: ['email'], enabled: true },
  { id: '3', name: 'Storage > 80%', condition: 'vault.usage > 80%', severity: 'WARNING', channels: ['email'], enabled: true },
  { id: '4', name: 'Agent Version Outdated', condition: 'agent.version < latest', severity: 'INFO', channels: ['email'], enabled: false },
];

const ALERTS = [
  { id: '1', rule: 'Backup Failure Alert', message: 'Backup job for SRV-FILE01 failed: S3 connection timeout', severity: 'CRITICAL', createdAt: '2026-04-14T07:23:00Z', acknowledged: false },
  { id: '2', rule: 'Agent Offline > 30min', message: 'LAPTOP-CEO has been offline for 2 days', severity: 'WARNING', createdAt: '2026-04-14T06:00:00Z', acknowledged: false },
  { id: '3', rule: 'Storage > 80%', message: 'Production S3 vault usage at 82%', severity: 'WARNING', createdAt: '2026-04-13T12:00:00Z', acknowledged: true },
  { id: '4', rule: 'Backup Failure Alert', message: 'Backup job for SRV-FILE01 failed: Permission denied', severity: 'CRITICAL', createdAt: '2026-04-13T07:15:00Z', acknowledged: true },
];

function getSeverityStyle(s: string) {
  switch (s) {
    case 'CRITICAL': return { bg: 'var(--accent-danger-glow)', color: 'var(--accent-danger)', icon: '🔴' };
    case 'WARNING': return { bg: 'var(--accent-warning-glow)', color: 'var(--accent-warning)', icon: '🟡' };
    default: return { bg: 'var(--accent-glow)', color: 'var(--accent-primary)', icon: '🔵' };
  }
}

export default function AlertsPage() {
  const [tab, setTab] = useState<'alerts' | 'rules'>('alerts');

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Alerts</h1>
            <p className="page-subtitle">{ALERTS.filter((a) => !a.acknowledged).length} unacknowledged alerts</p>
          </div>
          <button className="btn btn-primary">+ Create Rule</button>
        </div>
      </header>

      <div className="page-body">
        {/* Tab Switch */}
        <div style={{ display: 'flex', gap: '2px', marginBottom: 'var(--space-xl)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '3px', border: '1px solid var(--border-default)', width: 'fit-content' }}>
          {(['alerts', 'rules'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="btn btn-sm" style={{
              background: tab === t ? 'var(--accent-primary)' : 'transparent',
              color: tab === t ? 'white' : 'var(--text-secondary)',
              border: 'none', textTransform: 'capitalize',
            }}>{t} {t === 'alerts' ? `(${ALERTS.length})` : `(${ALERT_RULES.length})`}</button>
          ))}
        </div>

        {tab === 'alerts' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {ALERTS.map((alert) => {
              const style = getSeverityStyle(alert.severity);
              return (
                <div key={alert.id} className="card" style={{
                  padding: 'var(--space-md) var(--space-lg)',
                  borderLeft: `3px solid ${style.color}`,
                  opacity: alert.acknowledged ? 0.6 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span>{style.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{alert.rule}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, background: style.bg, color: style.color }}>{alert.severity}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{alert.message}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <button className="btn btn-sm btn-secondary">✓ Acknowledge</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Rule</th><th>Condition</th><th>Severity</th><th>Channels</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {ALERT_RULES.map((rule) => (
                  <tr key={rule.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rule.name}</td>
                    <td><code style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>{rule.condition}</code></td>
                    <td><span style={{ ...getSeverityStyle(rule.severity), padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: getSeverityStyle(rule.severity).bg, color: getSeverityStyle(rule.severity).color }}>{rule.severity}</span></td>
                    <td>{rule.channels.join(', ')}</td>
                    <td><span className={`status-badge ${rule.enabled ? 'online' : 'offline'}`}>{rule.enabled ? 'Active' : 'Disabled'}</span></td>
                    <td><button className="btn btn-sm btn-secondary">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
