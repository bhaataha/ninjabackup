'use client';

import { useState } from 'react';

// Mock file tree for snapshot browsing
const FILE_TREE = {
  name: 'C:', type: 'dir', children: [
    { name: 'Users', type: 'dir', children: [
      { name: 'Admin', type: 'dir', children: [
        { name: 'Documents', type: 'dir', children: [
          { name: 'Reports', type: 'dir', children: [
            { name: 'Q1-2026-Financial.xlsx', type: 'file', size: 245000, modified: '2026-04-14T07:30:00Z', versions: 12 },
            { name: 'Annual-Summary.docx', type: 'file', size: 189000, modified: '2026-04-13T15:20:00Z', versions: 8 },
            { name: 'Budget-Forecast.pdf', type: 'file', size: 1520000, modified: '2026-04-10T09:00:00Z', versions: 3 },
          ]},
          { name: 'project-plan.md', type: 'file', size: 45000, modified: '2026-04-14T06:15:00Z', versions: 24 },
          { name: 'meeting-notes.txt', type: 'file', size: 12000, modified: '2026-04-14T08:00:00Z', versions: 45 },
        ]},
        { name: 'Desktop', type: 'dir', children: [
          { name: 'todo.txt', type: 'file', size: 2000, modified: '2026-04-14T07:45:00Z', versions: 89 },
          { name: 'screenshot.png', type: 'file', size: 3400000, modified: '2026-04-13T11:00:00Z', versions: 1 },
        ]},
        { name: 'Downloads', type: 'dir', children: [
          { name: 'setup-v2.exe', type: 'file', size: 89000000, modified: '2026-04-12T14:00:00Z', versions: 1 },
        ]},
      ]},
    ]},
    { name: 'Program Files', type: 'dir', children: [
      { name: 'NinjaBackup', type: 'dir', children: [
        { name: 'restic.exe', type: 'file', size: 24000000, modified: '2026-04-01T00:00:00Z', versions: 2 },
        { name: 'config.json', type: 'file', size: 1500, modified: '2026-04-14T08:00:00Z', versions: 15 },
      ]},
    ]},
  ],
} as const;

type FileNode = {
  name: string;
  type: 'file' | 'dir';
  size?: number;
  modified?: string;
  versions?: number;
  children?: FileNode[];
};

function formatBytes(b: number) {
  if (b === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(name: string, type: string) {
  if (type === 'dir') return '📁';
  const ext = name.split('.').pop()?.toLowerCase();
  const icons: Record<string, string> = {
    xlsx: '📊', docx: '📝', pdf: '📄', txt: '📃', md: '📃',
    png: '🖼️', jpg: '🖼️', exe: '⚙️', json: '📋', xml: '📋',
  };
  return icons[ext || ''] || '📄';
}

export default function RestorePage() {
  const [currentPath, setCurrentPath] = useState<string[]>(['C:']);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Navigate the file tree based on currentPath
  const getCurrentDir = (): FileNode => {
    let node: FileNode = FILE_TREE as unknown as FileNode;
    for (let i = 1; i < currentPath.length; i++) {
      const child = node.children?.find((c) => c.name === currentPath[i]);
      if (child) node = child;
    }
    return node;
  };

  const currentDir = getCurrentDir();

  const toggleSelect = (name: string) => {
    const fullPath = [...currentPath, name].join('/');
    setSelectedFiles((prev) =>
      prev.includes(fullPath) ? prev.filter((f) => f !== fullPath) : [...prev, fullPath]
    );
  };

  const navigateInto = (name: string) => {
    setCurrentPath([...currentPath, name]);
  };

  const navigateUp = () => {
    if (currentPath.length > 1) setCurrentPath(currentPath.slice(0, -1));
  };

  const navigateToIndex = (index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  };

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
        {/* Snapshot selector */}
        <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md) var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Agent:</span>
              <span style={{ fontWeight: 700 }}>SRV-DC01</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Snapshot:</span>
              <select style={{
                background: 'var(--bg-input)', color: 'var(--text-primary)',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)',
                padding: '6px 12px', fontSize: '0.85rem', fontFamily: 'monospace',
              }}>
                <option>snap-a1b2c3 — Apr 14, 08:45 (128.8 GB)</option>
                <option>snap-m4n5o6 — Apr 13, 08:57 (127.9 GB)</option>
                <option>snap-older1 — Apr 12, 08:30 (126.5 GB)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-md)',
          padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
          fontSize: '0.85rem',
        }}>
          {currentPath.map((segment, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {i > 0 && <span style={{ color: 'var(--text-muted)' }}>/</span>}
              <button
                onClick={() => navigateToIndex(i)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  color: i === currentPath.length - 1 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: i === currentPath.length - 1 ? 600 : 400, fontSize: '0.85rem',
                  padding: '2px 4px', borderRadius: '4px',
                }}
              >{segment}</button>
            </span>
          ))}
          {currentPath.length > 1 && (
            <button onClick={navigateUp} className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }}>
              ⬆️ Up
            </button>
          )}
        </div>

        {/* File Browser */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--accent-primary)' }} />
                </th>
                <th>Name</th>
                <th>Size</th>
                <th>Modified</th>
                <th>Versions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Directories first, then files */}
              {currentDir.children?.sort((a, b) => {
                if (a.type === 'dir' && b.type !== 'dir') return -1;
                if (a.type !== 'dir' && b.type === 'dir') return 1;
                return a.name.localeCompare(b.name);
              }).map((item) => {
                const fullPath = [...currentPath, item.name].join('/');
                const isSelected = selectedFiles.includes(fullPath);
                return (
                  <tr key={item.name} style={{
                    background: isSelected ? 'var(--accent-glow)' : undefined,
                  }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.name)}
                        style={{ accentColor: 'var(--accent-primary)' }}
                      />
                    </td>
                    <td>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: item.type === 'dir' ? 'pointer' : 'default' }}
                        onClick={() => item.type === 'dir' && navigateInto(item.name)}
                      >
                        <span style={{ fontSize: '1.1rem' }}>{getFileIcon(item.name, item.type)}</span>
                        <span style={{
                          fontWeight: item.type === 'dir' ? 600 : 400,
                          color: item.type === 'dir' ? 'var(--accent-primary)' : 'var(--text-primary)',
                        }}>{item.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {item.type === 'file' ? formatBytes(item.size || 0) : '--'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {item.modified
                        ? new Date(item.modified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '--'}
                    </td>
                    <td>
                      {item.versions && item.versions > 1 ? (
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                          background: 'var(--accent-glow)', color: 'var(--accent-primary)',
                          cursor: 'pointer',
                        }}>📚 {item.versions} versions</span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>1</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-icon btn-secondary" title="Restore this item" style={{ fontSize: '0.8rem' }}>♻️</button>
                        {item.type === 'file' && (
                          <button className="btn btn-icon btn-secondary" title="Download" style={{ fontSize: '0.8rem' }}>⬇️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Files Bar */}
        {selectedFiles.length > 0 && (
          <div style={{
            position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg-card)', border: '1px solid var(--border-active)',
            borderRadius: 'var(--radius-lg)', padding: '12px 24px',
            display: 'flex', alignItems: 'center', gap: 'var(--space-lg)',
            boxShadow: 'var(--shadow-lg), 0 0 30px rgba(59, 130, 246, 0.15)',
            zIndex: 200,
          }}>
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

        {/* Restore Modal */}
        {showRestoreModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)',
          }}
            onClick={() => setShowRestoreModal(false)}
          >
            <div className="card" style={{ maxWidth: '520px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>♻️ Restore Files</h3>

              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Items to restore:</div>
                <div style={{ maxHeight: '150px', overflow: 'auto' }}>
                  {selectedFiles.map((f) => (
                    <div key={f} style={{
                      padding: '6px 10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem', fontFamily: 'monospace', marginBottom: '4px',
                      color: 'var(--accent-primary)',
                    }}>{f}</div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Restore to:
                </label>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="radio" name="target" defaultChecked style={{ accentColor: 'var(--accent-primary)' }} /> Original location
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="radio" name="target" style={{ accentColor: 'var(--accent-primary)' }} /> Custom path
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowRestoreModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={() => { setShowRestoreModal(false); setSelectedFiles([]); }}>
                  ♻️ Start Restore
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
