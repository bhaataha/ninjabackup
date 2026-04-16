'use client';

import { CSSProperties, ReactNode } from 'react';

type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'muted';

const TONE_STYLES: Record<BadgeTone, { bg: string; color: string; border?: string }> = {
  primary: { bg: 'var(--accent-glow)', color: 'var(--accent-primary)' },
  success: { bg: 'var(--accent-success-glow)', color: 'var(--accent-success)' },
  warning: { bg: 'var(--accent-warning-glow)', color: 'var(--accent-warning)' },
  danger: { bg: 'var(--accent-danger-glow)', color: 'var(--accent-danger)' },
  purple: { bg: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' },
  muted: { bg: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-muted)' },
};

/**
 * Generic pill badge. Use for type/severity tags, role labels, tags, etc.
 *
 * Replaces a dozen ad-hoc inline styles scattered across pages so we get
 * consistent padding/font-size/radius everywhere.
 */
export function Badge({
  tone = 'muted',
  children,
  size = 'sm',
  style,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  size?: 'xs' | 'sm' | 'md';
  style?: CSSProperties;
}) {
  const t = TONE_STYLES[tone];
  const padding = size === 'xs' ? '2px 6px' : size === 'sm' ? '2px 8px' : '4px 10px';
  const fontSize = size === 'xs' ? '0.65rem' : size === 'sm' ? '0.7rem' : '0.75rem';
  return (
    <span
      style={{
        display: 'inline-block',
        padding,
        borderRadius: '4px',
        fontSize,
        fontWeight: 600,
        background: t.bg,
        color: t.color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/**
 * Status indicator with the same color palette used by the existing
 * `.status-badge` CSS class. Wraps that class so callers don't have to
 * remember the literal class names.
 */
export function StatusBadge({ status, children }: { status: string; children?: ReactNode }) {
  const cls = STATUS_TO_CLASS[status.toUpperCase()] ?? 'offline';
  return <span className={`status-badge ${cls}`}>{children ?? status.replace(/_/g, ' ')}</span>;
}

const STATUS_TO_CLASS: Record<string, string> = {
  ONLINE: 'online',
  ACTIVE: 'online',
  HEALTHY: 'online',
  OFFLINE: 'offline',
  DISABLED: 'offline',
  REVOKED: 'offline',
  CANCELLED: 'offline',
  BACKING_UP: 'backing-up',
  RESTORING: 'backing-up',
  RUNNING: 'backing-up',
  ERROR: 'error',
  FAILED: 'failed',
  CRITICAL: 'failed',
  SUCCESS: 'success',
  COMPLETED: 'success',
  PENDING: 'pending',
  WARNING: 'pending',
};

/**
 * Severity badge mirroring the alert page's icon + color convention.
 */
export function SeverityBadge({ severity }: { severity: string }) {
  const sev = severity.toUpperCase();
  if (sev === 'CRITICAL' || sev === 'ERROR') {
    return (
      <Badge tone="danger" size="xs">
        🔴 {severity}
      </Badge>
    );
  }
  if (sev === 'WARNING') {
    return (
      <Badge tone="warning" size="xs">
        🟡 {severity}
      </Badge>
    );
  }
  if (sev === 'SUCCESS') {
    return (
      <Badge tone="success" size="xs">
        ✓ {severity}
      </Badge>
    );
  }
  return (
    <Badge tone="primary" size="xs">
      🔵 {severity}
    </Badge>
  );
}

/**
 * Backup type badge (FILE / IMAGE) — was duplicated in 4 places.
 */
export function TypeBadge({ type }: { type: 'FILE' | 'IMAGE' | string }) {
  if (type === 'IMAGE') {
    return (
      <Badge tone="primary" size="xs">
        {type}
      </Badge>
    );
  }
  return (
    <Badge tone="purple" size="xs">
      {type}
    </Badge>
  );
}
