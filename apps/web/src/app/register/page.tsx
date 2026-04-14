'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, setTokens } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', organizationName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await auth.register(form);
      setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px var(--space-md)', background: 'var(--bg-input)',
    border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
    transition: 'all var(--transition-fast)', fontFamily: 'inherit',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'absolute', top: '-150px', right: '-100px', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 60%)',
        borderRadius: '50%', filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-200px', left: '-100px', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 60%)',
        borderRadius: '50%', filter: 'blur(60px)',
      }} />

      <div style={{
        width: '100%', maxWidth: '480px', padding: 'var(--space-2xl)',
        background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-xl)', position: 'relative',
        boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{
            width: '56px', height: '56px', margin: '0 auto var(--space-md)',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4)',
            backgroundSize: '200% 200%', animation: 'gradient-shift 6s ease infinite',
            borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 800, color: 'white',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
          }}>N</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.02em' }}>Create Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Start protecting your infrastructure</p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            background: 'var(--accent-danger-glow)', color: 'var(--accent-danger)',
            fontSize: '0.85rem', fontWeight: 500, marginBottom: 'var(--space-md)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}>⚠️ {error}</div>
        )}

        <form onSubmit={handleRegister}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>First Name</label>
              <input type="text" value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="David" required style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Last Name</label>
              <input type="text" value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Cohen" required style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Organization</label>
            <input type="text" value={form.organizationName} onChange={e => update('organizationName', e.target.value)} placeholder="Acme Corp" required style={inputStyle} />
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="admin@company.com" required style={inputStyle} />
          </div>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Password</label>
            <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min 8 characters" required minLength={8} style={inputStyle} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '0.95rem', opacity: loading ? 0.7 : 1 }}>
            {loading ? '⏳ Creating...' : '🚀 Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Already have an account? <a href="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}
