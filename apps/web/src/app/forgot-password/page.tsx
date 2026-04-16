'use client';

import { useState } from 'react';
import { auth } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await auth.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      // For security, the API answers 200 even when the email doesn't exist —
      // so a real error here means a network or 5xx failure.
      setError(err?.message ?? 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px var(--space-md)',
    background: 'var(--bg-input)', border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
    fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: '-150px', right: '-100px', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 60%)',
        borderRadius: '50%', filter: 'blur(60px)',
      }} />

      <div style={{
        width: '100%', maxWidth: '440px', padding: 'var(--space-2xl)',
        background: 'var(--bg-card)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)',
        position: 'relative', boxShadow: 'var(--shadow-lg)',
        animation: 'fadeInUp 0.5s ease',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{
            width: '56px', height: '56px', margin: '0 auto var(--space-md)',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem',
          }}>🔑</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            {sent ? 'Check your email' : 'Reset password'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {sent ? `We sent a reset link to ${email}` : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@company.com" required style={inputStyle} autoFocus />
            </div>
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-danger-glow)', color: 'var(--accent-danger)', fontSize: '0.85rem', marginBottom: 'var(--space-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                ⚠️ {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '0.95rem', opacity: loading ? 0.7 : 1 }}>
              {loading ? '⏳ Sending...' : '📨 Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              padding: '14px', borderRadius: 'var(--radius-md)',
              background: 'var(--accent-success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)',
              color: 'var(--accent-success)', fontSize: '0.88rem', fontWeight: 500,
              marginBottom: 'var(--space-lg)',
            }}>✅ Reset email sent! Check your inbox.</div>
            <button className="btn btn-secondary" onClick={() => setSent(false)} style={{ width: '100%', justifyContent: 'center' }}>
              ↻ Try another email
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Remember your password? <a href="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}
