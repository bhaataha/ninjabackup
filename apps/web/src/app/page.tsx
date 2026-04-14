import Link from 'next/link';

const FEATURES = [
  { icon: '📦', title: 'File Backup', desc: 'Incremental, deduplicated backups powered by Restic with S3 support' },
  { icon: '💿', title: 'Image Backup', desc: 'Full disk snapshots with Windows VSS for zero-downtime captures' },
  { icon: '🔐', title: 'Zero-Knowledge', desc: 'Client-side AES-256-GCM encryption — your data stays your data' },
  { icon: '♻️', title: 'Instant Restore', desc: 'File-level browsing with point-in-time recovery from any snapshot' },
  { icon: '🌐', title: 'Multi-Tenant', desc: 'Built for MSPs — manage hundreds of clients from one dashboard' },
  { icon: '📡', title: 'Real-Time', desc: 'WebSocket-powered live monitoring of all backup jobs and agents' },
];

const STATS = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '256-bit', label: 'AES Encryption' },
  { value: '<8MB', label: 'Agent Size' },
  { value: '3', label: 'Platforms' },
];

export default function LandingPage() {
  return (
    <div style={{ background: '#060a13', color: '#f1f5f9', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      {/* Animated background */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 800px 600px at 30% 20%, rgba(59, 130, 246, 0.06) 0%, transparent 60%),
          radial-gradient(ellipse 600px 500px at 70% 70%, rgba(139, 92, 246, 0.04) 0%, transparent 60%),
          radial-gradient(ellipse 500px 400px at 50% 50%, rgba(6, 182, 212, 0.03) 0%, transparent 60%)
        `,
      }} />

      {/* Nav */}
      <nav style={{
        padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, color: 'white', fontSize: '1rem',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
          }}>N</div>
          <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>NinjaBackup</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/login" style={{
            padding: '10px 20px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600,
            color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none',
            transition: 'all 150ms',
          }}>Sign In</Link>
          <Link href="/register" style={{
            padding: '10px 24px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)', transition: 'all 150ms',
          }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        textAlign: 'center', padding: '80px 40px 60px', position: 'relative', zIndex: 1,
        maxWidth: '900px', margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-flex', padding: '6px 16px', borderRadius: '99px', marginBottom: '24px',
          background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)',
          fontSize: '0.78rem', fontWeight: 600, color: '#3b82f6',
        }}>
          🥷 Enterprise Backup Platform — Now Open Source
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, lineHeight: 1.1,
          letterSpacing: '-0.04em', marginBottom: '24px',
          background: 'linear-gradient(135deg, #f1f5f9 30%, #3b82f6 70%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Backup Everything.
          <br />Trust Nothing.
        </h1>

        <p style={{
          fontSize: '1.15rem', color: '#64748b', maxWidth: '600px', margin: '0 auto 40px',
          lineHeight: 1.7,
        }}>
          Zero-knowledge encrypted backups for Windows, Linux, and macOS.
          Multi-tenant dashboard. Lightweight agent. S3 storage.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            padding: '14px 32px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
            transition: 'all 150ms',
          }}>🚀 Start Free</Link>
          <a href="https://github.com" style={{
            padding: '14px 32px', borderRadius: '12px', fontSize: '1rem', fontWeight: 600,
            background: 'rgba(255,255,255,0.04)', color: '#94a3b8', textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.08)', transition: 'all 150ms',
          }}>⭐ GitHub</a>
        </div>
      </section>

      {/* Stats */}
      <section style={{
        display: 'flex', justifyContent: 'center', gap: '48px', padding: '40px',
        maxWidth: '800px', margin: '0 auto', flexWrap: 'wrap',
      }}>
        {STATS.map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#f1f5f9' }}>{s.value}</div>
            <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section style={{ padding: '60px 40px', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '48px' }}>
          Everything you need. Nothing you don&lsquo;t.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              padding: '28px', borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(8px)', transition: 'all 250ms',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)' }} />
              <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.01em' }}>{f.title}</h3>
              <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        textAlign: 'center', padding: '80px 40px', margin: '40px auto', maxWidth: '800px',
        background: 'rgba(59, 130, 246, 0.04)', borderRadius: '24px',
        border: '1px solid rgba(59, 130, 246, 0.1)',
      }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '16px' }}>
          Ready to protect your data?
        </h2>
        <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '32px' }}>
          Deploy in minutes. Free for up to 5 agents.
        </p>
        <Link href="/register" style={{
          display: 'inline-block', padding: '14px 40px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700,
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', textDecoration: 'none',
          boxShadow: '0 8px 32px rgba(59, 130, 246, 0.35)',
        }}>Get Started for Free →</Link>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px', textAlign: 'center', fontSize: '0.8rem', color: '#475569',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        © 2026 NinjaBackup · Built with ❤️ by IT Ninja
      </footer>
    </div>
  );
}
