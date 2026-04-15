import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHmac } from 'node:crypto';

@Injectable()
export class SnapshotsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, agentId?: string) {
    const where: any = { job: { agent: { tenantId } } };
    if (agentId) where.job.agentId = agentId;

    const snapshots = await this.prisma.snapshot.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        job: { include: { agent: { select: { id: true, hostname: true, displayName: true } } } },
      },
    });

    return snapshots.map((s) => this.serialize(s));
  }

  async findByAgent(tenantId: string, agentId: string) {
    return this.findAll(tenantId, agentId);
  }

  async findOne(tenantId: string, id: string) {
    const snapshot = await this.prisma.snapshot.findFirst({
      where: { id, job: { agent: { tenantId } } },
      include: { job: { include: { agent: { select: { hostname: true, displayName: true } } } } },
    });
    if (!snapshot) throw new NotFoundException('Snapshot not found');
    return this.serialize(snapshot);
  }

  /**
   * Browse a snapshot at a given path. Returns the directory listing.
   *
   * In production this would shell out to `restic ls` against the snapshot's
   * repository. For now we return a structured stub that the agent can populate
   * via a side-channel index.
   */
  async browse(tenantId: string, id: string, path: string) {
    const snapshot = await this.prisma.snapshot.findFirst({
      where: { id, job: { agent: { tenantId } } },
      include: { job: { select: { id: true, type: true } } },
    });
    if (!snapshot) throw new NotFoundException('Snapshot not found');

    // The actual file index is produced by the agent and may be cached as JSON
    // in `snapshot.partitionInfo` or fetched on-demand from the agent.
    // For now, return an empty result so the UI surfaces the empty-state cleanly.
    const index = (snapshot.partitionInfo as any) ?? null;
    const entries = index?.[path || '/'] ?? [];

    return {
      snapshotId: id,
      path: path || '/',
      type: snapshot.job.type,
      entries,
    };
  }

  async versions(tenantId: string, snapshotId: string, path: string) {
    const seed = await this.prisma.snapshot.findFirst({
      where: { id: snapshotId, job: { agent: { tenantId } } },
      select: { job: { select: { agentId: true } } },
    });
    if (!seed) throw new NotFoundException('Snapshot not found');

    // Look across all snapshots for this agent and return synthetic versions.
    const all = await this.prisma.snapshot.findMany({
      where: { job: { agentId: seed.job.agentId, agent: { tenantId } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, createdAt: true, totalSize: true },
    });

    return all.map((s) => ({
      snapshotId: s.id,
      path,
      modified: s.createdAt,
      sizeBytes: s.totalSize.toString(),
    }));
  }

  /**
   * Generate a pre-signed URL for downloading a single file from a snapshot.
   *
   * In production the agent (or a sidecar) reconstructs the file from restic
   * and uploads it to a tempolocation (S3 with presigned URL, or a local download
   * proxy with HMAC-protected token). Here we return a tokenized URL that the
   * agent will accept.
   */
  async generateDownloadUrl(tenantId: string, snapshotId: string, path: string) {
    const snapshot = await this.prisma.snapshot.findFirst({
      where: { id: snapshotId, job: { agent: { tenantId } } },
      select: { id: true, job: { select: { agentId: true } } },
    });
    if (!snapshot) throw new NotFoundException('Snapshot not found');

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    const secret = process.env.DOWNLOAD_URL_SECRET ?? 'dev-secret';
    const payload = `${snapshot.id}|${path}|${expiresAt.getTime()}`;
    const token = createHmac('sha256', secret).update(payload).digest('hex');
    const base = process.env.PUBLIC_API_URL ?? '';
    const qs = new URLSearchParams({
      path,
      expires: String(expiresAt.getTime()),
      token,
    });

    return {
      url: `${base}/api/v1/snapshots/${snapshot.id}/file?${qs.toString()}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  private serialize(s: any) {
    return {
      id: s.id,
      jobId: s.jobId,
      agentId: s.job?.agentId,
      agentHostname: s.job?.agent?.displayName ?? s.job?.agent?.hostname,
      type: s.type,
      sizeBytes: s.totalSize?.toString?.() ?? '0',
      filesCount: s.totalFiles ?? 0,
      paths: this.extractPaths(s),
      createdAt: s.createdAt,
      durationSec: this.computeDuration(s.job),
      isLocked: s.isLocked,
      expiresAt: s.expiresAt,
    };
  }

  private extractPaths(s: any): string[] {
    if (s.type === 'IMAGE') return ['Full Disk Image'];
    const partitionInfo = s.partitionInfo;
    if (partitionInfo && Array.isArray(partitionInfo.includePaths)) return partitionInfo.includePaths;
    return [];
  }

  private computeDuration(job: any): number | null {
    if (!job?.startedAt || !job?.completedAt) return null;
    return Math.floor((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000);
  }
}
