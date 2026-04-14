'use client';

const POLICIES = [
  { id: '1', name: 'Daily File Backup', type: 'FILE', schedule: '0 2 * * *', scheduleHuman: 'Daily at 02:00', enabled: true, include: ['C:\\Users', 'D:\\Projects'], exclude: ['*.tmp', 'node_modules', '.git'], retention: { daily: 7, weekly: 4, monthly: 12, yearly: 2 }, compression: true, vss: true, agents: 4, storageVault: 'Production S3' },
  { id: '2', name: 'Hourly Critical Files', type: 'FILE', schedule: '0 * * * *', scheduleHuman: 'Every hour', enabled: true, include: ['D:\\Databases', 'D:\\Critical'], exclude: ['*.log'], retention: { daily: 30, weekly: 8, monthly: 12, yearly: 3 }, compression: true, vss: true, agents: 2, storageVault: 'Production S3' },
  { id: '3', name: 'Weekly Image Backup', type: 'IMAGE', schedule: '0 3 * * 0', scheduleHuman: 'Sundays at 03:00', enabled: true, include: ['Full Disk'], exclude: [], retention: { daily: 0, weekly: 4, monthly: 6, yearly: 1 }, compression: true, vss: true, agents: 3, storageVault: 'Archive B2' },
  { id: '4', name: 'Dev Machines Backup', type: 'FILE', schedule: '0 12 * * 1-5', scheduleHuman: 'Weekdays at 12:00', enabled: false, include: ['C:\\Users\\*\\Documents', 'C:\\Users\\*\\Desktop'], exclude: ['*.tmp'], retention: { daily: 5, weekly: 2, monthly: 3, yearly: 0 }, compression: true, vss: false, agents: 0, storageVault: 'MinIO Local' },
];

export default function PoliciesPage() {
  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Backup Policies</h1>
            <p className="page-subtitle">{POLICIES.length} policies configured · {POLICIES.filter((p) => p.enabled).length} active</p>
          </div>
          <button className="btn btn-primary">+ Create Policy</button>
        </div>
      </header>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 'var(--space-lg)' }}>
          {POLICIES.map((policy) => (
            <div key={policy.id} className="card" style={{
              opacity: policy.enabled ? 1 : 0.6,
              borderColor: !policy.enabled ? 'rgba(100, 116, 139, 0.1)' : undefined,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{policy.name}</h3>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                      background: policy.type === 'IMAGE' ? 'var(--accent-glow)' : 'rgba(139, 92, 246, 0.1)',
                      color: policy.type === 'IMAGE' ? 'var(--accent-primary)' : 'var(--accent-purple)',
                    }}>{policy.type}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    🕐 {policy.scheduleHuman} · ☁️ {policy.storageVault}
                  </div>
                </div>
                <div style={{
                  width: '40px', height: '22px', borderRadius: '11px', cursor: 'pointer',
                  background: policy.enabled ? 'var(--accent-primary)' : 'var(--bg-input)',
                  border: `1px solid ${policy.enabled ? 'transparent' : 'var(--border-default)'}`,
                  position: 'relative', transition: 'all var(--transition-fast)',
                }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                    position: 'absolute', top: '1px', left: policy.enabled ? '20px' : '1px',
                    transition: 'all var(--transition-fast)', boxShadow: 'var(--shadow-sm)',
                  }}></div>
                </div>
              </div>

              {/* Include paths */}
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Include</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {policy.include.map((p, i) => (
                    <span key={i} style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem',
                      background: 'var(--accent-success-glow)', color: 'var(--accent-success)',
                      fontFamily: 'monospace',
                    }}>{p}</span>
                  ))}
                </div>
              </div>

              {/* Retention */}
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Retention</div>
                <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '0.8rem' }}>
                  {Object.entries(policy.retention).filter(([, v]) => v > 0).map(([k, v]) => (
                    <div key={k}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{v}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '2px' }}>{k}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-default)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  🖥️ {policy.agents} agents assigned
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button className="btn btn-sm btn-secondary">Edit</button>
                  <button className="btn btn-sm btn-danger">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
