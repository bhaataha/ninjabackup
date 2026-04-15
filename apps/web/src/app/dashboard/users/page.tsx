'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { users as usersApi } from '@/lib/api';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';
  mfaEnabled?: boolean;
  lastLogin?: string;
  active?: boolean;
};

function getRoleStyle(role: string) {
  switch (role) {
    case 'OWNER':
      return {
        bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.1))',
        color: '#f59e0b',
        label: '👑 Owner',
      };
    case 'ADMIN':
      return { bg: 'var(--accent-glow)', color: 'var(--accent-primary)', label: '🛡️ Admin' };
    case 'OPERATOR':
      return { bg: 'var(--accent-success-glow)', color: 'var(--accent-success)', label: '🔧 Operator' };
    default:
      return { bg: 'rgba(100,116,139,0.1)', color: 'var(--text-muted)', label: '👁️ Viewer' };
  }
}

export default function UsersPage() {
  const { data, loading, error, refetch } = useFetch<User[]>(() => usersApi.list() as Promise<User[]>);
  const [showInvite, setShowInvite] = useState(false);

  const users = data ?? [];

  async function disable(id: string) {
    if (!confirm('Disable this user?')) return;
    await usersApi.update(id, { active: false });
    refetch();
  }

  async function enable(id: string) {
    await usersApi.update(id, { active: true });
    refetch();
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Users</h1>
            <p className="page-subtitle">{loading ? 'Loading…' : `${users.filter((u) => u.active !== false).length} active users`}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            + Invite User
          </button>
        </div>
      </header>

      <div className="page-body">
        {error && (
          <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ color: 'var(--accent-danger)', fontSize: '0.85rem' }}>{error}</div>
          </div>
        )}

        {!loading && users.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>No users yet</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>MFA</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roleStyle = getRoleStyle(user.role);
                  return (
                    <tr key={user.id} style={{ opacity: user.active === false ? 0.5 : 1 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-purple))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              color: 'white',
                            }}
                          >
                            {user.firstName?.[0]}
                            {user.lastName?.[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {user.firstName} {user.lastName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, background: roleStyle.bg, color: roleStyle.color }}>
                          {roleStyle.label}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: user.mfaEnabled ? 'var(--accent-success)' : 'var(--accent-danger)',
                          }}
                        >
                          {user.mfaEnabled ? '🔐 Enabled' : '⚠️ Disabled'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Never'}
                      </td>
                      <td>
                        <span className={`status-badge ${user.active !== false ? 'online' : 'offline'}`}>
                          {user.active !== false ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {user.role !== 'OWNER' && (
                            <button
                              className={`btn btn-sm ${user.active === false ? 'btn-secondary' : 'btn-danger'}`}
                              onClick={() => (user.active === false ? enable(user.id) : disable(user.id))}
                            >
                              {user.active === false ? 'Enable' : 'Disable'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onCreated={() => { setShowInvite(false); refetch(); }} />}
    </>
  );
}

function InviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await usersApi.create({ email, firstName, lastName, role });
      onCreated();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to invite user');
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
      <div className="card" style={{ maxWidth: 480, width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>Invite User</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <input className="input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <input className="input" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="VIEWER">Viewer — read-only</option>
            <option value="OPERATOR">Operator — trigger backups & restores</option>
            <option value="ADMIN">Admin — manage policies & users</option>
          </select>
        </div>
        {err && <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginTop: 'var(--space-sm)' }}>{err}</div>}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
          <button className="btn btn-sm btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-sm btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}
