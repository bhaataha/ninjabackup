import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../gateway/events.gateway';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: EventsGateway,
  ) {}

  async findAll(
    tenantId: string,
    params: { status?: string; agentId?: string; type?: string; page?: number; limit?: number } = {},
  ) {
    const { status, agentId, type, page = 1, limit = 20 } = params;

    const where: any = { agent: { tenantId } };
    if (status) where.status = status;
    if (agentId) where.agentId = agentId;
    if (type) where.type = type;

    const [jobs, total] = await Promise.all([
      this.prisma.backupJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          agent: { select: { id: true, hostname: true, displayName: true } },
          policy: { select: { id: true, name: true } },
          _count: { select: { snapshots: true } },
        },
      }),
      this.prisma.backupJob.count({ where }),
    ]);

    return {
      data: jobs.map((j) => ({
        ...j,
        bytesProcessed: j.bytesProcessed.toString(),
        bytesUploaded: j.bytesUploaded.toString(),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string) {
    const job = await this.prisma.backupJob.findFirst({
      where: { id, agent: { tenantId } },
      include: {
        agent: { select: { id: true, hostname: true, displayName: true } },
        policy: true,
        snapshots: true,
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return {
      ...job,
      bytesProcessed: job.bytesProcessed.toString(),
      bytesUploaded: job.bytesUploaded.toString(),
    };
  }

  /**
   * Trigger a manual backup job for an agent.
   */
  async triggerBackup(tenantId: string, agentId: string, policyId?: string, type: string = 'FILE') {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, tenantId },
      include: { agentPolicies: { include: { policy: true } } },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    let policy: any = null;
    if (policyId) {
      policy = await this.prisma.backupPolicy.findFirst({
        where: { id: policyId, tenantId },
        include: { storageVault: true },
      });
      if (!policy) throw new NotFoundException('Policy not found');
    }

    const job = await this.prisma.backupJob.create({
      data: {
        agentId,
        policyId: policyId || null,
        type: type as any,
        status: 'PENDING',
        triggeredBy: 'manual',
      },
    });

    this.gateway.sendAgentCommand(agentId, 'backup:start', {
      jobId: job.id,
      type,
      policyId: policy?.id ?? null,
      includePaths: policy?.includePaths ?? [],
      excludePatterns: policy?.excludePatterns ?? [],
      bandwidthLimitMbps: policy?.bandwidthLimitMbps ?? 0,
      vssEnabled: policy?.vssEnabled ?? false,
    });

    return job;
  }

  /**
   * Update job status (called by agent during backup).
   */
  async updateJobStatus(
    jobId: string,
    data: {
      status?: string;
      bytesProcessed?: number;
      bytesUploaded?: number;
      filesNew?: number;
      filesChanged?: number;
      filesUnchanged?: number;
      errorsCount?: number;
      progressPercent?: number;
      errorMessage?: string;
    },
  ) {
    const updateData: any = { ...data };

    if (data.status === 'RUNNING' && !data.bytesProcessed) {
      updateData.startedAt = new Date();
    }
    if (data.status === 'SUCCESS' || data.status === 'FAILED') {
      updateData.completedAt = new Date();
      const job = await this.prisma.backupJob.findUnique({ where: { id: jobId } });
      if (job?.startedAt) {
        updateData.durationSeconds = (Date.now() - job.startedAt.getTime()) / 1000;
      }
    }

    // Convert to BigInt for Prisma
    if (data.bytesProcessed !== undefined) updateData.bytesProcessed = BigInt(data.bytesProcessed);
    if (data.bytesUploaded !== undefined) updateData.bytesUploaded = BigInt(data.bytesUploaded);

    return this.prisma.backupJob.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  async cancelJob(tenantId: string, jobId: string) {
    const job = await this.prisma.backupJob.findFirst({
      where: { id: jobId, agent: { tenantId } },
    });
    if (!job) throw new NotFoundException('Job not found');

    await this.prisma.backupJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    this.gateway.sendAgentCommand(job.agentId, 'backup:cancel', { jobId });

    return { cancelled: true };
  }

  /**
   * Get job stats summary for the dashboard.
   */
  async getStats(tenantId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todaySuccess, todayFailed, weekJobs, totalStorage] = await Promise.all([
      this.prisma.backupJob.count({
        where: {
          agent: { tenantId },
          status: 'SUCCESS',
          completedAt: { gte: today },
        },
      }),
      this.prisma.backupJob.count({
        where: {
          agent: { tenantId },
          status: 'FAILED',
          completedAt: { gte: today },
        },
      }),
      this.prisma.backupJob.groupBy({
        by: ['status'],
        where: { agent: { tenantId }, createdAt: { gte: weekAgo } },
        _count: true,
      }),
      this.prisma.storageVault.aggregate({
        where: { tenantId, active: true },
        _sum: { usedBytes: true },
      }),
    ]);

    return {
      today: { success: todaySuccess, failed: todayFailed },
      weekSummary: weekJobs,
      totalStorageUsed: totalStorage._sum.usedBytes?.toString() || '0',
    };
  }
}
