'use client';

import { useState, useMemo, useCallback } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { snapshots as snapshotsApi } from '@/lib/api';
import { TypeBadge, Badge } from '@/components/Badge';
import { CardGridSkeleton } from '@/components/Skeleton';
import { EmptyState, ErrorBanner } from '@/components/EmptyState';
import { useT } from '@/components/LocaleProvider';
import { useToast } from '@/components/Toast';

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

// ─── Confirm Delete Modal ────────────────────────────────────────────────────

function ConfirmDeleteModal({
  count,
  totalBytes,
  onConfirm,
  onCancel,
  busy,
}: {
  count: number;
  totalBytes: number;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const t = useT();
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && !busy && onCancel()}
    >
      <div
        className="card"
        style={{ width: '420px', maxWidth: '90vw', padding: 'var(--space-2xl)' }}
      >
        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>🗑️</div>
        <h3 style={{ marginBottom: 'var(--space-sm)' }}>
          {t('Delete Snapshots', 'מחק תמונות מצב')}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
          {t(
            `You are about to permanently delete ${count} snapshot${count !== 1 ? 's' : ''} (${formatBytes(totalBytes)}). This action cannot be undone.`,
            `אתה עומד למחוק לצמיתות ${count} תמונות מצב (${formatBytes(totalBytes)}). לא ניתן לבטל פעולה זו.`,
          )}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            {t('Cancel', 'ביטול')}
          </button>
          <button
            className="btn"
            onClick={onConfirm}
            disabled={busy}
            style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
          >
            {busy
              ? t('Deleting…', 'מוחק…')
              : t(`Delete ${count}`, `מחק ${count}`)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SnapshotsPage() {
  const t = useT();
  const toast = useToast();

  const [selectedAgent, setSelectedAgent] = useState('ALL');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Selection helpers
  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  const toggleAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((s) => next.add(s.id));
        return next;
      });
    }
  }, [allFilteredSelected, filtered]);

  const selectedInView = filtered.filter((s) => selected.has(s.id));
  const selectedBytes = selectedInView.reduce((acc, s) => acc + (s.sizeBytes || 0), 0);

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    setDeleting(true);
    try {
      await snapshotsApi.deleteBulk(ids);
      toast.success(t(`Deleted ${ids.length} snapshots`, `נמחקו ${ids.length} תמונות מצב`));
      setSelected(new Set());
      setConfirmOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(t('Delete failed', 'המחיקה נכשלה') + ': ' + (err?.message ?? String(err)));
    } finally {
      setDeleting(false);
    }
  };

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

        {/* Agent filter tabs */}
        {list.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-xl)',
              flexWrap: 'wrap',
            }}
          >
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

        {/* Bulk action toolbar */}
        {selected.size > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              padding: 'var(--space-md) var(--space-lg)',
              background: 'var(--accent-glow)',
              border: '1px solid var(--border-active)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-lg)',
            }}
          >
            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
              {t(`${selected.size} selected`, `${selected.size} נבחרו`)}
              {selectedBytes > 0 && (
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                  ({formatBytes(selectedBytes)})
                </span>
              )}
            </span>
            <div style={{ flex: 1 }} />
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setSelected(new Set())}
            >
              {t('Clear selection', 'בטל בחירה')}
            </button>
            <button
              className="btn btn-sm"
              style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
              onClick={() => setConfirmOpen(true)}
            >
              🗑️ {t('Delete selected', 'מחק שנבחרו')}
            </button>
          </div>
        )}

        {/* Select all row */}
        {filtered.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-md)',
              paddingLeft: '30px',
            }}
          >
            <input
              type="checkbox"
              id="select-all"
              checked={allFilteredSelected}
              onChange={toggleAll}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label
              htmlFor="select-all"
              style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              {allFilteredSelected
                ? t('Deselect all', 'בטל הכל')
                : t(`Select all ${filtered.length}`, `בחר את כל ${filtered.length}`)}
            </label>
          </div>
        )}

        {/* Timeline */}
        <div style={{ position: 'relative', paddingLeft: '30px' }}>
          {list.length > 0 && (
            <div
              style={{
                position: 'absolute',
                left: '10px',
                top: 0,
                bottom: 0,
                width: '2px',
                background:
                  'linear-gradient(to bottom, var(--accent-primary), var(--accent-purple), transparent)',
              }}
            />
          )}

          {filtered.map((snap, i) => {
            const isSelected = selected.has(snap.id);
            return (
              <div
                key={snap.id}
                style={{
                  position: 'relative',
                  marginBottom: 'var(--space-lg)',
                  animation: `fadeInUp 0.3s ease ${i * 0.05}s both`,
                }}
              >
                {/* Timeline dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-25px',
                    top: '20px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background:
                      snap.type === 'IMAGE' ? 'var(--accent-purple)' : 'var(--accent-primary)',
                    border: '2px solid var(--bg-primary)',
                    boxShadow: `0 0 8px ${snap.type === 'IMAGE' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                  }}
                />

                <div
                  className="card"
                  style={{
                    cursor: 'pointer',
                    outline: isSelected ? '2px solid var(--accent-primary)' : 'none',
                    outlineOffset: '2px',
                    transition: 'outline 0.1s',
                  }}
                  onClick={() => toggleOne(snap.id)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Left: checkbox + meta */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(snap.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '16px', height: '16px', marginTop: '2px', flexShrink: 0 }}
                      />
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '6px',
                          }}
                        >
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
                    </div>

                    {/* Right: size */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                        {formatBytes(snap.sizeBytes)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {snap.filesCount && snap.filesCount > 0
                          ? `${snap.filesCount.toLocaleString()} files`
                          : 'Full disk'}{' '}
                        · {formatDuration(snap.durationSec)}
                      </div>
                    </div>
                  </div>

                  {snap.paths && snap.paths.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                        flexWrap: 'wrap',
                        marginTop: 'var(--space-sm)',
                      }}
                    >
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={`/dashboard/restore?snapshotId=${snap.id}`}
                      className="btn btn-sm btn-primary"
                      style={{ textDecoration: 'none' }}
                    >
                      ♻️ {t('Restore', 'שחזר')}
                    </a>
                    <a
                      href={`/dashboard/restore?snapshotId=${snap.id}&browse=1`}
                      className="btn btn-sm btn-secondary"
                      style={{ textDecoration: 'none' }}
                    >
                      📂 {t('Browse Files', 'עיין בקבצים')}
                    </a>
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ marginLeft: 'auto', color: 'var(--danger)' }}
                      onClick={() => {
                        setSelected(new Set([snap.id]));
                        setConfirmOpen(true);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm deletion dialog */}
      {confirmOpen && (
        <ConfirmDeleteModal
          count={selected.size}
          totalBytes={selectedBytes}
          onConfirm={handleBulkDelete}
          onCancel={() => !deleting && setConfirmOpen(false)}
          busy={deleting}
        />
      )}

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
