'use client';

import { useState, useEffect, useRef } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { useSocket } from '@/hooks/useSocket';
import { notifications as notificationsApi, auth, users as usersApi } from '@/lib/api';
import { useSidebar } from './SidebarContext';
import { useLocale } from './LocaleProvider';

type Notification = {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function getNotifIcon(type: string) {
  const map: Record<string, string> = { error: '🔴', warning: '🟡', success: '✅', info: '🔵' };
  return map[type] || '📢';
}

export default function TopBar() {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { toggle: toggleSidebar } = useSidebar();
  const { locale, setLocale } = useLocale();
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: notifsData, refetch } = useFetch<Notification[]>(() => notificationsApi.list() as Promise<Notification[]>, [], { interval: 60_000 });
  const { data: meData } = useFetch<{ id: string; firstName?: string; lastName?: string; role?: string; email?: string }>(
    () => usersApi.list().then((u: any[]) => u[0] ?? { firstName: '?', lastName: '', role: 'VIEWER' }),
  );
  const { alerts: liveAlerts } = useSocket({ tenantId: 'current' });

  // Merge live alerts + persistent notifications
  const allNotifs: Notification[] = [
    ...liveAlerts.map((a) => ({
      id: a.id,
      type: (a.severity === 'CRITICAL' ? 'error' : a.severity === 'WARNING' ? 'warning' : 'info') as Notification['type'],
      title: a.rule ?? 'Alert',
      message: a.message,
      createdAt: a.timestamp,
      read: false,
    })),
    ...(notifsData ?? []),
  ];
  const unreadCount = allNotifs.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function markAllRead() {
    try {
      await notificationsApi.markAllRead();
      refetch();
    } catch {
      // ignore
    }
  }

  const initials =
    meData?.firstName && meData?.lastName ? `${meData.firstName[0]}${meData.lastName[0]}` : meData?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        padding: '18px var(--space-2xl)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        zIndex: 60,
      }}
    >
      <button
        type="button"
        className="sidebar-toggle"
        aria-label="Open menu"
        onClick={toggleSidebar}
      >
        ☰
      </button>

      <button
        type="button"
        onClick={() => setLocale(locale === 'en' ? 'he' : 'en')}
        title={locale === 'en' ? 'Switch to Hebrew' : 'Switch to English'}
        style={{
          padding: '6px 12px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '0.78rem',
          fontWeight: 600,
          fontFamily: 'inherit',
        }}
      >
        {locale === 'en' ? 'עברית' : 'English'}
      </button>

      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Search agents, jobs..."
          style={{
            width: '240px',
            padding: '8px 14px 8px 36px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontFamily: 'inherit',
            outline: 'none',
            backdropFilter: 'blur(8px)',
            transition: 'all var(--transition-fast)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.width = '320px';
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.width = '240px';
            e.currentTarget.style.borderColor = 'var(--border-glass)';
          }}
        />
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', opacity: 0.4 }}>🔍</span>
      </div>

      <div ref={notifRef} style={{ position: 'relative' }}>
        <button
          onClick={() => {
            setShowNotifs(!showNotifs);
            setShowProfile(false);
          }}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            background: showNotifs ? 'var(--accent-glow)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${showNotifs ? 'var(--border-active)' : 'var(--border-glass)'}`,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'all var(--transition-fast)',
          }}
        >
          🔔
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                minWidth: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-danger), #dc2626)',
                color: 'white',
                fontSize: '0.6rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                border: '2px solid var(--bg-primary)',
                padding: '0 4px',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {showNotifs && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '380px',
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              animation: 'fadeInDown 0.2s ease',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-glass)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
              <button
                onClick={markAllRead}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--accent-primary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Mark all read
              </button>
            </div>
            <div style={{ maxHeight: '320px', overflow: 'auto' }}>
              {allNotifs.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>You're all caught up.</div>
              ) : (
                allNotifs.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-glass)',
                      display: 'flex',
                      gap: '10px',
                      cursor: 'pointer',
                      background: n.read ? 'transparent' : 'rgba(59, 130, 246, 0.04)',
                    }}
                  >
                    <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '2px' }}>{getNotifIcon(n.type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{n.title}</div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.message}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: '2px' }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <a
              href="/dashboard/alerts"
              style={{
                display: 'block',
                padding: '12px',
                textAlign: 'center',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderTop: '1px solid var(--border-glass)',
              }}
            >
              View all alerts →
            </a>
          </div>
        )}
      </div>

      <div ref={profileRef} style={{ position: 'relative' }}>
        <button
          onClick={() => {
            setShowProfile(!showProfile);
            setShowNotifs(false);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '4px 12px 4px 4px',
            background: showProfile ? 'rgba(255,255,255,0.06)' : 'transparent',
            border: `1px solid ${showProfile ? 'var(--border-hover)' : 'transparent'}`,
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.75rem',
              color: 'white',
            }}
          >
            {initials}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {meData?.firstName ? `${meData.firstName} ${meData.lastName ?? ''}`.trim() : meData?.email ?? '—'}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{meData?.role ?? ''}</div>
          </div>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '4px' }}>▼</span>
        </button>

        {showProfile && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '220px',
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              animation: 'fadeInDown 0.2s ease',
              padding: 'var(--space-sm)',
            }}
          >
            {[
              { icon: '⚙️', label: 'Settings', href: '/dashboard/settings' },
              { icon: '🔑', label: 'API Keys', href: '/dashboard/api-keys' },
              { icon: '📋', label: 'Audit Log', href: '/dashboard/audit' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </a>
            ))}
            <div style={{ height: '1px', background: 'var(--border-glass)', margin: '4px 0' }} />
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                color: 'var(--accent-danger)',
                fontWeight: 500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => auth.logout()}
            >
              <span>🚪</span>Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
