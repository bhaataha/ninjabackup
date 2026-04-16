'use client';

import { useState, useMemo } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { snapshots as snapshotsApi } from '@/lib/api';
import { TypeBadge, Badge } from '@/components/Badge';
import { CardGridSkeleton } from '@/components/Skeleton';
import { EmptyState, ErrorBanner } from '@/components/EmptyState';
import { useT } from '@/components/LocaleProvider';

type Snapshot = {
  id: string;
  agentId: string;
  agentHostname?: string;
  type: 'FILE' | 'IMAGE';
  createdAt: string;
  sizeBytes: number;
  filesCount?: number;
  paths?: string[];
  durationSec?: number;
  jobId?: string;
};

function formatBytes(b: number) {
  if (!b || b === 0) return '0 B';
  const k = 1024,
    sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(sec?: number) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SnapshotsPage() {
  const t = useT();
  const [selectedAgent, setSelectedAgent] = useState('ALL');
  const { data: snapshots, loading, error, refetch } = useFetch<Snapshot[]>(
    () => snapshotsApi.list() as Promise<Snapshot[]>,
    [],
    { interval: 30_000 },
  );

  const list = snapshots ?? [];
  const agents = useMemo(
    () => ['ALL', ...Array.from(new Set(list.map((s) => s.agentHostname ?? s.agentId)))],
    [list],
  );
  const filtered =
    selectedAgent === 'ALL'
      ? list
      : list.filter((s) => (s.agentHostname ?? s.agentId) === selectedAgent);

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">{t('Snapshots', 'תמונות מצב')}</h1>
            <p className="page-subtitle">
              {loading
                ? t('Loading…', 'טוען…')
                : t(
                    `${list.length} snapshots across ${new Set(list.map((s) => s.agentId)).size} agents`,
                    `${list.length} תמונות מצב מ-${new Set(list.map((s) => s.agentId)).size} סוכנים`,
                  )}
            </p>
          </div>
        </div>
      </header>

      <div className="page-body">
        {error && <ErrorBanner message={`Failed to load snapshots: ${error}`} onRetry={refetch} />}

        {loading && list.length === 0 && <CardGridSkeleton cards={4} minWidth={420} />}

        {!loading && list.length === 0 && !error && (
          <EmptyState
            icon="📸"
            title={t('No snapshots yet', 'אין תמונות מצב עדיין')}
            description={t(
              'Snapshots appear here after backup jobs complete successfully.',
              'תמונות מצב מופיעות כאן לאחר שמשימות גיבוי מסתיימות בהצלחה.',
            )}
            cta={{ label: t('View Jobs', 'הצג משימות'), onClick: () => {}, href: '/dashboard/jobs' }}
          />
        )}

        {list.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
            {agents.map((a) => (
              <button
                key={a}
                onClick={() => setSelectedAgent(a)}
                className="btn btn-sm"
                style={{
                  background: selectedAgent === a ? 'var(--accent-glow)' : 'var(--bg-card)',
                  color: selectedAgent === a ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${selectedAgent === a ? 'var(--border-active)' : 'var(--border-default)'}`,
                  fontWeight: selectedAgent === a ? 700 : 500,
                }}
              >
                {a === 'ALL' ? `All (${list.length})` : a}
              </button>
            ))}
          </div>
        )}

        <div style={{ position: 'relative', paddingLeft: '30px' }}>
          {list.length > 0 && (
            <div
              style={{
                position: 'absolute',
                left: '10px',
                top: 0,
                bottom: 0,
                width: '2px',
                background: 'linear-gradient(to bottom, var(--accent-primary), var(--accent-purple), transparent)',
              }}
            />
          )}

          {filtered.map((snap, i) => (
            <div
              key={snap.id}
              style={{
                position: 'relative',
                marginBottom: 'var(--space-lg)',
                animation: `fadeInUp 0.3s ease ${i * 0.05}s both`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '-25px',
                  top: '20px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: snap.type === 'IMAGE' ? 'var(--accent-purple)' : 'var(--accent-primary)',
                  border: '2px solid var(--bg-primary)',
                  boxShadow: `0 0 8px ${snap.type === 'IMAGE' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                }}
              />

              <div className="card" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {snap.agentHostname ?? snap.agentId.slice(0, 8)}
                      </span>
                      <TypeBadge type={snap.type} />
                      <code
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'var(--bg-input)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {snap.id.slice(0, 12)}
                      </code>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(snap.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {timeAgo(snap.createdAt)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{formatBytes(snap.sizeBytes)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {snap.filesCount && snap.filesCount > 0
                        ? `${snap.filesCount.toLocaleString()} files`
                        : 'Full disk'}{' '}
                      · {formatDuration(snap.durationSec)}
                    </div>
                  </div>
                </div>

                {snap.paths && snap.paths.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: 'var(--space-sm)' }}>
                    {snap.paths.map((p, j) => (
                      <Badge key={j} tone="muted" size="xs" style={{ fontFamily: 'monospace' }}>
                        {p}
                      </Badge>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--space-sm)',
                    marginTop: 'var(--space-md)',
                    paddingTop: 'var(--space-md)',
                    borderTop: '1px solid var(--border-default)',
                  }}
                >
                  <a
                    href={`/dashboard/restore?snapshotId=${snap.id}`}
                    className="btn btn-sm btn-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    ♻️ Restore
                  </a>
                  <a
                    href={`/dashboard/restore?snapshotId=${snap.id}&browse=1`}
                    className="btn btn-sm btn-secondary"
                    style={{ textDecoration: 'none' }}
                  >
                    📂 Browse Files
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
