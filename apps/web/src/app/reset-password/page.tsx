'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/api';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError('Reset link is invalid or expired.');
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pwd.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pwd !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await auth.resetPassword(token, pwd);
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px var(--space-md)',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 'var(--space-2xl)',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: '0 auto var(--space-md)',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
            }}
          >
            🔐
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
            {done ? 'Password reset' : 'Choose a new password'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {done ? 'Redirecting to sign in…' : 'Pick a password you have not used elsewhere.'}
          </p>
        </div>

        {!done ? (
          <form onSubmit={submit}>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                New password
              </label>
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required minLength={8} autoFocus style={inputStyle} />
            </div>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Confirm password
              </label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} style={inputStyle} />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-danger-glow)',
                  color: 'var(--accent-danger)',
                  fontSize: '0.85rem',
                  marginBottom: 'var(--space-md)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !token}
              style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: '0.95rem', opacity: loading || !token ? 0.7 : 1 }}
            >
              {loading ? '⏳ Saving…' : '🔐 Reset Password'}
            </button>
          </form>
        ) : (
          <div
            style={{
              padding: 14,
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-success-glow)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: 'var(--accent-success)',
              fontSize: '0.88rem',
              textAlign: 'center',
            }}
          >
            ✅ Password updated successfully.
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <a href="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
