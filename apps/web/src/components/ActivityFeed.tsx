'use client';

import { useState, useEffect } from 'react';

// Simulated real-time activity feed (will use WebSocket in production)
const INITIAL_FEED = [
  { type: 'backup', icon: '✅', message: 'DESKTOP-HR01 backup completed', detail: '14.6 GB in 8m', time: Date.now() - 60000 * 2 },
  { type: 'agent', icon: '🟢', message: 'SRV-DC01 started backing up', detail: 'Daily File Backup', time: Date.now() - 60000 * 5 },
  { type: 'alert', icon: '🔴', message: 'SRV-FILE01 backup failed', detail: 'S3 connection timeout', time: Date.now() - 60000 * 15 },
  { type: 'agent', icon: '🔵', message: 'DEV-LINUX01 came online', detail: 'Ubuntu 22.04 LTS', time: Date.now() - 60000 * 30 },
  { type: 'backup', icon: '✅', message: 'DESKTOP-DEV03 backup completed', detail: '50.0 GB in 15m', time: Date.now() - 60000 * 45 },
  { type: 'backup', icon: '✅', message: 'DEV-LINUX01 image backup completed', detail: '80.0 GB in 52m', time: Date.now() - 60000 * 60 },
  { type: 'agent', icon: '🔴', message: 'LAPTOP-CEO went offline', detail: 'Last seen 2 days ago', time: Date.now() - 60000 * 120 },
  { type: 'security', icon: '🔐', message: 'admin@company.com logged in', detail: '192.168.1.100', time: Date.now() - 60000 * 130 },
  { type: 'config', icon: '📋', message: 'Policy "Daily File Backup" updated', detail: 'By Sarah Levi', time: Date.now() - 60000 * 180 },
  { type: 'security', icon: '🔑', message: 'New agent token generated', detail: 'By David Cohen', time: Date.now() - 60000 * 200 },
];

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getTypeColor(type: string) {
  const map: Record<string, string> = {
    backup: 'var(--accent-success)',
    agent: 'var(--accent-primary)',
    alert: 'var(--accent-danger)',
    security: 'var(--accent-warning)',
    config: 'var(--accent-purple)',
  };
  return map[type] || 'var(--text-muted)';
}

export default function ActivityFeed() {
  const [feed, setFeed] = useState(INITIAL_FEED);
  const [, setTick] = useState(0);

  // Update relative times every 30s
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Simulate new events arriving
  useEffect(() => {
    const timer = setInterval(() => {
      const events = [
        { type: 'agent', icon: '💓', message: 'SRV-DC01 heartbeat received', detail: 'v1.0.0' },
        { type: 'backup', icon: '📦', message: 'SRV-DC01 backup progress: 72%', detail: '86.3 GB processed' },
        { type: 'agent', icon: '💓', message: 'DEV-LINUX01 heartbeat received', detail: 'v1.0.0' },
      ];
      const newEvent = { ...events[Math.floor(Math.random() * events.length)], time: Date.now() };
      setFeed((prev) => [newEvent, ...prev.slice(0, 19)]);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header" style={{ marginBottom: 'var(--space-md)' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: 'var(--accent-success)', display: 'inline-block',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          Live Activity
        </h2>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: '2px',
        maxHeight: '400px', overflowY: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--border-default) transparent',
      }}>
        {feed.map((event, i) => (
          <div
            key={`${event.time}-${i}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              transition: 'background var(--transition-fast)',
              animation: i === 0 ? 'fadeInDown 0.3s ease' : undefined,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{event.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 500, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{event.message}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{event.detail}</div>
            </div>
            <div style={{
              fontSize: '0.7rem', color: 'var(--text-muted)',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>{timeAgo(event.time)}</div>
            <div style={{
              width: '3px', height: '28px', borderRadius: '2px',
              background: getTypeColor(event.type), flexShrink: 0, opacity: 0.7,
            }} />
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
