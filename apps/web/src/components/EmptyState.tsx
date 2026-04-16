'use client';

import { ReactNode } from 'react';

/**
 * Consistent empty-state card. Replaces a dozen ad-hoc "No X yet" divs across
 * the dashboard. Optionally renders a primary CTA button.
 */
export function EmptyState({
  icon = '📭',
  title,
  description,
  cta,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  cta?: { label: string; onClick: () => void; href?: string };
}) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl, 36px)' }}>
      <div style={{ fontSize: '2.4rem', marginBottom: 12, opacity: 0.6 }}>{icon}</div>
      <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>{title}</div>
      {description && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
          {description}
        </div>
      )}
      {cta && (
        <div style={{ marginTop: 'var(--space-md, 16px)' }}>
          {cta.href ? (
            <a href={cta.href} className="btn btn-primary" style={{ textDecoration: 'none' }}>
              {cta.label}
            </a>
          ) : (
            <button className="btn btn-primary" onClick={cta.onClick}>
              {cta.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Inline error banner shown above tables/grids when an API call fails. Common
 * action: a Retry button. Replaces the `<div className="card" style={{ borderColor: ... }}>`
 * pattern repeated across pages.
 */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', marginBottom: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)' }}>
        <div style={{ color: 'var(--accent-danger)', fontSize: '0.85rem' }}>⚠️ {message}</div>
        {onRetry && (
          <button className="btn btn-sm btn-secondary" onClick={onRetry}>
            🔄 Retry
          </button>
        )}
      </div>
    </div>
  );
}
