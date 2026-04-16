'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { snapshots as snapshotsApi, restore as restoreApi, files as filesApi, agents as agentsApi } from '@/lib/api';
import { useToast } from '@/components/Toast';

type Snapshot = {
  id: string;
  agentId: string;
  agentHostname?: string;
  type: 'FILE' | 'IMAGE';
  createdAt: string;
  sizeBytes?: number;
};

type Agent = { id: string; hostname: string; displayName?: string };

type FileNode = {
  name: string;
  type: 'file' | 'dir';
  size?: number;
  modified?: string;
  versions?: number;
};

function formatBytes(b: number) {
  if (!b || b === 0) return '0 B';
  const k = 1024,
    sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(name: string, type: string) {
  if (type === 'dir') return '📁';
  const ext = name.split('.').pop()?.toLowerCase();
  const icons: Record<string, string> = {
    xlsx: '📊',
    docx: '📝',
    pdf: '📄',
    txt: '📃',
    md: '📃',
    png: '🖼️',
    jpg: '🖼️',
    exe: '⚙️',
    json: '📋',
    xml: '📋',
  };
  return icons[ext || ''] || '📄';
}

export default function RestorePage() {
  const toast = useToast();
  const { data: agentsData } = useFetch<Agent[]>(() => agentsApi.list() as Promise<Agent[]>);
  const [agentId, setAgentId] = useState('');
  const { data: snapshotsData } = useFetch<Snapshot[]>(
    () => snapshotsApi.list(agentId || undefined) as Promise<Snapshot[]>,
    [agentId],
  );
  const [snapshotId, setSnapshotId] = useState('');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [versionsFor, setVersionsFor] = useState<string | null>(null);

  const agents = agentsData ?? [];
  const snapshots = snapshotsData ?? [];

  // Auto-select via querystring (e.g. /dashboard/restore?snapshotId=xxx)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qs = new URLSearchParams(window.location.search);
    const sid = qs.get('snapshotId');
    if (sid && !snapshotId) setSnapshotId(sid);
  }, [snapshotId]);

  // Default to first agent / snapshot when data loads
  useEffect(() => {
    if (!agentId && agents.length > 0) setAgentId(agents[0].id);
  }, [agents, agentId]);
  useEffect(() => {
    if (!snapshotId && snapshots.length > 0) setSnapshotId(snapshots[0].id);
  }, [snapshots, snapshotId]);

  const path = currentPath.join('/');
  const { data: browseData, loading: browseLoading } = useFetch<{ entries: FileNode[] } | FileNode[]>(
    () => (snapshotId ? snapshotsApi.browse(snapshotId, path) : Promise.resolve({ entries: [] })),
    [snapshotId, path],
    { enabled: !!snapshotId },
  );

  const entries: FileNode[] = useMemo(() => {
    if (!browseData) return [];
    if (Array.isArray(browseData)) return browseData;
    return browseData.entries ?? [];
  }, [browseData]);

  const toggleSelect = (name: string) => {
    const fullPath = [...currentPath, name].join('/');
    setSelectedFiles((prev) => (prev.includes(fullPath) ? prev.filter((f) => f !== fullPath) : [...prev, fullPath]));
  };

  const navigateInto = (name: string) => setCurrentPath([...currentPath, name]);
  const navigateUp = () => currentPath.length > 0 && setCurrentPath(currentPath.slice(0, -1));
  const navigateToIndex = (i: number) => setCurrentPath(currentPath.slice(0, i + 1));

  const selectedSnapshot = snapshots.find((s) => s.id === snapshotId);

  async function downloadFile(filePath: string) {
    if (!snapshotId) return;
    try {
      const r = await filesApi.download(snapshotId, filePath);
      window.open(r.url, '_blank');
    } catch (e: any) {
      toast.error('Download failed', e?.message ?? 'unknown');
    }
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Restore</h1>
            <p className="page-subtitle">Browse snapshots and restore files or folders</p>
          </div>
          {selectedFiles.length > 0 && (
            <button className="btn btn-primary" onClick={() => setShowRestoreModal(true)}>
              ♻️ Restore {selectedFiles.length} item{selectedFiles.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </header>

      <div className="page-body">
        <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md) var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Agent:</span>
              <select
                value={agentId}
                onChange={(e) => {
                  setAgentId(e.target.value);
                  setSnapshotId('');
                  setCurrentPath([]);
                  setSelectedFiles([]);
                }}
                className="input"
                style={{ minWidth: 200 }}
              >
                <option value="">— Select agent —</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName ?? a.hostname}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Snapshot:</span>
              <select
                value={snapshotId}
                onChange={(e) => {
                  setSnapshotId(e.target.value);
                  setCurrentPath([]);
                  setSelectedFiles([]);
                }}
                className="input"
                style={{ minWidth: 320, fontFamily: 'monospace' }}
              >
                <option value="">— Select snapshot —</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id.slice(0, 12)} — {new Date(s.createdAt).toLocaleString()} ({formatBytes(s.sizeBytes ?? 0)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!snapshotId ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>Select an agent and a snapshot to browse files</div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginBottom: 'var(--space-md)',
                padding: 'var(--space-sm) var(--space-md)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                fontSize: '0.85rem',
              }}
            >
              <button
                onClick={() => setCurrentPath([])}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: currentPath.length === 0 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: currentPath.length === 0 ? 600 : 400,
                  fontSize: '0.85rem',
                  padding: '2px 4px',
                }}
              >
                /
              </button>
              {currentPath.map((segment, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>/</span>
                  <button
                    onClick={() => navigateToIndex(i)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      color: i === currentPath.length - 1 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: i === currentPath.length - 1 ? 600 : 400,
                      fontSize: '0.85rem',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  >
                    {segment}
                  </button>
                </span>
              ))}
              {currentPath.length > 0 && (
                <button onClick={navigateUp} className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }}>
                  ⬆️ Up
                </button>
              )}
            </div>

            {browseLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>Loading files…</div>
            ) : entries.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>This directory is empty.</div>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={entries.length > 0 && entries.every((e) => selectedFiles.includes([...currentPath, e.name].join('/')))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFiles((prev) => [
                                ...prev,
                                ...entries.map((en) => [...currentPath, en.name].join('/')).filter((p) => !prev.includes(p)),
                              ]);
                            } else {
                              const inThisDir = entries.map((en) => [...currentPath, en.name].join('/'));
                              setSelectedFiles((prev) => prev.filter((p) => !inThisDir.includes(p)));
                            }
                          }}
                        />
                      </th>
                      <th>Name</th>
                      <th>Size</th>
                      <th>Modified</th>
                      <th>Versions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries
                      .slice()
                      .sort((a, b) => {
                        if (a.type === 'dir' && b.type !== 'dir') return -1;
                        if (a.type !== 'dir' && b.type === 'dir') return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map((item) => {
                        const fullPath = [...currentPath, item.name].join('/');
                        const isSelected = selectedFiles.includes(fullPath);
                        return (
                          <tr key={item.name} style={{ background: isSelected ? 'var(--accent-glow)' : undefined }}>
                            <td>
                              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.name)} />
                            </td>
                            <td>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  cursor: item.type === 'dir' ? 'pointer' : 'default',
                                }}
                                onClick={() => item.type === 'dir' && navigateInto(item.name)}
                              >
                                <span style={{ fontSize: '1.1rem' }}>{getFileIcon(item.name, item.type)}</span>
                                <span
                                  style={{
                                    fontWeight: item.type === 'dir' ? 600 : 400,
                                    color: item.type === 'dir' ? 'var(--accent-primary)' : 'var(--text-primary)',
                                  }}
                                >
                                  {item.name}
                                </span>
                              </div>
                            </td>
                            <td style={{ fontSize: '0.8rem' }}>{item.type === 'file' ? formatBytes(item.size ?? 0) : '--'}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {item.modified
                                ? new Date(item.modified).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '--'}
                            </td>
                            <td>
                              {item.versions && item.versions > 1 ? (
                                <button
                                  onClick={() => setVersionsFor(fullPath)}
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    background: 'var(--accent-glow)',
                                    color: 'var(--accent-primary)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                  }}
                                  title="Show previous versions"
                                >
                                  📚 {item.versions} versions
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>1</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {item.type === 'file' && (
                                  <>
                                    <button
                                      className="btn btn-sm btn-secondary"
                                      onClick={() => downloadFile(fullPath)}
                                      title="Download via pre-signed URL"
                                    >
                                      ⬇️
                                    </button>
                                    <button
                                      className="btn btn-sm btn-secondary"
                                      onClick={() => setVersionsFor(fullPath)}
                                      title="Show versions"
                                    >
                                      📚
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {selectedFiles.length > 0 && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-active)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-lg)',
              boxShadow: 'var(--shadow-lg), 0 0 30px rgba(59, 130, 246, 0.15)',
              zIndex: 200,
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {selectedFiles.length} item{selectedFiles.length > 1 ? 's' : ''} selected
            </span>
            <button className="btn btn-sm btn-primary" onClick={() => setShowRestoreModal(true)}>
              ♻️ Restore Selected
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => setSelectedFiles([])}>
              ✕ Clear
            </button>
          </div>
        )}

        {showRestoreModal && selectedSnapshot && (
          <RestoreModal
            snapshot={selectedSnapshot}
            paths={selectedFiles}
            onClose={() => setShowRestoreModal(false)}
            onRestored={() => {
              setShowRestoreModal(false);
              setSelectedFiles([]);
            }}
          />
        )}
        {versionsFor && snapshotId && (
          <VersionsModal snapshotId={snapshotId} path={versionsFor} onClose={() => setVersionsFor(null)} />
        )}
      </div>
    </>
  );
}

function VersionsModal({
  snapshotId,
  path,
  onClose,
}: {
  snapshotId: string;
  path: string;
  onClose: () => void;
}) {
  const { data, loading, error } = useFetch<any[]>(
    () => filesApi.versions(snapshotId, path) as Promise<any[]>,
    [snapshotId, path],
  );

  const toast = useToast();
  async function download(versionSnapshotId: string) {
    try {
      const r = await filesApi.download(versionSnapshotId, path);
      window.open(r.url, '_blank');
    } catch (e: any) {
      toast.error('Download failed', e?.message ?? 'unknown');
    }
  }

  const versions = data ?? [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: 620, width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
          📚 File Version History
        </h3>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 'var(--space-md)' }}>
          {path}
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>Loading versions…</div>
        ) : error ? (
          <div style={{ color: 'var(--accent-danger)', fontSize: '0.85rem' }}>{error}</div>
        ) : versions.length === 0 ? (
          <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>
            No versions found (only one snapshot contains this file).
          </div>
        ) : (
          <table style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Size</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Snapshot</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v: any) => (
                <tr key={v.snapshotId} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '8px 4px' }}>
                    {new Date(v.modified ?? v.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td style={{ padding: '8px 4px' }}>
                    {v.sizeBytes ? `${(Number(v.sizeBytes) / 1024 / 1024).toFixed(2)} MB` : '—'}
                  </td>
                  <td style={{ padding: '8px 4px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {v.snapshotId?.slice(0, 12)}
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => download(v.snapshotId)}>
                      ⬇️ Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function RestoreModal({
  snapshot,
  paths,
  onClose,
  onRestored,
}: {
  snapshot: Snapshot;
  paths: string[];
  onClose: () => void;
  onRestored: () => void;
}) {
  const toast = useToast();
  const { data: agentsData } = useFetch<Agent[]>(() => agentsApi.list() as Promise<Agent[]>);
  const [targetAgentId, setTargetAgentId] = useState(snapshot.agentId);
  const [mode, setMode] = useState<'original' | 'custom'>('original');
  const [customPath, setCustomPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await restoreApi.trigger({
        snapshotId: snapshot.id,
        agentId: targetAgentId,
        targetPath: mode === 'custom' ? customPath : undefined,
        includePaths: paths,
      });
      onRestored();
      toast.success('Restore job started', 'Track progress on the Jobs page.');
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to start restore');
      toast.error('Failed to start restore', e?.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: '560px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>♻️ Restore Files</h3>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            Items to restore ({paths.length}):
          </div>
          <div style={{ maxHeight: '150px', overflow: 'auto' }}>
            {paths.map((p) => (
              <div
                key={p}
                style={{
                  padding: '6px 10px',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  marginBottom: '4px',
                  color: 'var(--accent-primary)',
                }}
              >
                {p}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Restore to agent:</label>
          <select value={targetAgentId} onChange={(e) => setTargetAgentId(e.target.value)} className="input">
            {(agentsData ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName ?? a.hostname}
                {a.id === snapshot.agentId ? ' (original)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Restore to:</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="radio" name="target" checked={mode === 'original'} onChange={() => setMode('original')} />
              Original location
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="radio" name="target" checked={mode === 'custom'} onChange={() => setMode('custom')} />
              Custom path
            </label>
            {mode === 'custom' && (
              <input className="input" placeholder="C:\Restored or /tmp/restore" value={customPath} onChange={(e) => setCustomPath(e.target.value)} />
            )}
          </div>
        </div>

        {err && <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: 'var(--space-sm)' }}>{err}</div>}

        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>
            ♻️ {busy ? 'Starting…' : 'Start Restore'}
          </button>
        </div>
      </div>
    </div>
  );
}
