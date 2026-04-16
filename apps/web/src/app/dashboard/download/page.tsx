'use client';

import { useState, useMemo } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { installer as installerApi, agents as agentsApi } from '@/lib/api';
import { useToast } from '@/components/Toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3038/api/v1';

type Installer = {
  platform: string;
  arch: string;
  version: string;
  url: string;
  sha256: string;
  sizeBytes: number;
};

const PLATFORM_META: Record<string, { icon: string; color: string; oneLiner: (apiBase: string, token: string) => string }> = {
  windows: {
    icon: '🪟',
    color: '#3b82f6',
    oneLiner: (apiBase, token) =>
      token
        ? `iex ((Invoke-WebRequest "${apiBase}/installer/install.sh?platform=windows&token=${token}").Content)`
        : '# Generate a token first',
  },
  linux: {
    icon: '🐧',
    color: '#f59e0b',
    oneLiner: (apiBase, token) =>
      token
        ? `curl -fsSL "${apiBase}/installer/install.sh?platform=linux&token=${token}" | sudo sh`
        : '# Generate a token first',
  },
  macos: {
    icon: '🍎',
    color: '#8b5cf6',
    oneLiner: (apiBase, token) =>
      token
        ? `curl -fsSL "${apiBase}/installer/install.sh?platform=macos&token=${token}" | sudo sh`
        : '# Generate a token first',
  },
};

function formatBytes(b: number) {
  if (!b) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function DownloadPage() {
  const { data: installersData, loading, error } = useFetch<Installer[]>(() => installerApi.list() as Promise<Installer[]>);
  const [selected, setSelected] = useState<'windows' | 'linux' | 'macos'>('windows');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);

  const installers = installersData ?? [];

  const grouped = useMemo(() => {
    const m = new Map<string, Installer[]>();
    for (const i of installers) {
      const list = m.get(i.platform.toLowerCase()) ?? [];
      list.push(i);
      m.set(i.platform.toLowerCase(), list);
    }
    return m;
  }, [installers]);

  const platforms = Array.from(grouped.keys());
  const current = grouped.get(selected) ?? [];
  const meta = PLATFORM_META[selected];
  const toast = useToast();

  async function generateToken() {
    setTokenLoading(true);
    try {
      const r = await agentsApi.createToken();
      setToken(r.token);
      setShowToken(true);
      toast.success('Registration token generated', 'Expires in 24 hours.');
    } catch (e: any) {
      toast.error('Failed to generate token', e?.message ?? 'unknown');
    } finally {
      setTokenLoading(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Download Agent</h1>
            <p className="page-subtitle">Install the backup agent on your machines</p>
          </div>
        </div>
      </header>

      <div className="page-body">
        {error && (
          <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ color: 'var(--accent-danger)', fontSize: '0.85rem' }}>{error}</div>
          </div>
        )}

        {loading && installers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>Loading installers…</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
              {(platforms.length > 0 ? platforms : ['windows', 'linux', 'macos']).map((p) => {
                const m = PLATFORM_META[p];
                if (!m) return null;
                const archs = (grouped.get(p) ?? []).map((i) => i.arch).join(' / ') || 'x64';
                return (
                  <button
                    key={p}
                    onClick={() => setSelected(p as any)}
                    className="card"
                    style={{
                      flex: 1,
                      cursor: 'pointer',
                      textAlign: 'center',
                      borderColor: selected === p ? m.color : undefined,
                      boxShadow: selected === p ? `0 0 24px ${m.color}15, inset 0 0 16px ${m.color}08` : undefined,
                      transition: 'all var(--transition-base)',
                    }}
                  >
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{m.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>{p}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{archs}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="card">
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>
                  {meta?.icon} {selected.charAt(0).toUpperCase() + selected.slice(1)} Agent
                </h3>

                {current.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No installer available for this platform yet. Build artifacts will appear here once the CI pipeline publishes them.
                  </div>
                ) : (
                  current.map((inst) => (
                    <div key={inst.arch + inst.url} style={{ marginBottom: 'var(--space-md)' }}>
                      <a
                        href={inst.url}
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '0.95rem', textDecoration: 'none', display: 'block' }}
                      >
                        ⬇️ Download {inst.arch} ({formatBytes(inst.sizeBytes)})
                      </a>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Version v{inst.version}
                      </div>
                      <code
                        style={{
                          display: 'block',
                          padding: '8px',
                          background: 'var(--bg-input)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.7rem',
                          wordBreak: 'break-all',
                          fontFamily: 'monospace',
                          border: '1px solid var(--border-glass)',
                          marginTop: '6px',
                        }}
                      >
                        sha256: {inst.sha256}
                      </code>
                    </div>
                  ))
                )}
              </div>

              <div className="card">
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>🔑 Registration Token</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
                  Generate a one-time token to register the agent with this tenant. Tokens expire in 24 hours.
                </p>

                {showToken ? (
                  <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <div
                      style={{
                        padding: '14px',
                        background: 'var(--bg-input)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-active)',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--accent-primary)',
                        wordBreak: 'break-all',
                      }}
                    >
                      {token}
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 'var(--space-sm)', width: '100%', justifyContent: 'center' }}
                      onClick={() => navigator.clipboard.writeText(token)}
                    >
                      📋 Copy Token
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={generateToken}
                    disabled={tokenLoading}
                    style={{ width: '100%', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}
                  >
                    🔑 {tokenLoading ? 'Generating…' : 'Generate Token'}
                  </button>
                )}
              </div>
            </div>

            {meta && (
              <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-md)', textTransform: 'capitalize' }}>
                  ⚡ One-Liner Install — {selected}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                  {token
                    ? 'Paste this into a terminal on the target machine. The agent will be downloaded, registered, and installed as a system service.'
                    : 'Generate a registration token first, then this command will be filled in with your token.'}
                </p>
                <div style={{ position: 'relative' }}>
                  <code
                    style={{
                      display: 'block',
                      padding: 'var(--space-md) var(--space-md) var(--space-md) var(--space-md)',
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace',
                      color: token ? '#06b6d4' : 'var(--text-muted)',
                      border: '1px solid var(--border-active)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      lineHeight: 1.6,
                    }}
                  >
                    {meta.oneLiner(API_BASE, token)}
                  </code>
                  {token && (
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ position: 'absolute', top: '8px', right: '8px' }}
                      onClick={() => navigator.clipboard.writeText(meta.oneLiner(API_BASE, token))}
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
