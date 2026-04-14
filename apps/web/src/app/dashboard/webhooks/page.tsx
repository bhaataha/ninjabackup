'use client';

import { useState } from 'react';

const MOCK_WEBHOOKS = [
  { id: '1', name: 'Slack Alerts', url: 'https://hooks.slack.com/services/T.../B.../xxxx', events: ['backup.failed', 'agent.offline'], active: true, lastTriggered: '2026-04-14T07:30:00Z', successRate: 100 },
  { id: '2', name: 'PagerDuty', url: 'https://events.pagerduty.com/integration/xxxx', events: ['backup.failed', 'restore.failed'], active: true, lastTriggered: '2026-04-13T14:00:00Z', successRate: 98 },
  { id: '3', name: 'Custom Dashboard', url: 'https://api.internal.company.com/webhooks/backup', events: ['backup.success', 'backup.failed', 'agent.status'], active: false, lastTriggered: '2026-04-10T10:00:00Z', successRate: 85 },
];

const RECENT_DELIVERIES = [
  { id: '1', webhook: 'Slack Alerts', event: 'backup.failed', status: 200, duration: 250, timestamp: '2026-04-14T07:30:00Z' },
  { id: '2', webhook: 'PagerDuty', event: 'backup.failed', status: 200, duration: 340, timestamp: '2026-04-14T07:30:05Z' },
  { id: '3', webhook: 'Slack Alerts', event: 'agent.offline', status: 200, duration: 180, timestamp: '2026-04-13T22:15:00Z' },
  { id: '4', webhook: 'Custom Dashboard', event: 'backup.success', status: 503, duration: 5000, timestamp: '2026-04-10T10:00:00Z' },
  { id: '5', webhook: 'Slack Alerts', event: 'backup.failed', status: 200, duration: 210, timestamp: '2026-04-12T08:00:00Z' },
];

const ALL_EVENTS = ['backup.success', 'backup.failed', 'agent.online', 'agent.offline', 'agent.status', 'restore.started', 'restore.failed', 'restore.complete', 'alert.triggered'];

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function WebhooksPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'webhooks' | 'deliveries'>('webhooks');

  const toggleEvent = (ev: string) => {
    setSelectedEvents(p => p.includes(ev) ? p.filter(e => e !== ev) : [...p, ev]);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: 'var(--bg-input)',
    border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit',
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Webhooks</h1>
            <p className="page-subtitle">Send real-time event notifications to external services</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Webhook</button>
        </div>
      </header>

      <div className="page-body">
        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '2px', marginBottom: 'var(--space-xl)',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
          padding: '4px', border: '1px solid var(--border-glass)', width: 'fit-content',
        }}>
          {(['webhooks', 'deliveries'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 20px', borderRadius: 'var(--radius-sm)',
              background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === tab ? 'white' : 'var(--text-secondary)',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
              fontFamily: 'inherit', textTransform: 'capitalize',
            }}>{tab}</button>
          ))}
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="card" style={{ marginBottom: 'var(--space-xl)', border: '1px solid var(--border-active)' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-lg)' }}>🔗 New Webhook</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., Slack Alerts" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>URL</label>
                <input type="url" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://hooks.slack.com/..." style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Events</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ALL_EVENTS.map(ev => (
                  <button key={ev} onClick={() => toggleEvent(ev)} style={{
                    padding: '5px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600,
                    background: selectedEvents.includes(ev) ? 'var(--accent-glow)' : 'rgba(255,255,255,0.03)',
                    color: selectedEvents.includes(ev) ? 'var(--accent-primary)' : 'var(--text-muted)',
                    border: `1px solid ${selectedEvents.includes(ev) ? 'var(--border-active)' : 'var(--border-glass)'}`,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>{ev}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary">Save Webhook</button>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-secondary" style={{ marginLeft: 'auto' }}>🧪 Send Test</button>
            </div>
          </div>
        )}

        {/* Webhooks List */}
        {activeTab === 'webhooks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {MOCK_WEBHOOKS.map(wh => (
              <div key={wh.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: 'var(--radius-md)',
                  background: wh.active ? 'var(--accent-success-glow)' : 'rgba(100,116,139,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
                }}>{wh.active ? '🔗' : '🔕'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '4px' }}>{wh.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <code style={{ padding: '1px 6px', background: 'var(--bg-input)', borderRadius: '4px', fontSize: '0.7rem' }}>{wh.url}</code>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {wh.events.map(ev => (
                      <span key={ev} style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600,
                        background: 'rgba(59, 130, 246, 0.08)', color: 'var(--accent-primary)',
                      }}>{ev}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className={`status-badge ${wh.active ? 'online' : 'offline'}`}>{wh.active ? 'Active' : 'Disabled'}</span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {wh.successRate}% success · {timeAgo(wh.lastTriggered)}
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm">Edit</button>
              </div>
            ))}
          </div>
        )}

        {/* Delivery Log */}
        {activeTab === 'deliveries' && (
          <div className="card">
            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr><th>Webhook</th><th>Event</th><th>Status</th><th>Duration</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {RECENT_DELIVERIES.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.webhook}</td>
                      <td>
                        <code style={{ padding: '2px 8px', background: 'var(--bg-input)', borderRadius: '4px', fontSize: '0.75rem' }}>{d.event}</code>
                      </td>
                      <td>
                        <span className={`status-badge ${d.status < 300 ? 'success' : 'failed'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{d.duration}ms</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{timeAgo(d.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
