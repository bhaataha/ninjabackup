'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSocket } from '@/hooks/useSocket';

type FeedEvent = {
  type: string;
  icon: string;
  message: string;
  detail: string;
  time: number;
};

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
    job: 'var(--accent-primary)',
    agent: 'var(--accent-primary)',
    alert: 'var(--accent-danger)',
    security: 'var(--accent-warning)',
    config: 'var(--accent-purple)',
  };
  return map[type] || 'var(--text-muted)';
}

function eventToFeed(e: any): FeedEvent {
  const t = new Date(e.timestamp ?? e.receivedAt ?? Date.now()).getTime();
  if (e.type === 'job') {
    const status = (e.status ?? '').toUpperCase();
    return {
      type: 'backup',
      icon: status === 'SUCCESS' ? '✅' : status === 'FAILED' ? '❌' : '📦',
      message: `Backup job ${status.toLowerCase()}`,
      detail: e.bytesProcessed ? `${(e.bytesProcessed / 1024 / 1024 / 1024).toFixed(1)} GB processed · ${Math.round(e.progress ?? 0)}%` : '',
      time: t,
    };
  }
  if (e.type === 'agent') {
    return {
      type: 'agent',
      icon: e.status === 'ONLINE' ? '🟢' : e.status === 'OFFLINE' ? '🔴' : '💓',
      message: `Agent ${e.agentId?.slice(0, 8) ?? ''} ${(e.status ?? '').toLowerCase()}`,
      detail: '',
      time: t,
    };
  }
  if (e.type === 'alert') {
    return {
      type: 'alert',
      icon: e.severity === 'CRITICAL' ? '🔴' : e.severity === 'WARNING' ? '🟡' : '🔵',
      message: e.rule ?? 'Alert',
      detail: e.message ?? '',
      time: t,
    };
  }
  return { type: 'config', icon: '📋', message: e.type ?? 'event', detail: '', time: t };
}

export default function ActivityFeed() {
  const { activityFeed, connected } = useSocket({ tenantId: 'current' });
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const feed = useMemo(() => activityFeed.map(eventToFeed).slice(0, 30), [activityFeed]);

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header" style={{ marginBottom: 'var(--space-md)' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: connected ? 'var(--accent-success)' : 'var(--text-muted)',
              display: 'inline-block',
              animation: connected ? 'pulse 2s ease-in-out infinite' : undefined,
            }}
          />
          Live Activity {!connected && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(offline)</span>}
        </h2>
      </div>

      {feed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {connected ? 'Waiting for live events…' : 'Connecting to live feed…'}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            maxHeight: '400px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--border-default) transparent',
          }}
        >
          {feed.map((event, i) => (
            <div
              key={`${event.time}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                transition: 'background var(--transition-fast)',
                animation: i === 0 ? 'fadeInDown 0.3s ease' : undefined,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{event.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {event.message}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{event.detail}</div>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(event.time)}</div>
              <div
                style={{
                  width: '3px',
                  height: '28px',
                  borderRadius: '2px',
                  background: getTypeColor(event.type),
                  flexShrink: 0,
                  opacity: 0.7,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
