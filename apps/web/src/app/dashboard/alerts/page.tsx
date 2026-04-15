'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { useSocket } from '@/hooks/useSocket';
import { alerts as alertsApi } from '@/lib/api';

type AlertRule = {
  id: string;
  name: string;
  condition: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  channels: string[];
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
  const [tab, setTab] = useState<'alerts' | 'rules'>('alerts');
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
    } catch (e) {
      console.error('Failed to acknowledge alert', e);
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
          <button className="btn btn-primary" onClick={() => setTab('rules')}>
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
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>You're all caught up.</div>
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
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Rule</th>
                      <th>Condition</th>
                      <th>Severity</th>
                      <th>Channels</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => {
                      const sev = getSeverityStyle(rule.severity);
                      return (
                        <tr key={rule.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rule.name}</td>
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
                              {rule.condition}
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
                              {rule.severity}
                            </span>
                          </td>
                          <td>{(rule.channels ?? []).join(', ') || '—'}</td>
                          <td>
                            <span className={`status-badge ${rule.enabled ? 'online' : 'offline'}`}>
                              {rule.enabled ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={async () => {
                                await alertsApi.rules.update(rule.id, { enabled: !rule.enabled });
                                refetchRules();
                              }}
                            >
                              {rule.enabled ? 'Disable' : 'Enable'}
                            </button>
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
    </>
  );
}
