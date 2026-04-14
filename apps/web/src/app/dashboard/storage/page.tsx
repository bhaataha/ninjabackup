'use client';

import { useState } from 'react';

const VAULTS = [
  { id: '1', name: 'Production S3', type: 'S3', endpoint: 's3.amazonaws.com', bucket: 'ninja-backup-prod', region: 'eu-west-1', usedBytes: '1.8 TB', objectCount: 234567, quotaGb: 5000, usedPercent: 36, immutable: true, versioning: true, lifecycle: { hot: 30, warm: 90 } },
  { id: '2', name: 'Archive B2', type: 'B2', endpoint: 's3.us-west-004.backblazeb2.com', bucket: 'ninja-archive', region: 'us-west', usedBytes: '892 GB', objectCount: 89234, quotaGb: 10000, usedPercent: 9, immutable: false, versioning: true, lifecycle: { hot: 7, warm: 30 } },
  { id: '3', name: 'MinIO Local', type: 'MINIO', endpoint: 'minio.local:9000', bucket: 'dev-backups', region: '-', usedBytes: '234 GB', objectCount: 12345, quotaGb: 2000, usedPercent: 12, immutable: false, versioning: false, lifecycle: { hot: 90, warm: 0 } },
];

const STORAGE_TYPES = [
  { value: 'S3', label: 'Amazon S3', icon: '☁️', color: '#ff9900' },
  { value: 'MINIO', label: 'MinIO', icon: '🗄️', color: '#c72c48' },
  { value: 'B2', label: 'Backblaze B2', icon: '🔥', color: '#e6362e' },
  { value: 'R2', label: 'Cloudflare R2', icon: '🌐', color: '#f6821f' },
  { value: 'WASABI', label: 'Wasabi', icon: '🟢', color: '#56b847' },
  { value: 'LOCAL', label: 'Local Path', icon: '💾', color: '#6366f1' },
];

function getTypeColor(t: string) {
  return STORAGE_TYPES.find(s => s.value === t)?.color || 'var(--accent-primary)';
}

export default function StoragePage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'S3', endpoint: '', bucket: '', region: '', accessKey: '', secretKey: '', immutable: false, versioning: true });

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

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
            <h1 className="page-title">Storage Vaults</h1>
            <p className="page-subtitle">{VAULTS.length} vaults configured</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Vault</button>
        </div>
      </header>

      <div className="page-body">
        {/* Create Vault Form */}
        {showCreate && (
          <div className="card" style={{ marginBottom: 'var(--space-xl)', border: '1px solid var(--border-active)', boxShadow: 'var(--shadow-glow-accent)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>☁️</span> Add Storage Vault
            </h3>

            {/* Storage Type Selector */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Provider</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                {STORAGE_TYPES.map(st => (
                  <button key={st.value} onClick={() => update('type', st.value)} style={{
                    padding: '12px 8px', borderRadius: 'var(--radius-md)', textAlign: 'center',
                    background: form.type === st.value ? `${st.color}15` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${form.type === st.value ? st.color : 'var(--border-glass)'}`,
                    cursor: 'pointer', fontFamily: 'inherit', color: form.type === st.value ? st.color : 'var(--text-secondary)',
                    transition: 'all 150ms',
                  }}>
                    <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{st.icon}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700 }}>{st.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Connection Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Vault Name</label>
                <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Production S3" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Endpoint</label>
                <input type="text" value={form.endpoint} onChange={e => update('endpoint', e.target.value)} placeholder="s3.amazonaws.com" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Bucket</label>
                <input type="text" value={form.bucket} onChange={e => update('bucket', e.target.value)} placeholder="my-backups" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Region</label>
                <input type="text" value={form.region} onChange={e => update('region', e.target.value)} placeholder="eu-west-1" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Access Key</label>
                <input type="text" value={form.accessKey} onChange={e => update('accessKey', e.target.value)} placeholder="AKIA..." style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Secret Key</label>
                <input type="password" value={form.secretKey} onChange={e => update('secretKey', e.target.value)} placeholder="••••••••••" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'flex-end', paddingBottom: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={form.immutable} onChange={e => update('immutable', e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
                  🔒 Immutable
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={form.versioning} onChange={e => update('versioning', e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
                  📚 Versioning
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary">🧪 Test Connection</button>
              <button className="btn btn-primary">💾 Save Vault</button>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)} style={{ marginLeft: 'auto' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Vault Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 'var(--space-lg)' }}>
          {VAULTS.map((vault) => (
            <div key={vault.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{vault.name}</h3>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                      background: `${getTypeColor(vault.type)}20`, color: getTypeColor(vault.type),
                    }}>{vault.type}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{vault.endpoint}</div>
                </div>
              </div>

              {/* Usage Bar */}
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                  <span style={{ fontWeight: 600 }}>{vault.usedBytes}</span>
                  <span style={{ color: 'var(--text-muted)' }}>of {(vault.quotaGb / 1000).toFixed(0)} TB</span>
                </div>
                <div className="progress-bar" style={{ height: '8px' }}>
                  <div className="progress-fill" style={{
                    width: `${vault.usedPercent}%`,
                    background: vault.usedPercent > 80
                      ? 'linear-gradient(90deg, var(--accent-warning), var(--accent-danger))'
                      : `linear-gradient(90deg, ${getTypeColor(vault.type)}, ${getTypeColor(vault.type)}88)`,
                  }}></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{(vault.objectCount / 1000).toFixed(0)}k</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Objects</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{vault.bucket.slice(0, 10)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Bucket</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{vault.region}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Region</div>
                </div>
              </div>

              {/* Security Features */}
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
                {vault.immutable && <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, background: 'var(--accent-success-glow)', color: 'var(--accent-success)' }}>🔒 Immutable</span>}
                {vault.versioning && <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>📚 Versioning</span>}
                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' }}>🔐 AES-256-GCM</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 'var(--space-sm)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-glass)' }}>
                <button className="btn btn-sm btn-secondary" style={{ flex: 1 }}>🧪 Test Connection</button>
                <button className="btn btn-sm btn-secondary">Edit</button>
                <button className="btn btn-sm btn-danger">🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
