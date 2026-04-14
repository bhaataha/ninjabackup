import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SnapshotsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByAgent(tenantId: string, agentId: string) {
    return this.prisma.snapshot.findMany({
      where: { job: { agentId, agent: { tenantId } } },
      orderBy: { createdAt: 'desc' },
      include: { job: { select: { id: true, type: true, status: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const snapshot = await this.prisma.snapshot.findFirst({
      where: { id, job: { agent: { tenantId } } },
      include: { job: { include: { agent: { select: { hostname: true } } } } },
    });
    if (!snapshot) throw new NotFoundException('Snapshot not found');
    return { ...snapshot, totalSize: snapshot.totalSize.toString() };
  }
}
