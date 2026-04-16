'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSidebar } from './SidebarContext';

const NAV_ITEMS = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    ],
  },
  {
    section: 'Management',
    items: [
      { label: 'Agents', href: '/dashboard/agents', icon: '🖥️' },
      { label: 'Backup Jobs', href: '/dashboard/jobs', icon: '📦' },
      { label: 'Policies', href: '/dashboard/policies', icon: '📋' },
      { label: 'Snapshots', href: '/dashboard/snapshots', icon: '📸' },
      { label: 'Restore', href: '/dashboard/restore', icon: '♻️' },
      { label: 'Download Agent', href: '/dashboard/download', icon: '⬇️' },
    ],
  },
  {
    section: 'Infrastructure',
    items: [
      { label: 'Storage Vaults', href: '/dashboard/storage', icon: '☁️' },
      { label: 'Alerts', href: '/dashboard/alerts', icon: '🔔', badge: '2' },
      { label: 'Reports', href: '/dashboard/reports', icon: '📈' },
    ],
  },
  {
    section: 'Settings',
    items: [
      { label: 'Users', href: '/dashboard/users', icon: '👥' },
      { label: 'API Keys', href: '/dashboard/api-keys', icon: '🔑' },
      { label: 'Webhooks', href: '/dashboard/webhooks', icon: '🔗' },
      { label: 'Audit Log', href: '/dashboard/audit', icon: '📝' },
      { label: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { open, close } = useSidebar();

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
                    {'badge' in item && item.badge && <span className="nav-badge">{item.badge}</span>}
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
