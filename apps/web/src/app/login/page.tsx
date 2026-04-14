'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, setTokens } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMfa, setShowMfa] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await auth.login(email, password);

      if (result.requiresMfa) {
        setShowMfa(true);
        setLoading(false);
        return;
      }

      setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await auth.verifyMfa(mfaCode);
      setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid MFA code');
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px var(--space-md)',
    background: 'var(--bg-input)', border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
    fontSize: '0.9rem', outline: 'none', transition: 'all var(--transition-fast)',
    fontFamily: 'inherit',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute', top: '-200px', left: '-100px', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 60%)',
        borderRadius: '50%', filter: 'blur(60px)', animation: 'float-slow 15s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-150px', right: '-80px', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 60%)',
        borderRadius: '50%', filter: 'blur(60px)', animation: 'float-slow 20s ease-in-out infinite reverse',
      }} />
      <div style={{
        position: 'absolute', top: '30%', right: '20%', width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.04) 0%, transparent 60%)',
        borderRadius: '50%', filter: 'blur(50px)',
      }} />

      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(30px, -20px); }
          66% { transform: translate(-20px, 15px); }
        }
      `}</style>

      <div style={{
        width: '100%', maxWidth: '440px', padding: 'var(--space-2xl)',
        background: 'var(--bg-card)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)',
        position: 'relative', boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
        animation: 'fadeInUp 0.5s ease',
      }}>
        {/* Top highlight line */}
        <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent)' }} />

        {/* Logo + Title */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{
            width: '56px', height: '56px', margin: '0 auto var(--space-md)',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4)',
            backgroundSize: '200% 200%', animation: 'gradient-shift 6s ease infinite',
            borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 900, color: 'white',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
          }}>N</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Welcome back
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Sign in to your NinjaBackup account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            background: 'var(--accent-danger-glow)', color: 'var(--accent-danger)',
            fontSize: '0.85rem', fontWeight: 500, marginBottom: 'var(--space-md)',
            border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px',
            animation: 'fadeInDown 0.2s ease',
          }}>⚠️ {error}</div>
        )}

        {/* Login Form */}
        {!showMfa ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com" required style={inputStyle} autoFocus />
            </div>

            <div style={{ marginBottom: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
                <a href="/forgot-password" style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>Forgot?</a>
              </div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password" required style={inputStyle} />
            </div>

            {/* Remember me */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 'var(--space-md) 0 var(--space-lg)', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <input type="checkbox" style={{ accentColor: 'var(--accent-primary)' }} />
              Remember me for 30 days
            </label>

            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '0.95rem', opacity: loading ? 0.7 : 1 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 'var(--space-lg) 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>or continue with</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
            </div>

            {/* SSO Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                <span style={{ fontSize: '1rem' }}>🔐</span> SSO / SAML
              </button>
              <button type="button" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                <span style={{ fontSize: '1rem' }}>🔑</span> API Key
              </button>
            </div>
          </form>
        ) : (
          /* MFA Form */
          <form onSubmit={handleMfa}>
            <div style={{
              padding: '14px', borderRadius: 'var(--radius-md)',
              background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)',
              marginBottom: 'var(--space-lg)', fontSize: '0.85rem', color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ fontSize: '1.2rem' }}>🔒</span>
              Enter the 6-digit code from your authenticator app
            </div>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <input type="text" value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" required maxLength={6}
                style={{
                  ...inputStyle, textAlign: 'center', fontSize: '2rem', fontWeight: 800,
                  letterSpacing: '0.5em', fontFamily: 'monospace',
                }} autoFocus />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || mfaCode.length !== 6}
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '0.95rem', opacity: (loading || mfaCode.length !== 6) ? 0.5 : 1 }}>
              {loading ? 'Verifying...' : '🔓 Verify & Sign In'}
            </button>

            <button type="button" className="btn btn-secondary"
              onClick={() => { setShowMfa(false); setMfaCode(''); setError(''); }}
              style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-sm)' }}>
              ← Back to login
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Don&apos;t have an account? <a href="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign up</a>
        </p>
      </div>
    </div>
  );
}
