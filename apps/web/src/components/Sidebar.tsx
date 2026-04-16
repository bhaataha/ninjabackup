'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSidebar } from './SidebarContext';
import { useT } from './LocaleProvider';

export default function Sidebar() {
  const pathname = usePathname();
  const { open, close } = useSidebar();
  const t = useT();

  const NAV_ITEMS = [
    {
      section: t('Overview', 'סקירה'),
      items: [{ label: t('Dashboard', 'לוח בקרה'), href: '/dashboard', icon: '📊' }],
    },
    {
      section: t('Management', 'ניהול'),
      items: [
        { label: t('Agents', 'סוכנים'), href: '/dashboard/agents', icon: '🖥️' },
        { label: t('Backup Jobs', 'משימות גיבוי'), href: '/dashboard/jobs', icon: '📦' },
        { label: t('Policies', 'מדיניות'), href: '/dashboard/policies', icon: '📋' },
        { label: t('Snapshots', 'תמונות מצב'), href: '/dashboard/snapshots', icon: '📸' },
        { label: t('Restore', 'שחזור'), href: '/dashboard/restore', icon: '♻️' },
        { label: t('Download Agent', 'הורדת סוכן'), href: '/dashboard/download', icon: '⬇️' },
      ],
    },
    {
      section: t('Infrastructure', 'תשתית'),
      items: [
        { label: t('Storage Vaults', 'אחסון'), href: '/dashboard/storage', icon: '☁️' },
        { label: t('Alerts', 'התראות'), href: '/dashboard/alerts', icon: '🔔' },
        { label: t('Reports', 'דוחות'), href: '/dashboard/reports', icon: '📈' },
      ],
    },
    {
      section: t('Settings', 'הגדרות'),
      items: [
        { label: t('Users', 'משתמשים'), href: '/dashboard/users', icon: '👥' },
        { label: t('API Keys', 'מפתחות API'), href: '/dashboard/api-keys', icon: '🔑' },
        { label: t('Webhooks', 'Webhooks'), href: '/dashboard/webhooks', icon: '🔗' },
        { label: t('Audit Log', 'יומן פעולות'), href: '/dashboard/audit', icon: '📝' },
        { label: t('Settings', 'הגדרות'), href: '/dashboard/settings', icon: '⚙️' },
      ],
    },
  ];

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={close} aria-hidden />}
      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">N</div>
          <span className="sidebar-brand">NinjaBackup</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((section) => (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.items.map((item) => {
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={close}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div
          style={{
            padding: 'var(--space-md) var(--space-lg)',
            borderTop: '1px solid var(--border-default)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          NinjaBackup v1.0.0
        </div>
      </aside>
    </>
  );
}
