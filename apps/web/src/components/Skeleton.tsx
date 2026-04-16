'use client';

import { CSSProperties } from 'react';

/**
 * Animated placeholder used while data is loading. Accepts arbitrary width/
 * height/borderRadius via style — callers compose it for cards, table rows,
 * single lines, etc.
 */
export function Skeleton({ width = '100%', height = 14, style }: { width?: number | string; height?: number | string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width,
        height,
        borderRadius: 6,
        background:
          'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

/**
 * Skeleton optimised for table rows. Renders N rows × M columns of equal-width
 * shimmer cells inside a `.table-container` wrapper.
 */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-container" aria-busy>
      <table>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: cols }).map((__, j) => (
                <td key={j} style={{ padding: '12px 16px' }}>
                  <Skeleton height={12} width={j === 0 ? '60%' : '85%'} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <style jsx global>{`
        @keyframes skeleton-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Skeleton for a card grid (policies, storage vaults, etc.).
 */
export function CardGridSkeleton({ cards = 4, minWidth = 380 }: { cards?: number; minWidth?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
        gap: 'var(--space-lg)',
      }}
      aria-busy
    >
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="card">
          <Skeleton height={20} width="50%" style={{ marginBottom: 12 }} />
          <Skeleton height={12} width="80%" style={{ marginBottom: 8 }} />
          <Skeleton height={12} width="60%" style={{ marginBottom: 16 }} />
          <Skeleton height={32} width="100%" />
        </div>
      ))}
      <style jsx global>{`
        @keyframes skeleton-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Skeleton for stat cards (KPIs at the top of the dashboard).
 */
export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="kpi-grid" aria-busy>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="kpi-card blue">
          <Skeleton height={32} width={32} style={{ borderRadius: 8, marginBottom: 12 }} />
          <Skeleton height={28} width="50%" style={{ marginBottom: 8 }} />
          <Skeleton height={12} width="70%" />
        </div>
      ))}
      <style jsx global>{`
        @keyframes skeleton-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
