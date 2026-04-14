import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RestoreService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, data: { agentId: string; snapshotId: string; type: string; selectedPaths?: string[]; targetPath?: string }) {
    const agent = await this.prisma.agent.findFirst({ where: { id: data.agentId, tenantId } });
    if (!agent) throw new NotFoundException('Agent not found');

    return this.prisma.restoreJob.create({
      data: {
        agentId: data.agentId,
        snapshotId: data.snapshotId,
        type: data.type as any,
        selectedPaths: data.selectedPaths,
        targetPath: data.targetPath,
        status: 'PENDING',
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.restoreJob.findMany({
      where: { agent: { tenantId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        agent: { select: { hostname: true } },
        snapshot: { select: { id: true, type: true, createdAt: true } },
      },
    });
  }

  async getStatus(tenantId: string, id: string) {
    const job = await this.prisma.restoreJob.findFirst({
      where: { id, agent: { tenantId } },
    });
    if (!job) throw new NotFoundException('Restore job not found');
    return { ...job, bytesRestored: job.bytesRestored.toString() };
  }
}
