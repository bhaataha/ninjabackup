'use client';

import { useEffect, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { settings as settingsApi, tenants } from '@/lib/api';

type SettingsData = {
  organization?: { name?: string };
  tenant?: { name?: string };
  plan?: { tier?: string; agentLimit?: number; storageQuotaGb?: number; retention?: string };
  usage?: { agents?: number; storageBytes?: number };
  security?: { enforceMfa?: boolean; zkeEnabled?: boolean; wormStorage?: boolean };
  apiKeyPrefix?: string;
  webhookUrl?: string;
};

function formatBytes(b?: number) {
  if (!b) return '0 B';
  const k = 1024,
    sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function SettingsPage() {
  const { data, loading, error, refetch } = useFetch<SettingsData>(() =>
    settingsApi
      .get()
      .catch(() => tenants.getCurrent()) as Promise<SettingsData>,
  );
  const [form, setForm] = useState<SettingsData>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  function update<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSection<K extends keyof SettingsData>(key: K, partial: Partial<NonNullable<SettingsData[K]>>) {
    setForm((prev) => ({ ...prev, [key]: { ...((prev[key] as object) ?? {}), ...partial } as any }));
  }

  async function save() {
    setSaving(true);
    setSaveErr(null);
    try {
      await settingsApi.update(form);
      setSavedAt(new Date());
      refetch();
    } catch (e: any) {
      try {
        await tenants.updateSettings(form);
        setSavedAt(new Date());
        refetch();
      } catch (e2: any) {
        setSaveErr(e2?.message ?? e?.message ?? 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">
              Tenant and platform configuration
              {savedAt && <span style={{ color: 'var(--accent-success)', marginLeft: 8 }}>· saved {savedAt.toLocaleTimeString()}</span>}
            </p>
          </div>
          <button className="btn btn-primary" onClick={save} disabled={saving || loading}>
            💾 {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </header>

      <div className="page-body">
        {error && (
          <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ color: 'var(--accent-danger)', fontSize: '0.85rem' }}>{error}</div>
          </div>
        )}
        {saveErr && (
          <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ color: 'var(--accent-danger)', fontSize: '0.85rem' }}>Save failed: {saveErr}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>🏢 Organization</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Organization Name
                </label>
                <input
                  value={form.organization?.name ?? ''}
                  onChange={(e) => updateSection('organization', { name: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Tenant Name
                </label>
                <input
                  value={form.tenant?.name ?? ''}
                  onChange={(e) => updateSection('tenant', { name: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>📊 Plan & Limits</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Row label="Plan">
                <span
                  style={{
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {form.plan?.tier ?? '—'}
                </span>
              </Row>
              <Row label="Agent Limit">
                <span style={{ fontWeight: 600 }}>
                  {form.usage?.agents ?? 0} / {form.plan?.agentLimit ?? '∞'}
                </span>
              </Row>
              <Row label="Storage Used">
                <span style={{ fontWeight: 600 }}>
                  {formatBytes(form.usage?.storageBytes)}{' '}
                  {form.plan?.storageQuotaGb ? `/ ${form.plan.storageQuotaGb} GB` : ''}
                </span>
              </Row>
              <Row label="Retention">
                <span style={{ fontWeight: 600 }}>{form.plan?.retention ?? 'Per policy'}</span>
              </Row>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>🔒 Security</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Toggle
                label="Enforce MFA"
                description="Require MFA for all users"
                value={!!form.security?.enforceMfa}
                onChange={(v) => updateSection('security', { enforceMfa: v })}
              />
              <Toggle
                label="Zero-Knowledge Encryption"
                description="Client-side DEK encryption (ZKE)"
                value={!!form.security?.zkeEnabled}
                onChange={(v) => updateSection('security', { zkeEnabled: v })}
              />
              <Toggle
                label="WORM Storage"
                description="Immutable backups (ransomware protection)"
                value={!!form.security?.wormStorage}
                onChange={(v) => updateSection('security', { wormStorage: v })}
              />
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>🔗 API & Integrations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  API Key Prefix
                </label>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <input
                    value={`${form.apiKeyPrefix ?? 'nbk_api_'}••••••••••••••••`}
                    readOnly
                    style={{ ...inputStyle, color: 'var(--text-muted)', fontFamily: 'monospace' }}
                  />
                  <a href="/dashboard/api-keys" className="btn btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                    Manage
                  </a>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Default Webhook URL
                </label>
                <input
                  placeholder="https://your-webhook.com/ninjabackup"
                  value={form.webhookUrl ?? ''}
                  onChange={(e) => update('webhookUrl', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-default)' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{description}</div>
      </div>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: '40px',
          height: '22px',
          borderRadius: '11px',
          background: value ? 'var(--accent-primary)' : 'var(--bg-input)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background var(--transition-fast)',
        }}
      >
        <div
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'white',
            position: 'absolute',
            top: '2px',
            left: value ? '20px' : '2px',
            transition: 'left var(--transition-fast)',
            boxShadow: 'var(--shadow-sm)',
          }}
        />
      </div>
    </label>
  );
}
