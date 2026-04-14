'use client';

export default function SettingsPage() {
  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Tenant and platform configuration</p>
          </div>
          <button className="btn btn-primary">💾 Save Changes</button>
        </div>
      </header>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
          {/* General */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>🏢 Organization</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Organization Name</label>
                <input defaultValue="IT Ninja Ltd" style={{
                  width: '100%', padding: '10px 14px', background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit',
                }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Tenant Name</label>
                <input defaultValue="Production" style={{
                  width: '100%', padding: '10px 14px', background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit',
                }} />
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>📊 Plan & Limits</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Plan</span>
                <span style={{ fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Business Pro</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Agent Limit</span>
                <span style={{ fontWeight: 600 }}>6 / 50</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Storage Quota</span>
                <span style={{ fontWeight: 600 }}>860 GB / 5 TB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Retention</span>
                <span style={{ fontWeight: 600 }}>Unlimited</span>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>🔒 Security</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Enforce MFA</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Require MFA for all users</div>
                </div>
                <div style={{ width: '40px', height: '22px', borderRadius: '11px', background: 'var(--accent-primary)', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: '20px', boxShadow: 'var(--shadow-sm)' }} />
                </div>
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Zero-Knowledge Encryption</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Client-side DEK encryption (ZKE)</div>
                </div>
                <div style={{ width: '40px', height: '22px', borderRadius: '11px', background: 'var(--accent-primary)', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: '20px', boxShadow: 'var(--shadow-sm)' }} />
                </div>
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>WORM Storage</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Immutable backups (ransomware protection)</div>
                </div>
                <div style={{ width: '40px', height: '22px', borderRadius: '11px', background: 'var(--accent-primary)', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: '20px', boxShadow: 'var(--shadow-sm)' }} />
                </div>
              </label>
            </div>
          </div>

          {/* API & Webhooks */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>🔗 API & Integrations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>API Key</label>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <input defaultValue="nbk_api_••••••••••••••••" readOnly style={{
                    flex: 1, padding: '10px 14px', background: 'var(--bg-input)',
                    border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                    color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'monospace',
                  }} />
                  <button className="btn btn-sm btn-secondary">📋 Copy</button>
                  <button className="btn btn-sm btn-danger">🔄 Rotate</button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Webhook URL</label>
                <input placeholder="https://your-webhook.com/ninjabackup" style={{
                  width: '100%', padding: '10px 14px', background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'inherit',
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
