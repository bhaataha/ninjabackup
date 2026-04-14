'use client';

import { useState } from 'react';

const PLATFORMS = [
  {
    os: 'Windows',
    icon: '🪟',
    arch: ['x64'],
    size: '8.3 MB',
    installer: 'NinjaBackup-Agent-Setup-1.0.0.exe',
    color: '#3b82f6',
    instructions: [
      'Download and run the installer',
      'Enter your server URL and registration token',
      'The agent will install as a Windows service and start automatically',
    ],
  },
  {
    os: 'Linux',
    icon: '🐧',
    arch: ['x64', 'arm64'],
    size: '7.1 MB',
    installer: 'ninjabackup-agent-1.0.0-linux',
    color: '#f59e0b',
    instructions: [
      'Download the binary: curl -LO https://...',
      'chmod +x ninjabackup-agent && sudo mv ninjabackup-agent /usr/local/bin/',
      'Register: sudo ninjabackup-agent --register TOKEN --server URL',
      'Install: sudo ninjabackup-agent --install',
    ],
  },
  {
    os: 'macOS',
    icon: '🍎',
    arch: ['arm64 (Apple Silicon)', 'x64 (Intel)'],
    size: '7.8 MB',
    installer: 'ninjabackup-agent-1.0.0-darwin',
    color: '#8b5cf6',
    instructions: [
      'Download the binary for your architecture',
      'chmod +x ninjabackup-agent && sudo mv ninjabackup-agent /usr/local/bin/',
      'Register: sudo ninjabackup-agent --register TOKEN --server URL',
      'Install: sudo ninjabackup-agent --install',
    ],
  },
];

export default function DownloadPage() {
  const [selected, setSelected] = useState('Windows');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  const platform = PLATFORMS.find(p => p.os === selected)!;

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const token = Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setToken(token);
    setShowToken(true);
  };

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
        {/* Platform Selector */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
          {PLATFORMS.map(p => (
            <button
              key={p.os}
              onClick={() => setSelected(p.os)}
              className="card"
              style={{
                flex: 1, cursor: 'pointer', textAlign: 'center',
                borderColor: selected === p.os ? p.color : undefined,
                boxShadow: selected === p.os ? `0 0 24px ${p.color}15, inset 0 0 16px ${p.color}08` : undefined,
                transition: 'all var(--transition-base)',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{p.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{p.os}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{p.arch.join(' / ')}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{p.size}</div>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
          {/* Download Card */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.3rem' }}>{platform.icon}</span>
              {platform.os} Agent v1.0.0
            </h3>

            <button className="btn btn-primary" style={{
              width: '100%', justifyContent: 'center', padding: '16px', fontSize: '1rem', marginBottom: 'var(--space-lg)',
            }}>
              ⬇️ Download {platform.installer}
            </button>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>SHA-256 Checksum:</div>
              <code style={{
                display: 'block', padding: '10px', background: 'var(--bg-input)',
                borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', wordBreak: 'break-all',
                fontFamily: 'monospace', border: '1px solid var(--border-glass)',
              }}>
                e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </code>
            </div>
          </div>

          {/* Registration Token */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>🔑 Registration Token</h3>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
              Generate a one-time token to register the agent with this tenant. The token expires in 24 hours.
            </p>

            {showToken ? (
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{
                  padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-active)', fontFamily: 'monospace', fontSize: '0.85rem',
                  fontWeight: 600, color: 'var(--accent-primary)', letterSpacing: '0.02em',
                  wordBreak: 'break-all',
                }}>{token}</div>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-sm)', width: '100%', justifyContent: 'center' }}
                  onClick={() => navigator.clipboard.writeText(token)}>
                  📋 Copy Token
                </button>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={generateToken} style={{ width: '100%', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}>
                🔑 Generate Token
              </button>
            )}
          </div>
        </div>

        {/* Installation Steps */}
        <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>📋 Installation Steps — {platform.os}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {platform.instructions.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: 'var(--accent-glow)', border: '1px solid var(--border-active)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.75rem', color: 'var(--accent-primary)',
                }}>{i + 1}</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', paddingTop: '4px', lineHeight: 1.5 }}>
                  {step.includes(':') && step.includes('--') ? (
                    <>
                      {step.split(':')[0]}:
                      <code style={{
                        display: 'block', marginTop: '6px', padding: '8px 12px',
                        background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--accent-cyan, #06b6d4)',
                        border: '1px solid var(--border-glass)',
                      }}>{step.split(':').slice(1).join(':').trim()}</code>
                    </>
                  ) : step}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
