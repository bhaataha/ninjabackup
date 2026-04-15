'use client';

import { useState, useRef } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { reports as reportsApi } from '@/lib/api';

type DailyStat = { date: string; backups: number; success: number; failed: number; dataGb: number };
type AgentStat = { agent: string; backups: number; successRate: number; totalGb: number; avgDuration: string };
type Summary = { dailyStats: DailyStat[]; agentStats: AgentStat[]; storageTrend: { date: string; usedTb: number }[] };

function BarChart({ data, maxVal }: { data: { label: string; value: number; color: string }[]; maxVal: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-primary)' }}>{d.value}</div>
          <div
            style={{
              width: '100%',
              maxWidth: '32px',
              height: `${(d.value / Math.max(maxVal, 1)) * 100}%`,
              minHeight: '4px',
              background: d.color,
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.5s ease',
            }}
          />
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function MiniLineChart({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * 100},${100 - ((v - min) / range) * 80}`).join(' ');

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '40px' }} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const reportRef = useRef<HTMLDivElement>(null);
  const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const from = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  const { data, loading, error } = useFetch<Summary>(() => reportsApi.summary({ from, to }) as Promise<Summary>, [period]);

  const dailyStats = data?.dailyStats ?? [];
  const agentStats = data?.agentStats ?? [];
  const storageTrend = data?.storageTrend ?? [];

  const totalBackups = dailyStats.reduce((s, d) => s + d.backups, 0);
  const totalSuccess = dailyStats.reduce((s, d) => s + d.success, 0);
  const totalFailed = dailyStats.reduce((s, d) => s + d.failed, 0);
  const totalDataGb = dailyStats.reduce((s, d) => s + d.dataGb, 0);
  const successRate = totalBackups > 0 ? ((totalSuccess / totalBackups) * 100).toFixed(1) : '—';

  async function exportPdf() {
    try {
      const r = await reportsApi.exportPdf('summary');
      window.open(r.url, '_blank');
    } catch (e) {
      // Fall back to print-as-PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      printWindow.document.write(`
        <html><head><title>NinjaBackup Report</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 40px; color: #1a1a2e; }
          h1 { font-size: 24px; }
          .kpi-row { display: flex; gap: 16px; margin-bottom: 24px; }
          .kpi { flex: 1; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
          .kpi-val { font-size: 28px; font-weight: 800; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          th { background: #f9fafb; font-weight: 600; }
        </style></head><body>
          <h1>NinjaBackup — Backup Report</h1>
          <p>Period: ${period} · Generated: ${new Date().toLocaleString()}</p>
          <div class="kpi-row">
            <div class="kpi"><div class="kpi-val">${totalBackups}</div><div>Total Backups</div></div>
            <div class="kpi"><div class="kpi-val">${successRate}%</div><div>Success Rate</div></div>
            <div class="kpi"><div class="kpi-val">${totalFailed}</div><div>Failed</div></div>
            <div class="kpi"><div class="kpi-val">${(totalDataGb / 1000).toFixed(1)} TB</div><div>Data Processed</div></div>
          </div>
          <h2>Daily Breakdown</h2>
          <table><thead><tr><th>Date</th><th>Backups</th><th>Success</th><th>Failed</th><th>Data (GB)</th></tr></thead>
          <tbody>${dailyStats.map((d) => `<tr><td>${d.date}</td><td>${d.backups}</td><td>${d.success}</td><td>${d.failed}</td><td>${d.dataGb}</td></tr>`).join('')}</tbody></table>
          <h2>Agent Performance</h2>
          <table><thead><tr><th>Agent</th><th>Backups</th><th>Success Rate</th><th>Total Data</th><th>Avg Duration</th></tr></thead>
          <tbody>${agentStats.map((a) => `<tr><td>${a.agent}</td><td>${a.backups}</td><td>${a.successRate}%</td><td>${a.totalGb} GB</td><td>${a.avgDuration}</td></tr>`).join('')}</tbody></table>
        </body></html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="page-subtitle">Backup performance analytics</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <div
              style={{
                display: 'flex',
                gap: '2px',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                padding: '3px',
                border: '1px solid var(--border-default)',
              }}
            >
              {(['24h', '7d', '30d', '90d'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="btn btn-sm"
                  style={{
                    background: period === p ? 'var(--accent-primary)' : 'transparent',
                    color: period === p ? 'white' : 'var(--text-secondary)',
                    border: 'none',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={exportPdf}>
              📄 Export PDF
            </button>
          </div>
        </div>
      </header>

      <div className="page-body" ref={reportRef}>
        {error && (
          <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ color: 'var(--accent-danger)', fontSize: '0.85rem' }}>{error}</div>
          </div>
        )}

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>Loading report…</div>
        ) : (
          <>
            <div className="kpi-grid" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="kpi-card blue">
                <div className="kpi-icon blue">📦</div>
                <div className="kpi-value">{totalBackups}</div>
                <div className="kpi-label">Total Backups</div>
                <MiniLineChart values={dailyStats.map((d) => d.backups)} color="var(--accent-primary)" />
              </div>
              <div className="kpi-card green">
                <div className="kpi-icon green">✅</div>
                <div className="kpi-value">{successRate}%</div>
                <div className="kpi-label">Success Rate</div>
                <MiniLineChart values={dailyStats.map((d) => (d.backups > 0 ? (d.success / d.backups) * 100 : 0))} color="var(--accent-success)" />
              </div>
              <div className="kpi-card red">
                <div className="kpi-icon red">❌</div>
                <div className="kpi-value">{totalFailed}</div>
                <div className="kpi-label">Total Failed</div>
                <MiniLineChart values={dailyStats.map((d) => d.failed)} color="var(--accent-danger)" />
              </div>
              <div className="kpi-card yellow">
                <div className="kpi-icon yellow">💾</div>
                <div className="kpi-value">{(totalDataGb / 1000).toFixed(1)} TB</div>
                <div className="kpi-label">Data Processed</div>
                <MiniLineChart values={dailyStats.map((d) => d.dataGb)} color="var(--accent-warning)" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
              <div className="card">
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>📊 Daily Backup Volume</h3>
                {dailyStats.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)' }}>No data for selected period.</div>
                ) : (
                  <BarChart
                    data={dailyStats.map((d) => ({ label: d.date, value: d.backups, color: 'var(--accent-primary)' }))}
                    maxVal={Math.max(...dailyStats.map((d) => d.backups), 1) * 1.2}
                  />
                )}
              </div>

              <div className="card">
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>💾 Storage Growth</h3>
                {storageTrend.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)' }}>No data.</div>
                ) : (
                  <BarChart
                    data={storageTrend.map((d) => ({ label: d.date, value: d.usedTb * 10, color: 'var(--accent-purple)' }))}
                    maxVal={Math.max(...storageTrend.map((d) => d.usedTb * 10), 1) * 1.2}
                  />
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">🖥️ Agent Performance</h3>
              </div>
              {agentStats.length === 0 ? (
                <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>No agent activity in this period.</div>
              ) : (
                <div className="table-container" style={{ border: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Backups</th>
                        <th>Success Rate</th>
                        <th>Total Data</th>
                        <th>Avg Duration</th>
                        <th>Health</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentStats.map((a) => (
                        <tr key={a.agent}>
                          <td style={{ fontWeight: 600 }}>{a.agent}</td>
                          <td>{a.backups}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div className="progress-bar" style={{ flex: 1, maxWidth: '80px' }}>
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${a.successRate}%`,
                                    background:
                                      a.successRate >= 95 ? 'var(--accent-success)' : a.successRate >= 85 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{a.successRate}%</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{a.totalGb} GB</td>
                          <td style={{ fontSize: '0.85rem' }}>{a.avgDuration}</td>
                          <td>
                            <span className={`status-badge ${a.successRate >= 95 ? 'online' : a.successRate >= 85 ? 'pending' : 'error'}`}>
                              {a.successRate >= 95 ? 'Healthy' : a.successRate >= 85 ? 'Warning' : 'Critical'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
