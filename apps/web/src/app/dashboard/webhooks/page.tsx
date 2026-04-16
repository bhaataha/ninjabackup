'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { webhooks as webhooksApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { StatusBadge, Badge } from '@/components/Badge';
import { TableSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useT } from '@/components/LocaleProvider';

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
  const t = useT();
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
      toast.success(t('Webhook created', 'Webhook נוצר'));
    } catch (e: any) {
      setErr(e?.message ?? t('Failed to create webhook', 'יצירת ה-Webhook נכשלה'));
      toast.error(t('Failed to create webhook', 'יצירת ה-Webhook נכשלה'), e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(wh: Webhook) {
    try {
      await webhooksApi.update(wh.id, { active: !wh.active });
      refetch();
      toast.success(wh.active ? t('Webhook disabled', 'ה-Webhook בוטל') : t('Webhook enabled', 'ה-Webhook הופעל'));
    } catch (e: any) {
      toast.error(t('Failed to toggle webhook', 'שינוי מצב ה-Webhook נכשל'), e?.message);
    }
  }

  async function remove(id: string) {
    if (!confirm(t('Delete this webhook?', 'למחוק את ה-Webhook הזה?'))) return;
    try {
      await webhooksApi.delete(id);
      refetch();
      toast.success(t('Webhook deleted', 'ה-Webhook נמחק'));
    } catch (e: any) {
      toast.error(t('Failed to delete webhook', 'מחיקת ה-Webhook נכשלה'), e?.message);
    }
  }

  async function test(id: string) {
    try {
      const r = await webhooksApi.test(id);
      if (r.success) {
        toast.success(t('Test webhook delivered', 'בדיקת ה-Webhook נשלחה בהצלחה'), `HTTP ${r.status} · ${r.durationMs}ms`);
      } else {
        toast.error(t('Webhook test failed', 'בדיקת ה-Webhook נכשלה'), `HTTP ${r.status}`);
      }
    } catch (e: any) {
      toast.error(t('Webhook test failed', 'בדיקת ה-Webhook נכשלה'), e?.message);
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
            <h1 className="page-title">{t('Webhooks', 'Webhooks')}</h1>
            <p className="page-subtitle">{t('Send real-time event notifications to external services', 'שלח התראות אירועים בזמן אמת לשירותים חיצוניים')}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + {t('Add Webhook', 'הוסף Webhook')}
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
          <button
            onClick={() => setActiveTab('webhooks')}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'webhooks' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'webhooks' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
              fontFamily: 'inherit',
            }}
          >
            {t('Webhooks', 'Webhooks')}
          </button>
          <button
            onClick={() => setActiveTab('deliveries')}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'deliveries' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'deliveries' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
              fontFamily: 'inherit',
            }}
          >
            {t('Recent Deliveries', 'משלוחים אחרונים')}
          </button>
        </div>

        {showCreate && (
          <div className="card" style={{ marginBottom: 'var(--space-xl)', border: '1px solid var(--border-active)' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-lg)' }}>🔗 {t('New Webhook', 'Webhook חדש')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{t('Name', 'שם')}</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Slack Alerts" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{t('Webhook URL', 'כתובת Webhook')}</label>
                <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://hooks.slack.com/..." style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>{t('Events', 'אירועים')}</label>
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
                {busy ? t('Saving…', 'שומר…') : t('Save Webhook', 'שמור Webhook')}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                {t('Cancel', 'ביטול')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'webhooks' &&
          (list.length === 0 ? (
            <EmptyState
              icon="🔗"
              title={t('No webhooks yet', 'אין Webhooks עדיין')}
              description={t(
                'Webhooks let you forward events (backup success, agent offline, alerts) to Slack, PagerDuty, or any HTTPS endpoint.',
                'Webhooks מאפשרים להעביר אירועים (גיבוי הצליח, סוכן לא מקוון, התראות) ל-Slack, PagerDuty, או כל נקודת קצה HTTPS.'
              )}
              cta={{ label: `+ ${t('Add Webhook', 'הוסף Webhook')}`, onClick: () => setShowCreate(true) }}
            />
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
                        <Badge key={ev} tone="primary" size="xs">
                          {ev}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <StatusBadge status={wh.active ? 'ACTIVE' : 'DISABLED'} />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {wh.successRate ?? 0}% {t('success', 'הצלחה')} · {timeAgo(wh.lastTriggered)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => test(wh.id)}>
                      🧪 {t('Test', 'בדוק')}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(wh)}>
                      {t('Edit', 'ערוך')}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggle(wh)}>
                      {wh.active ? t('Disable', 'בטל') : t('Enable', 'הפעל')}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(wh.id)}>
                      {t('Delete', 'מחק')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {activeTab === 'deliveries' &&
          (deliveries.length === 0 ? (
            <EmptyState
              icon="📭"
              title={t('No deliveries yet', 'אין משלוחים עדיין')}
              description={t(
                'Deliveries appear here once your webhooks fire on real events.',
                'משלוחים יופיעו כאן ברגע שה-Webhooks שלך ירו על אירועים אמיתיים.'
              )}
            />
          ) : (
            <div className="card">
              <div className="table-container" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>{t('Webhook', 'Webhook')}</th>
                      <th>{t('Event', 'אירוע')}</th>
                      <th>{t('Status', 'סטטוס')}</th>
                      <th>{t('Duration', 'משך')}</th>
                      <th>{t('Time', 'זמן')}</th>
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
                          <StatusBadge status={d.status < 300 ? 'SUCCESS' : 'FAILED'}>{String(d.status)}</StatusBadge>
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>{d.durationMs}ms</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{timeAgo(d.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
      </div>

      {editing && (
        <EditWebhookModal
          webhook={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
            toast.success(t('Webhook updated', 'ה-Webhook עודכן'));
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
  const t = useT();
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
      setErr(e?.message ?? t('Failed to save', 'השמירה נכשלה'));
      toast.error(t('Failed to save webhook', 'שמירת ה-Webhook נכשלה'), e?.message);
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
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>{t('Edit Webhook', 'ערוך Webhook')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('Name', 'שם')}</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />

          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('Webhook URL', 'כתובת Webhook')}</label>
          <input type="url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} />

          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>{t('Events', 'אירועים')}</label>
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
            {t('Cancel', 'ביטול')}
          </button>
          <button className="btn btn-sm btn-primary" onClick={save} disabled={busy || !name || !url || events.length === 0}>
            {busy ? t('Saving…', 'שומר…') : `💾 ${t('Save', 'שמור')}`}
          </button>
        </div>
      </div>
    </div>
  );
}
