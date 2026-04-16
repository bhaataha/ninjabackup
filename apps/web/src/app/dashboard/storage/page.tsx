'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { storage as storageApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Badge } from '@/components/Badge';
import { CardGridSkeleton } from '@/components/Skeleton';
import { EmptyState, ErrorBanner } from '@/components/EmptyState';
import { useT } from '@/components/LocaleProvider';

type Vault = {
  id: string;
  name: string;
  type: 'S3' | 'MINIO' | 'B2' | 'R2' | 'WASABI' | 'LOCAL';
  endpoint?: string;
  bucket: string;
  region?: string;
  usedBytes?: number;
  objectCount?: number;
  quotaGb?: number;
  immutable?: boolean;
  versioning?: boolean;
};

const STORAGE_TYPES = [
  { value: 'S3', label: 'Amazon S3', icon: '☁️', color: '#ff9900' },
  { value: 'MINIO', label: 'MinIO', icon: '🗄️', color: '#c72c48' },
  { value: 'B2', label: 'Backblaze B2', icon: '🔥', color: '#e6362e' },
  { value: 'R2', label: 'Cloudflare R2', icon: '🌐', color: '#f6821f' },
  { value: 'WASABI', label: 'Wasabi', icon: '🟢', color: '#56b847' },
  { value: 'LOCAL', label: 'Local Path', icon: '💾', color: '#6366f1' },
];

function getTypeColor(t: string) {
  return STORAGE_TYPES.find((s) => s.value === t)?.color || 'var(--accent-primary)';
}

function formatBytes(b?: number) {
  if (!b || b === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function StoragePage() {
  const toast = useToast();
  const t = useT();
  const { data, loading, error, refetch } = useFetch<Vault[]>(() => storageApi.list() as Promise<Vault[]>);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'S3',
    endpoint: '',
    bucket: '',
    region: '',
    accessKey: '',
    secretKey: '',
    immutable: false,
    versioning: true,
  });
  const [busy, setBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const vaults = data ?? [];

  const update = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

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

  async function save() {
    setBusy(true);
    setCreateErr(null);
    try {
      await storageApi.create(form);
      setShowCreate(false);
      setForm({ name: '', type: 'S3', endpoint: '', bucket: '', region: '', accessKey: '', secretKey: '', immutable: false, versioning: true });
      refetch();
      toast.success('Storage vault created', form.name);
    } catch (e: any) {
      setCreateErr(e?.message ?? 'Failed to create vault');
      toast.error('Failed to create vault', e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function testConnection(id: string) {
    try {
      const r = await storageApi.testConnection(id);
      if (r.success) {
        toast.success('Connection successful', `Latency ${r.latencyMs}ms`);
      } else {
        toast.error('Connection failed');
      }
    } catch (e: any) {
      toast.error('Connection failed', e?.message);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this vault? Backups already stored will remain in the bucket.')) return;
    try {
      await storageApi.delete(id);
      refetch();
      toast.success('Vault deleted');
    } catch (e: any) {
      toast.error('Failed to delete vault', e?.message);
    }
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">{t('Storage Vaults', 'אחסון')}</h1>
            <p className="page-subtitle">
              {loading ? t('Loading…', 'טוען…') : t(`${vaults.length} vaults configured`, `${vaults.length} כספות מוגדרות`)}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + {t('Add Vault', 'הוסף כספת')}
          </button>
        </div>
      </header>

      <div className="page-body">
        {error && <ErrorBanner message={error} onRetry={refetch} />}

        {showCreate && (
          <div
            className="card"
            style={{ marginBottom: 'var(--space-xl)', border: '1px solid var(--border-active)', boxShadow: 'var(--shadow-glow-accent)' }}
          >
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>☁️</span> Add Storage Vault
            </h3>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Provider
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                {STORAGE_TYPES.map((st) => (
                  <button
                    key={st.value}
                    onClick={() => update('type', st.value)}
                    style={{
                      padding: '12px 8px',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center',
                      background: form.type === st.value ? `${st.color}15` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${form.type === st.value ? st.color : 'var(--border-glass)'}`,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      color: form.type === st.value ? st.color : 'var(--text-secondary)',
                      transition: 'all 150ms',
                    }}
                  >
                    <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{st.icon}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700 }}>{st.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Vault Name</label>
                <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Production S3" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Endpoint</label>
                <input type="url" value={form.endpoint} onChange={(e) => update('endpoint', e.target.value)} placeholder="https://s3.amazonaws.com" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Bucket</label>
                <input type="text" value={form.bucket} onChange={(e) => update('bucket', e.target.value)} placeholder="my-backups" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Region</label>
                <input type="text" value={form.region} onChange={(e) => update('region', e.target.value)} placeholder="eu-west-1" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Access Key</label>
                <input type="text" value={form.accessKey} onChange={(e) => update('accessKey', e.target.value)} placeholder="AKIA..." style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Secret Key</label>
                <input
                  type="password"
                  value={form.secretKey}
                  onChange={(e) => update('secretKey', e.target.value)}
                  placeholder="••••••••••"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'flex-end', paddingBottom: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>
                  <input type="checkbox" checked={form.immutable} onChange={(e) => update('immutable', e.target.checked)} />
                  🔒 Immutable
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>
                  <input type="checkbox" checked={form.versioning} onChange={(e) => update('versioning', e.target.checked)} />
                  📚 Versioning
                </label>
              </div>
            </div>

            {createErr && <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: 'var(--space-sm)' }}>{createErr}</div>}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={save} disabled={busy}>
                💾 {busy ? 'Saving…' : 'Save Vault'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)} style={{ marginLeft: 'auto' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading && vaults.length === 0 && !showCreate ? (
          <CardGridSkeleton cards={3} minWidth={380} />
        ) : !loading && vaults.length === 0 && !showCreate ? (
          <EmptyState
            icon="☁️"
            title="No storage vaults configured"
            description="Add an S3-compatible bucket (AWS, MinIO, B2, R2, Wasabi, or local) to start storing encrypted backups."
            cta={{ label: '+ Add Vault', onClick: () => setShowCreate(true) }}
          />
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 'var(--space-lg)' }}>
          {vaults.map((vault) => {
            const usedPercent = vault.quotaGb ? Math.round(((vault.usedBytes ?? 0) / 1024 / 1024 / 1024 / vault.quotaGb) * 100) : 0;
            return (
              <div key={vault.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{vault.name}</h3>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: `${getTypeColor(vault.type)}20`,
                          color: getTypeColor(vault.type),
                        }}
                      >
                        {vault.type}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{vault.endpoint ?? '—'}</div>
                  </div>
                </div>

                {vault.quotaGb && (
                  <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 600 }}>{formatBytes(vault.usedBytes)}</span>
                      <span style={{ color: 'var(--text-muted)' }}>of {(vault.quotaGb / 1000).toFixed(0)} TB</span>
                    </div>
                    <div className="progress-bar" style={{ height: '8px' }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${usedPercent}%`,
                          background:
                            usedPercent > 80
                              ? 'linear-gradient(90deg, var(--accent-warning), var(--accent-danger))'
                              : `linear-gradient(90deg, ${getTypeColor(vault.type)}, ${getTypeColor(vault.type)}88)`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                  <Stat label="Objects" value={vault.objectCount ? `${(vault.objectCount / 1000).toFixed(0)}k` : '—'} />
                  <Stat label="Bucket" value={vault.bucket.slice(0, 12)} />
                  <Stat label="Region" value={vault.region ?? '—'} />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
                  {vault.immutable && (
                    <Badge tone="success" size="xs">
                      🔒 Immutable
                    </Badge>
                  )}
                  {vault.versioning && (
                    <Badge tone="primary" size="xs">
                      📚 Versioning
                    </Badge>
                  )}
                  <Badge tone="purple" size="xs">
                    🔐 AES-256-GCM
                  </Badge>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-glass)' }}>
                  <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => testConnection(vault.id)}>
                    🧪 Test Connection
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(vault.id)}>
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '8px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-glass)',
      }}
    >
      <div style={{ fontSize: '1rem', fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

