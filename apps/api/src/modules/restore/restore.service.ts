import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../gateway/events.gateway';
import { CommandsService } from '../agents/commands.service';

@Injectable()
export class RestoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: EventsGateway,
    private readonly commands: CommandsService,
  ) {}

  async create(
    tenantId: string,
    data: {
      agentId: string;
      snapshotId: string;
      type?: string;
      selectedPaths?: string[];
      targetPath?: string;
      overwriteExisting?: boolean;
    },
  ) {
    const agent = await this.prisma.agent.findFirst({ where: { id: data.agentId, tenantId } });
    if (!agent) throw new NotFoundException('Agent not found');

    const snapshot = await this.prisma.snapshot.findFirst({
      where: { id: data.snapshotId, job: { agent: { tenantId } } },
      include: { job: { select: { agentId: true } } },
    });
    if (!snapshot) throw new NotFoundException('Snapshot not found');

    // Infer restore type from the snapshot if not supplied.
    const type =
      (data.type as 'FULL' | 'SELECTIVE' | 'IMAGE') ??
      (snapshot.type === 'IMAGE' ? 'IMAGE' : data.selectedPaths?.length ? 'SELECTIVE' : 'FULL');

    const job = await this.prisma.restoreJob.create({
      data: {
        agentId: data.agentId,
        snapshotId: data.snapshotId,
        type,
        selectedPaths: data.selectedPaths,
        targetPath: data.targetPath,
        overwriteExisting: !!data.overwriteExisting,
        status: 'PENDING',
      },
    });

    // Dispatch command to the agent — both persisted (for offline pickup) and
    // pushed live via WebSocket for instant delivery.
    const payload = {
      restoreJobId: job.id,
      snapshotId: data.snapshotId,
      resticSnapshotId: (snapshot as any).resticSnapshotId ?? null,
      sourceAgentId: snapshot.job.agentId,
      type,
      selectedPaths: data.selectedPaths ?? [],
      targetPath: data.targetPath ?? null,
      overwriteExisting: !!data.overwriteExisting,
    };
    await this.commands.enqueue(data.agentId, 'restore:start', payload);
    this.gateway.sendAgentCommand(data.agentId, 'restore:start', payload);

    return this.serialize(job);
  }

  async findAll(tenantId: string) {
    const jobs = await this.prisma.restoreJob.findMany({
      where: { agent: { tenantId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        agent: { select: { hostname: true, displayName: true } },
        snapshot: { select: { id: true, type: true, createdAt: true } },
      },
    });
    return jobs.map((j) => this.serialize(j));
  }

  async getStatus(tenantId: string, id: string) {
    const job = await this.prisma.restoreJob.findFirst({
      where: { id, agent: { tenantId } },
      include: {
        agent: { select: { hostname: true, displayName: true } },
        snapshot: { select: { id: true, type: true, createdAt: true } },
      },
    });
    if (!job) throw new NotFoundException('Restore job not found');
    return this.serialize(job);
  }

  /**
   * Agent reports progress mid-restore. Mirrors JobsService.updateJobStatus.
   */
  async updateStatus(
    jobId: string,
    data: {
      status?: string;
      bytesRestored?: number;
      filesRestored?: number;
      progressPercent?: number;
      errorMessage?: string;
    },
  ) {
    const updateData: any = { ...data };
    if (data.status === 'RUNNING') updateData.startedAt = new Date();
    if (data.status === 'SUCCESS' || data.status === 'FAILED') updateData.completedAt = new Date();
    if (data.bytesRestored !== undefined) updateData.bytesRestored = BigInt(data.bytesRestored);

    const updated = await this.prisma.restoreJob.update({
      where: { id: jobId },
      data: updateData,
      include: { agent: { select: { tenantId: true } } },
    });

    this.gateway.emitToTenant(updated.agent.tenantId, 'restore:progress', {
      restoreJobId: updated.id,
      agentId: updated.agentId,
      status: updated.status,
      progress: updated.progressPercent,
      bytesRestored: Number(updated.bytesRestored ?? 0n),
      filesRestored: updated.filesRestored,
      errorMessage: updated.errorMessage,
    });

    return updated;
  }

  /**
   * Preview a restore without dispatching anything to the agent. Returns
   * estimated counts so the user can sanity-check before committing.
   */
  async preview(
    tenantId: string,
    data: { snapshotId: string; agentId: string; selectedPaths?: string[]; targetPath?: string },
  ) {
    const snapshot = await this.prisma.snapshot.findFirst({
      where: { id: data.snapshotId, job: { agent: { tenantId } } },
      include: { job: { include: { agent: { select: { hostname: true } } } } },
    });
    if (!snapshot) throw new NotFoundException('Snapshot not found');
    const target = await this.prisma.agent.findFirst({ where: { id: data.agentId, tenantId } });
    if (!target) throw new NotFoundException('Target agent not found');

    return {
      snapshotId: snapshot.id,
      snapshotType: snapshot.type,
      snapshotCreatedAt: snapshot.createdAt,
      sourceAgent: snapshot.job.agent.hostname,
      targetAgent: target.hostname,
      selectedPaths: data.selectedPaths ?? [],
      pathCount: data.selectedPaths?.length ?? 0,
      // Best-effort estimate from the snapshot metadata.
      estimatedSizeBytes: snapshot.totalSize?.toString?.() ?? '0',
      estimatedFiles: snapshot.totalFiles ?? 0,
      targetPath: data.targetPath ?? '(original location)',
      requiresOverwrite: !!data.targetPath ? false : true,
      warnings: [
        ...(snapshot.type === 'IMAGE' ? ['Image restore will overwrite the entire target disk.'] : []),
        ...(target.id === snapshot.job.agentId ? [] : [`Cross-agent restore: source was ${snapshot.job.agent.hostname}, target is ${target.hostname}.`]),
      ],
    };
  }

  async cancel(tenantId: string, id: string) {
    const job = await this.prisma.restoreJob.findFirst({
      where: { id, agent: { tenantId } },
    });
    if (!job) throw new NotFoundException('Restore job not found');
    await this.prisma.restoreJob.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
    const payload = { restoreJobId: job.id };
    await this.commands.enqueue(job.agentId, 'restore:cancel', payload);
    this.gateway.sendAgentCommand(job.agentId, 'restore:cancel', payload);
    return { cancelled: true };
  }

  private serialize(j: any) {
    return {
      id: j.id,
      agentId: j.agentId,
      agentHostname: j.agent?.displayName ?? j.agent?.hostname,
      snapshotId: j.snapshotId,
      snapshot: j.snapshot,
      type: j.type,
      status: j.status,
      progress: j.progressPercent ?? 0,
      bytesRestored: j.bytesRestored?.toString?.() ?? '0',
      filesRestored: j.filesRestored ?? 0,
      selectedPaths: j.selectedPaths,
      targetPath: j.targetPath,
      startedAt: j.startedAt,
      completedAt: j.completedAt,
      errorMessage: j.errorMessage,
      createdAt: j.createdAt,
    };
  }
}
