'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { webhooks as webhooksApi } from '@/lib/api';
import { useToast } from '@/components/Toast';

type Webhook = {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  lastTriggered?: string;
  successRate?: number;
};

type Delivery = {
  id: string;
  webhookName: string;
  event: string;
  status: number;
  durationMs: number;
  timestamp: string;
};

const ALL_EVENTS = [
  'backup.success',
  'backup.failed',
  'agent.online',
  'agent.offline',
  'agent.status',
  'restore.started',
  'restore.failed',
  'restore.complete',
  'alert.triggered',
];

function timeAgo(date?: string) {
  if (!date) return '—';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function WebhooksPage() {
  const toast = useToast();
  const { data, refetch } = useFetch<Webhook[]>(() => webhooksApi.list() as Promise<Webhook[]>);
  const { data: deliveriesData } = useFetch<Delivery[]>(() => webhooksApi.deliveries() as Promise<Delivery[]>, [], { interval: 30_000 });
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'webhooks' | 'deliveries'>('webhooks');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const list = data ?? [];
  const deliveries = deliveriesData ?? [];

  const toggleEvent = (ev: string) => {
    setSelectedEvents((p) => (p.includes(ev) ? p.filter((e) => e !== ev) : [...p, ev]));
  };

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await webhooksApi.create({ name: newName, url: newUrl, events: selectedEvents });
      setShowCreate(false);
      setNewName('');
      setNewUrl('');
      setSelectedEvents([]);
      refetch();
      toast.success('Webhook created');
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to create webhook');
      toast.error('Failed to create webhook', e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(wh: Webhook) {
    try {
      await webhooksApi.update(wh.id, { active: !wh.active });
      refetch();
      toast.success(wh.active ? 'Webhook disabled' : 'Webhook enabled');
    } catch (e: any) {
      toast.error('Failed to toggle webhook', e?.message);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this webhook?')) return;
    try {
      await webhooksApi.delete(id);
      refetch();
      toast.success('Webhook deleted');
    } catch (e: any) {
      toast.error('Failed to delete webhook', e?.message);
    }
  }

  async function test(id: string) {
    try {
      const r = await webhooksApi.test(id);
      if (r.success) {
        toast.success('Test webhook delivered', `HTTP ${r.status} · ${r.durationMs}ms`);
      } else {
        toast.error('Webhook test failed', `HTTP ${r.status}`);
      }
    } catch (e: any) {
      toast.error('Webhook test failed', e?.message);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.88rem',
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Webhooks</h1>
            <p className="page-subtitle">Send real-time event notifications to external services</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Add Webhook
          </button>
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
          {(['webhooks', 'deliveries'] as const).map((tab) => (
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

        {showCreate && (
          <div className="card" style={{ marginBottom: 'var(--space-xl)', border: '1px solid var(--border-active)' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-lg)' }}>🔗 New Webhook</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Slack Alerts" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>URL</label>
                <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://hooks.slack.com/..." style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>Events</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ALL_EVENTS.map((ev) => (
                  <button
                    key={ev}
                    onClick={() => toggleEvent(ev)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '99px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: selectedEvents.includes(ev) ? 'var(--accent-glow)' : 'rgba(255,255,255,0.03)',
                      color: selectedEvents.includes(ev) ? 'var(--accent-primary)' : 'var(--text-muted)',
                      border: `1px solid ${selectedEvents.includes(ev) ? 'var(--border-active)' : 'var(--border-glass)'}`,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {ev}
                  </button>
                ))}
              </div>
            </div>
            {err && <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: 'var(--space-sm)' }}>{err}</div>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={save} disabled={busy || !newName || !newUrl || selectedEvents.length === 0}>
                {busy ? 'Saving…' : 'Save Webhook'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {activeTab === 'webhooks' &&
          (list.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>No webhooks configured</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {list.map((wh) => (
                <div key={wh.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-md)',
                      background: wh.active ? 'var(--accent-success-glow)' : 'rgba(100,116,139,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      flexShrink: 0,
                    }}
                  >
                    {wh.active ? '🔗' : '🔕'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '4px' }}>{wh.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <code style={{ padding: '1px 6px', background: 'var(--bg-input)', borderRadius: '4px', fontSize: '0.7rem' }}>{wh.url}</code>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {wh.events.map((ev) => (
                        <span
                          key={ev}
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            background: 'rgba(59, 130, 246, 0.08)',
                            color: 'var(--accent-primary)',
                          }}
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className={`status-badge ${wh.active ? 'online' : 'offline'}`}>{wh.active ? 'Active' : 'Disabled'}</span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {wh.successRate ?? 0}% success · {timeAgo(wh.lastTriggered)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => test(wh.id)}>
                      🧪 Test
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(wh)}>
                      Edit
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggle(wh)}>
                      {wh.active ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(wh.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {activeTab === 'deliveries' && (
          <div className="card">
            {deliveries.length === 0 ? (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>No deliveries yet.</div>
            ) : (
              <div className="table-container" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Webhook</th>
                      <th>Event</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((d) => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600 }}>{d.webhookName}</td>
                        <td>
                          <code style={{ padding: '2px 8px', background: 'var(--bg-input)', borderRadius: '4px', fontSize: '0.75rem' }}>{d.event}</code>
                        </td>
                        <td>
                          <span className={`status-badge ${d.status < 300 ? 'success' : 'failed'}`}>{d.status}</span>
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>{d.durationMs}ms</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{timeAgo(d.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <EditWebhookModal
          webhook={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
            toast.success('Webhook updated');
          }}
        />
      )}
    </>
  );
}

function EditWebhookModal({
  webhook,
  onClose,
  onSaved,
}: {
  webhook: Webhook;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(webhook.name);
  const [url, setUrl] = useState(webhook.url);
  const [events, setEvents] = useState<string[]>(webhook.events);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggle(ev: string) {
    setEvents((p) => (p.includes(ev) ? p.filter((e) => e !== ev) : [...p, ev]));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await webhooksApi.update(webhook.id, { name, url, events });
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save');
      toast.error('Failed to save webhook', e?.message);
    } finally {
      setBusy(false);
    }
  }

  const ALL_EVENTS = [
    'backup.success',
    'backup.failed',
    'agent.online',
    'agent.offline',
    'agent.status',
    'restore.started',
    'restore.failed',
    'restore.complete',
    'alert.triggered',
  ];

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
      <div className="card" style={{ maxWidth: 540, width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>Edit Webhook</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />

          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Delivery URL</label>
          <input type="url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} />

          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>Events</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {ALL_EVENTS.map((ev) => (
              <button
                key={ev}
                onClick={() => toggle(ev)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '99px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: events.includes(ev) ? 'var(--accent-glow)' : 'rgba(255,255,255,0.03)',
                  color: events.includes(ev) ? 'var(--accent-primary)' : 'var(--text-muted)',
                  border: `1px solid ${events.includes(ev) ? 'var(--border-active)' : 'var(--border-glass)'}`,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {ev}
              </button>
            ))}
          </div>
        </div>

        {err && <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginTop: 'var(--space-sm)' }}>{err}</div>}

        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
          <button className="btn btn-sm btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-sm btn-primary" onClick={save} disabled={busy || !name || !url || events.length === 0}>
            {busy ? 'Saving…' : '💾 Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
