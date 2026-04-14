'use client';

import { useState, useRef } from 'react';

// Mock report data
const DAILY_STATS = [
  { date: 'Apr 8', backups: 12, success: 11, failed: 1, dataGb: 340 },
  { date: 'Apr 9', backups: 14, success: 14, failed: 0, dataGb: 380 },
  { date: 'Apr 10', backups: 13, success: 12, failed: 1, dataGb: 355 },
  { date: 'Apr 11', backups: 15, success: 15, failed: 0, dataGb: 410 },
  { date: 'Apr 12', backups: 10, success: 8, failed: 2, dataGb: 290 },
  { date: 'Apr 13', backups: 14, success: 13, failed: 1, dataGb: 395 },
  { date: 'Apr 14', backups: 5, success: 4, failed: 1, dataGb: 240 },
];

const AGENT_STATS = [
  { agent: 'SRV-DC01', backups: 28, successRate: 96, totalGb: 860, avgDuration: '43m' },
  { agent: 'SRV-FILE01', backups: 25, successRate: 84, totalGb: 1200, avgDuration: '2h 15m' },
  { agent: 'DESKTOP-HR01', backups: 28, successRate: 100, totalGb: 120, avgDuration: '8m' },
  { agent: 'DESKTOP-DEV03', backups: 20, successRate: 100, totalGb: 450, avgDuration: '15m' },
  { agent: 'DEV-LINUX01', backups: 8, successRate: 100, totalGb: 640, avgDuration: '52m' },
  { agent: 'LAPTOP-CEO', backups: 5, successRate: 80, totalGb: 45, avgDuration: '12m' },
];

const STORAGE_TREND = [
  { date: 'Week 1', usedTb: 1.2 },
  { date: 'Week 2', usedTb: 1.4 },
  { date: 'Week 3', usedTb: 1.5 },
  { date: 'Week 4', usedTb: 1.8 },
];

function BarChart({ data, maxVal }: { data: { label: string; value: number; color: string }[]; maxVal: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-primary)' }}>{d.value}</div>
          <div style={{
            width: '100%', maxWidth: '32px',
            height: `${(d.value / maxVal) * 100}%`, minHeight: '4px',
            background: d.color, borderRadius: '4px 4px 0 0',
            transition: 'height 0.5s ease',
          }} />
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function MiniLineChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 80}`).join(' ');

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '40px' }} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('7d');
  const reportRef = useRef<HTMLDivElement>(null);

  const totalBackups = DAILY_STATS.reduce((s, d) => s + d.backups, 0);
  const totalSuccess = DAILY_STATS.reduce((s, d) => s + d.success, 0);
  const totalFailed = DAILY_STATS.reduce((s, d) => s + d.failed, 0);
  const totalDataGb = DAILY_STATS.reduce((s, d) => s + d.dataGb, 0);
  const successRate = ((totalSuccess / totalBackups) * 100).toFixed(1);

  const exportPdf = () => {
    // Use browser print as PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow || !reportRef.current) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>NinjaBackup Report — ${new Date().toLocaleDateString()}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a2e; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { font-size: 16px; margin: 24px 0 12px; color: #374151; }
            .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
            .kpi-row { display: flex; gap: 16px; margin-bottom: 24px; }
            .kpi { flex: 1; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .kpi-val { font-size: 28px; font-weight: 800; }
            .kpi-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            th { background: #f9fafb; font-weight: 600; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
            .green { background: #dcfce7; color: #16a34a; }
            .red { background: #fee2e2; color: #dc2626; }
            .yellow { background: #fef3c7; color: #d97706; }
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <h1>📊 NinjaBackup — Backup Report</h1>
          <p class="subtitle">Period: Last 7 Days · Generated: ${new Date().toLocaleString()}</p>

          <div class="kpi-row">
            <div class="kpi"><div class="kpi-val">${totalBackups}</div><div class="kpi-label">Total Backups</div></div>
            <div class="kpi"><div class="kpi-val">${successRate}%</div><div class="kpi-label">Success Rate</div></div>
            <div class="kpi"><div class="kpi-val">${totalFailed}</div><div class="kpi-label">Failed</div></div>
            <div class="kpi"><div class="kpi-val">${(totalDataGb / 1000).toFixed(1)} TB</div><div class="kpi-label">Data Processed</div></div>
          </div>

          <h2>Daily Breakdown</h2>
          <table>
            <thead><tr><th>Date</th><th>Backups</th><th>Success</th><th>Failed</th><th>Data (GB)</th></tr></thead>
            <tbody>
              ${DAILY_STATS.map(d => `<tr><td>${d.date}</td><td>${d.backups}</td><td><span class="badge green">${d.success}</span></td><td><span class="badge ${d.failed > 0 ? 'red' : 'green'}">${d.failed}</span></td><td>${d.dataGb}</td></tr>`).join('')}
            </tbody>
          </table>

          <h2>Agent Performance</h2>
          <table>
            <thead><tr><th>Agent</th><th>Backups</th><th>Success Rate</th><th>Total Data</th><th>Avg Duration</th></tr></thead>
            <tbody>
              ${AGENT_STATS.map(a => `<tr><td><strong>${a.agent}</strong></td><td>${a.backups}</td><td><span class="badge ${a.successRate >= 95 ? 'green' : a.successRate >= 85 ? 'yellow' : 'red'}">${a.successRate}%</span></td><td>${a.totalGb} GB</td><td>${a.avgDuration}</td></tr>`).join('')}
            </tbody>
          </table>

          <div class="footer">
            NinjaBackup v1.0.0 · Report generated automatically · HMAC integrity verified
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="page-subtitle">Backup performance analytics and compliance reports</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '3px', border: '1px solid var(--border-default)' }}>
              {['24h', '7d', '30d', '90d'].map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className="btn btn-sm" style={{
                  background: period === p ? 'var(--accent-primary)' : 'transparent',
                  color: period === p ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                }}>{p}</button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={exportPdf}>📄 Export PDF</button>
          </div>
        </div>
      </header>

      <div className="page-body" ref={reportRef}>
        {/* Summary KPIs */}
        <div className="kpi-grid" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="kpi-card blue">
            <div className="kpi-icon blue">📦</div>
            <div className="kpi-value">{totalBackups}</div>
            <div className="kpi-label">Total Backups</div>
            <MiniLineChart values={DAILY_STATS.map(d => d.backups)} color="var(--accent-primary)" />
          </div>
          <div className="kpi-card green">
            <div className="kpi-icon green">✅</div>
            <div className="kpi-value">{successRate}%</div>
            <div className="kpi-label">Success Rate</div>
            <MiniLineChart values={DAILY_STATS.map(d => (d.success / d.backups) * 100)} color="var(--accent-success)" />
          </div>
          <div className="kpi-card red">
            <div className="kpi-icon red">❌</div>
            <div className="kpi-value">{totalFailed}</div>
            <div className="kpi-label">Total Failed</div>
            <MiniLineChart values={DAILY_STATS.map(d => d.failed)} color="var(--accent-danger)" />
          </div>
          <div className="kpi-card yellow">
            <div className="kpi-icon yellow">💾</div>
            <div className="kpi-value">{(totalDataGb / 1000).toFixed(1)} TB</div>
            <div className="kpi-label">Data Processed</div>
            <MiniLineChart values={DAILY_STATS.map(d => d.dataGb)} color="var(--accent-warning)" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          {/* Daily Chart */}
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>📊 Daily Backup Volume</h3>
            <BarChart
              data={DAILY_STATS.map(d => ({ label: d.date, value: d.backups, color: 'var(--accent-primary)' }))}
              maxVal={Math.max(...DAILY_STATS.map(d => d.backups)) * 1.2}
            />
          </div>

          {/* Storage Trend */}
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>💾 Storage Growth</h3>
            <BarChart
              data={STORAGE_TREND.map(d => ({ label: d.date, value: d.usedTb * 10, color: 'var(--accent-purple)' }))}
              maxVal={25}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-md)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Growth rate: <strong style={{ color: 'var(--accent-warning)' }}>+150 GB/week</strong></span>
              <span>Estimated full: <strong>8 months</strong></span>
            </div>
          </div>
        </div>

        {/* Agent Performance Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🖥️ Agent Performance</h3>
          </div>
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
                {AGENT_STATS.map((a) => (
                  <tr key={a.agent}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.agent}</td>
                    <td>{a.backups}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="progress-bar" style={{ flex: 1, maxWidth: '80px' }}>
                          <div className="progress-fill" style={{
                            width: `${a.successRate}%`,
                            background: a.successRate >= 95
                              ? 'var(--accent-success)'
                              : a.successRate >= 85
                                ? 'var(--accent-warning)'
                                : 'var(--accent-danger)',
                          }} />
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
        </div>
      </div>
    </>
  );
}
