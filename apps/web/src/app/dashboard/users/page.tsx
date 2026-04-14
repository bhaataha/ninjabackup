'use client';

const USERS = [
  { id: '1', email: 'admin@company.com', firstName: 'David', lastName: 'Cohen', role: 'OWNER', mfaEnabled: true, lastLogin: '2026-04-14T08:00:00Z', active: true },
  { id: '2', email: 'ops@company.com', firstName: 'Sarah', lastName: 'Levi', role: 'ADMIN', mfaEnabled: true, lastLogin: '2026-04-14T07:30:00Z', active: true },
  { id: '3', email: 'tech@company.com', firstName: 'Yossi', lastName: 'Ben-Ari', role: 'OPERATOR', mfaEnabled: false, lastLogin: '2026-04-13T16:00:00Z', active: true },
  { id: '4', email: 'viewer@company.com', firstName: 'Maya', lastName: 'Friedman', role: 'VIEWER', mfaEnabled: false, lastLogin: '2026-04-10T09:00:00Z', active: true },
  { id: '5', email: 'old-admin@company.com', firstName: 'Avi', lastName: 'Katz', role: 'ADMIN', mfaEnabled: false, lastLogin: '2026-03-01T12:00:00Z', active: false },
];

function getRoleStyle(role: string) {
  switch (role) {
    case 'OWNER': return { bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.1))', color: '#f59e0b', label: '👑 Owner' };
    case 'ADMIN': return { bg: 'var(--accent-glow)', color: 'var(--accent-primary)', label: '🛡️ Admin' };
    case 'OPERATOR': return { bg: 'var(--accent-success-glow)', color: 'var(--accent-success)', label: '🔧 Operator' };
    default: return { bg: 'rgba(100,116,139,0.1)', color: 'var(--text-muted)', label: '👁️ Viewer' };
  }
}

export default function UsersPage() {
  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Users</h1>
            <p className="page-subtitle">{USERS.filter((u) => u.active).length} active users</p>
          </div>
          <button className="btn btn-primary">+ Invite User</button>
        </div>
      </header>

      <div className="page-body">
        <div className="table-container">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>MFA</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {USERS.map((user) => {
                const roleStyle = getRoleStyle(user.role);
                return (
                  <tr key={user.id} style={{ opacity: user.active ? 1 : 0.5 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-purple))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.8rem', color: 'white',
                        }}>{user.firstName[0]}{user.lastName[0]}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.firstName} {user.lastName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem',
                        fontWeight: 600, background: roleStyle.bg, color: roleStyle.color,
                      }}>{roleStyle.label}</span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.8rem', fontWeight: 600,
                        color: user.mfaEnabled ? 'var(--accent-success)' : 'var(--accent-danger)',
                      }}>
                        {user.mfaEnabled ? '🔐 Enabled' : '⚠️ Disabled'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(user.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td><span className={`status-badge ${user.active ? 'online' : 'offline'}`}>{user.active ? 'Active' : 'Deactivated'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-sm btn-secondary">Edit</button>
                        {user.role !== 'OWNER' && (
                          <button className="btn btn-sm btn-danger">Disable</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
