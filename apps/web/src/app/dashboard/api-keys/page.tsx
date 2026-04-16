'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { apiKeys as apiKeysApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Badge, StatusBadge } from '@/components/Badge';
import { TableSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useT } from '@/components/LocaleProvider';

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt?: string;
  active: boolean;
};

const AVAILABLE_PERMISSIONS = [
  { group: 'Agents', perms: ['agents:read', 'agents:write', 'agents:delete'] },
  { group: 'Jobs', perms: ['jobs:read', 'jobs:trigger', 'jobs:cancel'] },
  { group: 'Policies', perms: ['policies:read', 'policies:write'] },
  { group: 'Storage', perms: ['storage:read', 'storage:write'] },
  { group: 'Alerts', perms: ['alerts:read', 'alerts:write'] },
  { group: 'Restore', perms: ['restore:read', 'restore:trigger'] },
];

function timeAgo(date?: string) {
  if (!date) return 'never';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ApiKeysPage() {
  const t = useT();
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch<ApiKey[]>(() => apiKeysApi.list() as Promise<ApiKey[]>);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [generatedKey, setGeneratedKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const keys = data ?? [];

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  };

  async function generateKey() {
    setBusy(true);
    setCreateErr(null);
    try {
      const r = await apiKeysApi.create({ name: newKeyName, permissions: selectedPerms });
      setGeneratedKey(r.key);
      refetch();
      toast.success(t('API key created', 'מפתח API נוצר'), t('Copy it now — it will not be shown again.', 'העתק אותו עכשיו — הוא לא יוצג שוב.'));
    } catch (e: any) {
      setCreateErr(e?.message ?? t('Failed to create key', 'יצירת המפתח נכשלה'));
      toast.error(t('Failed to create API key', 'יצירת מפתח API נכשלה'), e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm(t('Revoke this API key? Any clients using it will lose access immediately.', 'לבטל את מפתח ה-API? כל הלקוחות המשתמשים בו יאבדו גישה מיידית.'))) return;
    try {
      await apiKeysApi.revoke(id);
      refetch();
      toast.success(t('API key revoked', 'מפתח API בוטל'));
    } catch (e: any) {
      toast.error(t('Failed to revoke API key', 'ביטול מפתח API נכשל'), e?.message);
    }
  }

  async function commitRename(id: string) {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await apiKeysApi.rename(id, renameValue.trim());
      setRenamingId(null);
      setRenameValue('');
      refetch();
      toast.success(t('API key renamed', 'שם מפתח API שונה'));
    } catch (e: any) {
      toast.error(t('Failed to rename', 'שינוי השם נכשל'), e?.message);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.88rem',
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">{t('API Keys', 'מפתחות API')}</h1>
            <p className="page-subtitle">{t('Manage programmatic access to the NinjaBackup API', 'נהל גישה תכנותית ל-NinjaBackup API')}</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowCreate(true);
              setGeneratedKey('');
              setNewKeyName('');
              setSelectedPerms([]);
              setCreateErr(null);
            }}
          >
            + {t('Create API Key', 'צור מפתח API')}
          </button>
        </div>
      </header>

      <div className="page-body">
        {error && (
          <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ color: 'var(--accent-danger)', fontSize: '0.85rem' }}>{error}</div>
          </div>
        )}

        <div
          style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: 'var(--space-xl)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
          {t(
            'API keys provide programmatic access to the NinjaBackup REST API. Keep your keys secure.',
            'מפתחות API מספקים גישה תכנותית ל-NinjaBackup REST API. שמור על המפתחות שלך בצורה מאובטחת.'
          )}
        </div>

        {showCreate && (
          <div
            className="card"
            style={{ marginBottom: 'var(--space-xl)', border: '1px solid var(--border-active)', boxShadow: 'var(--shadow-glow-accent)' }}
          >
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>🔑 {t('Create New API Key', 'צור מפתח API חדש')}</h3>

            {!generatedKey ? (
              <>
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{t('Key Name', 'שם מפתח')}</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder={t('e.g., CI/CD Pipeline', 'למשל, צינור CI/CD')}
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '10px' }}>{t('Permissions', 'הרשאות')}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {AVAILABLE_PERMISSIONS.map((group) => (
                      <div
                        key={group.group}
                        style={{
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-glass)',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', marginBottom: '8px' }}>{group.group}</div>
                        {group.perms.map((perm) => (
                          <label
                            key={perm}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              color: 'var(--text-secondary)',
                              padding: '3px 0',
                            }}
                          >
                            <input type="checkbox" checked={selectedPerms.includes(perm)} onChange={() => togglePerm(perm)} />
                            {perm.split(':')[1]}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {createErr && <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: 'var(--space-sm)' }}>{createErr}</div>}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" onClick={generateKey} disabled={busy || !newKeyName || selectedPerms.length === 0}>
                    🔑 {busy ? t('Generating…', 'יוצר…') : t('Generate Key', 'צור מפתח')}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                    {t('Cancel', 'ביטול')}
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div
                  style={{
                    padding: '14px',
                    background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-md)',
                    fontSize: '0.82rem',
                    color: 'var(--accent-success)',
                  }}
                >
                  ⚠️ {t("Copy this key now — you won't be able to see it again!", 'העתק את המפתח עכשיו — לא תוכל לראות אותו שוב!')}
                </div>

                <div
                  style={{
                    padding: '14px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-active)',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: 'var(--accent-primary)',
                    wordBreak: 'break-all',
                    fontWeight: 600,
                    marginBottom: 'var(--space-md)',
                  }}
                >
                  {generatedKey}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(generatedKey)}>
                    📋 {t('Copy Key', 'העתק מפתח')}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                    {t('Done', 'סיום')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {loading && keys.length === 0 ? (
          <TableSkeleton rows={4} cols={7} />
        ) : keys.length === 0 ? (
          <EmptyState
            icon="🔑"
            title={t('No API keys yet', 'אין מפתחות API עדיין')}
            description={t(
              'Create one to give CI pipelines or external integrations programmatic access.',
              'צור מפתח כדי לתת לצינורות CI או לאינטגרציות חיצוניות גישה תכנותית.'
            )}
            cta={{
              label: `+ ${t('Create API Key', 'צור מפתח API')}`,
              onClick: () => {
                setShowCreate(true);
                setGeneratedKey('');
                setNewKeyName('');
                setSelectedPerms([]);
                setCreateErr(null);
              },
            }}
          />
        ) : (
          <div className="card">
            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>{t('Name', 'שם')}</th>
                    <th>{t('Prefix', 'קידומת')}</th>
                    <th>{t('Permissions', 'הרשאות')}</th>
                    <th>{t('Created', 'נוצר')}</th>
                    <th>{t('Last Used', 'שימוש אחרון')}</th>
                    <th>{t('Status', 'סטטוס')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id}>
                      <td style={{ fontWeight: 600 }}>
                        {renamingId === key.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => commitRename(key.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename(key.id);
                              if (e.key === 'Escape') {
                                setRenamingId(null);
                                setRenameValue('');
                              }
                            }}
                            className="input"
                            style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                          />
                        ) : (
                          <span
                            onClick={() => {
                              if (!key.active) return;
                              setRenamingId(key.id);
                              setRenameValue(key.name);
                            }}
                            style={{ cursor: key.active ? 'text' : 'default' }}
                            title={key.active ? t('Click to rename', 'לחץ לשינוי שם') : ''}
                          >
                            {key.name}
                          </span>
                        )}
                      </td>
                      <td>
                        <code
                          style={{
                            padding: '3px 8px',
                            background: 'var(--bg-input)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                          }}
                        >
                          {key.keyPrefix}••••••••
                        </code>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {key.permissions.map((p) => (
                            <Badge key={p} tone="purple" size="xs">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(key.createdAt).toLocaleDateString()}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {key.lastUsedAt ? (
                          <>
                            {timeAgo(key.lastUsedAt)}
                            <div style={{ fontSize: '0.7rem' }}>{new Date(key.lastUsedAt).toLocaleString()}</div>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>{t('Never used', 'לא בשימוש')}</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={key.active ? 'ACTIVE' : 'REVOKED'} />
                      </td>
                      <td>
                        {key.active && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setRenamingId(key.id);
                                setRenameValue(key.name);
                              }}
                            >
                              {t('Rename', 'שנה שם')}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => revoke(key.id)}>
                              {t('Revoke', 'בטל')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
