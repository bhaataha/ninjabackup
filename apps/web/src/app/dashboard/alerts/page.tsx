'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { useSocket } from '@/hooks/useSocket';
import { alerts as alertsApi } from '@/lib/api';
import { useToast } from '@/components/Toast';

type AlertRule = {
  id: string;
  name?: string;
  type: string;
  condition?: string;
  conditions?: Record<string, any>;
  severity?: 'CRITICAL' | 'WARNING' | 'INFO';
  channels?: string[];
  notifyEmail?: boolean;
  notifyWebhook?: boolean;
  webhookUrl?: string;
  enabled: boolean;
};

type Alert = {
  id: string;
  ruleName?: string;
  rule?: string;
  message: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  createdAt: string;
  acknowledged: boolean;
};

const RULE_TYPES = [
  { value: 'BACKUP_FAILED', label: 'Backup failed', defaultSeverity: 'CRITICAL' as const },
  { value: 'AGENT_OFFLINE', label: 'Agent offline > N minutes', defaultSeverity: 'WARNING' as const },
  { value: 'STORAGE_FULL', label: 'Storage near quota', defaultSeverity: 'WARNING' as const },
  { value: 'QUOTA_WARNING', label: 'Quota warning', defaultSeverity: 'INFO' as const },
  { value: 'AGENT_VERSION_OLD', label: 'Agent version outdated', defaultSeverity: 'INFO' as const },
  { value: 'RESTORE_FAILED', label: 'Restore failed', defaultSeverity: 'CRITICAL' as const },
];

function getSeverityStyle(s: string) {
  switch (s) {
    case 'CRITICAL':
      return { bg: 'var(--accent-danger-glow)', color: 'var(--accent-danger)', icon: '🔴' };
    case 'WARNING':
      return { bg: 'var(--accent-warning-glow)', color: 'var(--accent-warning)', icon: '🟡' };
    default:
      return { bg: 'var(--accent-glow)', color: 'var(--accent-primary)', icon: '🔵' };
  }
}

export default function AlertsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'alerts' | 'rules'>('alerts');
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const { data: alertsData, refetch: refetchAlerts, error: alertsError } = useFetch<Alert[]>(
    () => alertsApi.list() as Promise<Alert[]>,
    [],
    { interval: 15_000 },
  );
  const { data: rulesData, refetch: refetchRules, error: rulesError } = useFetch<AlertRule[]>(
    () => alertsApi.rules.list() as Promise<AlertRule[]>,
  );
  const { alerts: liveAlerts } = useSocket({ tenantId: 'current' });

  const alerts = alertsData ?? [];
  const rules = rulesData ?? [];
  const liveAsAlerts: Alert[] = liveAlerts
    .filter((la) => !alerts.find((a) => a.id === la.id))
    .map((la) => ({
      id: la.id,
      ruleName: la.rule,
      message: la.message,
      severity: la.severity as Alert['severity'],
      createdAt: la.timestamp,
      acknowledged: false,
    }));
  const allAlerts: Alert[] = [...liveAsAlerts, ...alerts];

  async function acknowledge(id: string) {
    try {
      await alertsApi.acknowledge(id);
      refetchAlerts();
    } catch (e: any) {
      toast.error('Failed to acknowledge alert', e?.message);
    }
  }

  async function toggleRule(rule: AlertRule) {
    try {
      await alertsApi.rules.update(rule.id, { enabled: !rule.enabled });
      refetchRules();
      toast.success(rule.enabled ? 'Rule disabled' : 'Rule enabled');
    } catch (e: any) {
      toast.error('Failed to update rule', e?.message);
    }
  }

  async function deleteRule(rule: AlertRule) {
    if (!confirm(`Delete rule "${rule.name ?? rule.type}"? Past alerts will remain.`)) return;
    try {
      await alertsApi.rules.delete(rule.id);
      refetchRules();
      toast.success('Rule deleted');
    } catch (e: any) {
      toast.error('Failed to delete rule', e?.message);
    }
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Alerts</h1>
            <p className="page-subtitle">{allAlerts.filter((a) => !a.acknowledged).length} unacknowledged alerts</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateRule(true)}>
            + Create Rule
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
            padding: '3px',
            border: '1px solid var(--border-default)',
            width: 'fit-content',
          }}
        >
          {(['alerts', 'rules'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="btn btn-sm"
              style={{
                background: tab === t ? 'var(--accent-primary)' : 'transparent',
                color: tab === t ? 'white' : 'var(--text-secondary)',
                border: 'none',
                textTransform: 'capitalize',
              }}
            >
              {t} {t === 'alerts' ? `(${allAlerts.length})` : `(${rules.length})`}
            </button>
          ))}
        </div>

        {tab === 'alerts' ? (
          <>
            {alertsError && (
              <div className="card" style={{ marginBottom: 'var(--space-md)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                <div style={{ color: 'var(--accent-danger)', fontSize: '0.85rem' }}>{alertsError}</div>
              </div>
            )}
            {allAlerts.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>No alerts</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>You&apos;re all caught up.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {allAlerts.map((alert) => {
                  const style = getSeverityStyle(alert.severity);
                  return (
                    <div
                      key={alert.id}
                      className="card"
                      style={{
                        padding: 'var(--space-md) var(--space-lg)',
                        borderLeft: `3px solid ${style.color}`,
                        opacity: alert.acknowledged ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span>{style.icon}</span>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{alert.ruleName ?? alert.rule ?? 'Alert'}</span>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                background: style.bg,
                                color: style.color,
                              }}
                            >
                              {alert.severity}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{alert.message}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {new Date(alert.createdAt).toLocaleString()}
                          </div>
                        </div>
                        {!alert.acknowledged && (
                          <button className="btn btn-sm btn-secondary" onClick={() => acknowledge(alert.id)}>
                            ✓ Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {rulesError && (
              <div className="card" style={{ marginBottom: 'var(--space-md)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                <div style={{ color: 'var(--accent-danger)', fontSize: '0.85rem' }}>{rulesError}</div>
              </div>
            )}
            {rules.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>No alert rules defined</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  Create a rule to get notified on events like backup failures or agents going offline.
                </div>
                <button className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }} onClick={() => setShowCreateRule(true)}>
                  + Create Rule
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Rule</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Channels</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => {
                      const sev = getSeverityStyle(rule.severity ?? 'INFO');
                      const channels: string[] = [];
                      if (rule.notifyEmail) channels.push('email');
                      if (rule.notifyWebhook) channels.push('webhook');
                      return (
                        <tr key={rule.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rule.name ?? rule.type}</td>
                          <td>
                            <code
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--accent-primary)',
                                background: 'var(--bg-input)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              {rule.type}
                            </code>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: sev.bg,
                                color: sev.color,
                              }}
                            >
                              {rule.severity ?? 'INFO'}
                            </span>
                          </td>
                          <td>{(rule.channels ?? channels).join(', ') || '—'}</td>
                          <td>
                            <span className={`status-badge ${rule.enabled ? 'online' : 'offline'}`}>
                              {rule.enabled ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => setEditingRule(rule)}>
                                Edit
                              </button>
                              <button className="btn btn-sm btn-secondary" onClick={() => toggleRule(rule)}>
                                {rule.enabled ? 'Disable' : 'Enable'}
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => deleteRule(rule)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {showCreateRule && (
        <RuleModal
          mode="create"
          onClose={() => setShowCreateRule(false)}
          onSaved={() => {
            setShowCreateRule(false);
            refetchRules();
            setTab('rules');
            toast.success('Alert rule created');
          }}
        />
      )}
      {editingRule && (
        <RuleModal
          mode="edit"
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSaved={() => {
            setEditingRule(null);
            refetchRules();
            toast.success('Alert rule updated');
          }}
        />
      )}
    </>
  );
}

function RuleModal({
  mode,
  rule,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  rule?: AlertRule;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(rule?.name ?? '');
  const [type, setType] = useState(rule?.type ?? RULE_TYPES[0].value);
  const [severity, setSeverity] = useState<'CRITICAL' | 'WARNING' | 'INFO'>(
    rule?.severity ?? RULE_TYPES[0].defaultSeverity,
  );
  const [notifyEmail, setNotifyEmail] = useState(rule?.notifyEmail ?? true);
  const [notifyWebhook, setNotifyWebhook] = useState(rule?.notifyWebhook ?? false);
  const [webhookUrl, setWebhookUrl] = useState(rule?.webhookUrl ?? '');
  const [offlineMinutes, setOfflineMinutes] = useState<number>(
    (rule?.conditions as any)?.offlineMinutes ?? 30,
  );
  const [quotaPercent, setQuotaPercent] = useState<number>(
    (rule?.conditions as any)?.quotaPercent ?? 80,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    const conditions: Record<string, any> = {};
    if (type === 'AGENT_OFFLINE') conditions.offlineMinutes = offlineMinutes;
    if (type === 'STORAGE_FULL' || type === 'QUOTA_WARNING') conditions.quotaPercent = quotaPercent;

    const payload = {
      name: name || undefined,
      type,
      severity,
      notifyEmail,
      notifyWebhook,
      webhookUrl: notifyWebhook ? webhookUrl : null,
      conditions,
      enabled: rule?.enabled ?? true,
    };
    try {
      if (mode === 'create') {
        await alertsApi.rules.create(payload);
      } else if (rule) {
        await alertsApi.rules.update(rule.id, payload);
      }
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save rule');
      toast.error('Failed to save rule', e?.message);
    } finally {
      setBusy(false);
    }
  }

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
      <div className="card" style={{ maxWidth: 520, width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
          {mode === 'create' ? 'Create Alert Rule' : 'Edit Alert Rule'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Name (optional)</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekend backup failures"
          />

          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Event type</label>
          <select
            className="input"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              const meta = RULE_TYPES.find((t) => t.value === e.target.value);
              if (meta) setSeverity(meta.defaultSeverity);
            }}
          >
            {RULE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {type === 'AGENT_OFFLINE' && (
            <>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Offline threshold (minutes)</label>
              <input
                type="number"
                min={1}
                className="input"
                value={offlineMinutes}
                onChange={(e) => setOfflineMinutes(parseInt(e.target.value) || 30)}
              />
            </>
          )}

          {(type === 'STORAGE_FULL' || type === 'QUOTA_WARNING') && (
            <>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Trigger at usage % of quota</label>
              <input
                type="number"
                min={1}
                max={100}
                className="input"
                value={quotaPercent}
                onChange={(e) => setQuotaPercent(parseInt(e.target.value) || 80)}
              />
            </>
          )}

          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Severity</label>
          <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
            <option value="CRITICAL">🔴 Critical</option>
            <option value="WARNING">🟡 Warning</option>
            <option value="INFO">🔵 Info</option>
          </select>

          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
              📧 Email
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={notifyWebhook} onChange={(e) => setNotifyWebhook(e.target.checked)} />
              🔗 Webhook
            </label>
          </div>

          {notifyWebhook && (
            <input
              type="url"
              className="input"
              placeholder="https://hooks.slack.com/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          )}
        </div>

        {err && <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginTop: 'var(--space-sm)' }}>{err}</div>}

        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
          <button className="btn btn-sm btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-sm btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : mode === 'create' ? 'Create Rule' : '💾 Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
