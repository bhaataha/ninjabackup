'use client';

import { useEffect, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { settings as settingsApi, tenants, auth } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ErrorBanner } from '@/components/EmptyState';
import { useTheme } from '@/components/ThemeProvider';

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
  const toast = useToast();
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
      toast.success('Settings saved');
    } catch (e: any) {
      try {
        await tenants.updateSettings(form);
        setSavedAt(new Date());
        refetch();
        toast.success('Settings saved');
      } catch (e2: any) {
        const msg = e2?.message ?? e?.message ?? 'Failed to save';
        setSaveErr(msg);
        toast.error('Failed to save settings', msg);
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
        {error && <ErrorBanner message={error} onRetry={refetch} />}
        {saveErr && <ErrorBanner message={`Save failed: ${saveErr}`} />}

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

          <MfaCard />

          <ThemeCard />

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

function MfaCard() {
  const toast = useToast();
  const [step, setStep] = useState<'idle' | 'setup' | 'confirm' | 'enabled'>('idle');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function startSetup() {
    setBusy(true);
    try {
      const r = await auth.setupMfa();
      setSecret(r.secret);
      setQrUrl(r.qrCodeUrl);
      setStep('confirm');
    } catch (e: any) {
      toast.error('Failed to start MFA setup', e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (code.length !== 6) {
      toast.warning('Code must be 6 digits');
      return;
    }
    setBusy(true);
    try {
      await auth.confirmMfa(code);
      setStep('enabled');
      setCode('');
      toast.success('MFA enabled', 'You will be asked for a code on next login.');
    } catch (e: any) {
      toast.error('Invalid code', e?.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>🔐 Two-Factor Authentication</h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
        Adds an extra layer of security. Use any TOTP-compatible app (Google Authenticator, Authy, 1Password).
      </p>

      {step === 'idle' && (
        <button className="btn btn-primary btn-sm" onClick={startSetup} disabled={busy}>
          {busy ? 'Starting…' : '🔐 Set up MFA'}
        </button>
      )}

      {step === 'confirm' && (
        <div>
          {qrUrl && (
            <div style={{ background: 'white', padding: 12, borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: 'var(--space-sm)' }}>
              <img src={qrUrl} alt="MFA QR code" style={{ width: 180, height: 180, display: 'block' }} />
            </div>
          )}
          {secret && (
            <div style={{ marginBottom: 'var(--space-sm)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>Or enter this secret manually:</div>
              <code
                style={{
                  display: 'block',
                  padding: '8px 12px',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                }}
              >
                {secret}
              </code>
            </div>
          )}
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Enter 6-digit code from your app</label>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              style={{ fontFamily: 'monospace', letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.1rem' }}
            />
            <button className="btn btn-primary btn-sm" onClick={confirm} disabled={busy || code.length !== 6}>
              {busy ? 'Verifying…' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {step === 'enabled' && (
        <div style={{ color: 'var(--accent-success)', fontSize: '0.9rem', fontWeight: 600 }}>
          ✓ MFA is now enabled on your account.
        </div>
      )}
    </div>
  );
}

function ThemeCard() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="card">
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>🎨 Appearance</h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
        Choose how the dashboard looks. Stored locally in your browser.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <ThemeOption value="dark" current={theme} onSelect={setTheme} icon="🌙" label="Dark" />
        <ThemeOption value="light" current={theme} onSelect={setTheme} icon="☀️" label="Light" />
      </div>
    </div>
  );
}

function ThemeOption({
  value,
  current,
  onSelect,
  icon,
  label,
}: {
  value: 'dark' | 'light';
  current: 'dark' | 'light';
  onSelect: (t: 'dark' | 'light') => void;
  icon: string;
  label: string;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onSelect(value)}
      style={{
        flex: 1,
        padding: 'var(--space-md)',
        borderRadius: 'var(--radius-md)',
        background: active ? 'var(--accent-glow)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${active ? 'var(--border-active)' : 'var(--border-glass)'}`,
        cursor: 'pointer',
        textAlign: 'center',
        fontFamily: 'inherit',
        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
        fontWeight: active ? 700 : 500,
      }}
    >
      <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: '0.85rem' }}>{label}</div>
    </button>
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
