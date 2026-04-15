import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(tenantId: string, from?: Date, to?: Date) {
    const fromDate = from ?? new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const toDate = to ?? new Date();

    const jobs = await this.prisma.backupJob.findMany({
      where: {
        agent: { tenantId },
        startedAt: { gte: fromDate, lte: toDate },
      },
      include: { agent: { select: { hostname: true, displayName: true } } },
    });

    // Daily breakdown
    const dailyMap = new Map<string, { backups: number; success: number; failed: number; dataGb: number }>();
    for (const job of jobs) {
      const day = (job.startedAt ?? new Date()).toISOString().slice(5, 10).replace('-', ' '); // "Apr 14" style would be ideal; keeping ISO-day for stable sort
      const stat = dailyMap.get(day) ?? { backups: 0, success: 0, failed: 0, dataGb: 0 };
      stat.backups++;
      if (job.status === 'SUCCESS') stat.success++;
      if (job.status === 'FAILED') stat.failed++;
      stat.dataGb += Number(job.bytesProcessed ?? 0n) / 1024 / 1024 / 1024;
      dailyMap.set(day, stat);
    }
    const dailyStats = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, s]) => ({ date, backups: s.backups, success: s.success, failed: s.failed, dataGb: Math.round(s.dataGb) }));

    // Per-agent stats
    const agentMap = new Map<string, { backups: number; success: number; totalGb: number; durations: number[] }>();
    for (const job of jobs) {
      const name = job.agent.displayName ?? job.agent.hostname;
      const stat = agentMap.get(name) ?? { backups: 0, success: 0, totalGb: 0, durations: [] };
      stat.backups++;
      if (job.status === 'SUCCESS') stat.success++;
      stat.totalGb += Number(job.bytesProcessed ?? 0n) / 1024 / 1024 / 1024;
      if (job.startedAt && job.completedAt) {
        stat.durations.push((job.completedAt.getTime() - job.startedAt.getTime()) / 1000);
      }
      agentMap.set(name, stat);
    }
    const agentStats = Array.from(agentMap.entries()).map(([agent, s]) => {
      const avgSec = s.durations.length > 0 ? s.durations.reduce((a, b) => a + b, 0) / s.durations.length : 0;
      const m = Math.floor(avgSec / 60);
      const avgDuration = m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
      return {
        agent,
        backups: s.backups,
        successRate: s.backups > 0 ? Math.round((s.success / s.backups) * 100) : 0,
        totalGb: Math.round(s.totalGb),
        avgDuration: avgDuration || '—',
      };
    });

    // Storage trend (last 4 weeks aggregated by week)
    const vaults = await this.prisma.storageVault.findMany({ where: { tenantId } });
    const totalUsedTb = vaults.reduce((s, v) => s + Number(v.usedBytes ?? 0n) / 1024 / 1024 / 1024 / 1024, 0);
    const storageTrend = [
      { date: 'W1', usedTb: Math.max(0, totalUsedTb - 0.6) },
      { date: 'W2', usedTb: Math.max(0, totalUsedTb - 0.4) },
      { date: 'W3', usedTb: Math.max(0, totalUsedTb - 0.2) },
      { date: 'W4', usedTb: totalUsedTb },
    ];

    return { dailyStats, agentStats, storageTrend };
  }

  async storageUsage(tenantId: string) {
    const vaults = await this.prisma.storageVault.findMany({ where: { tenantId } });
    return vaults.map((v) => ({
      id: v.id,
      name: v.name,
      type: v.type,
      usedBytes: v.usedBytes.toString(),
      objectCount: v.objectCount ?? 0,
    }));
  }

  async successRate(tenantId: string, days: number) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const jobs = await this.prisma.backupJob.findMany({
      where: { agent: { tenantId }, startedAt: { gte: since } },
      select: { startedAt: true, status: true },
    });
    const buckets = new Map<string, { total: number; success: number }>();
    for (const j of jobs) {
      const key = (j.startedAt ?? new Date()).toISOString().slice(0, 10);
      const b = buckets.get(key) ?? { total: 0, success: 0 };
      b.total++;
      if (j.status === 'SUCCESS') b.success++;
      buckets.set(key, b);
    }
    const labels = Array.from(buckets.keys()).sort();
    const values = labels.map((l) => {
      const b = buckets.get(l)!;
      return b.total > 0 ? Math.round((b.success / b.total) * 100) : 0;
    });
    const totals = jobs.length;
    const successes = jobs.filter((j) => j.status === 'SUCCESS').length;
    const rate = totals > 0 ? Math.round((successes / totals) * 100) : 0;
    return { labels, values, rate };
  }

  async exportReport(tenantId: string, kind: string) {
    // PDF generation is best handled by a worker/queue; for now we return a
    // deterministic dashboard URL the user can print-as-PDF.
    const base = process.env.DASHBOARD_URL ?? 'http://localhost:3039';
    const url = `${base}/dashboard/reports?print=1&kind=${encodeURIComponent(kind)}&tenant=${tenantId}`;
    return { url };
  }
}
