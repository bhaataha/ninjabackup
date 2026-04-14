import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        organization: { select: { id: true, name: true, plan: true } },
        _count: { select: { users: true, agents: true, storageVaults: true, backupPolicies: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(tenantId: string, data: { name?: string; settings?: any }) {
    return this.prisma.tenant.update({ where: { id: tenantId }, data });
  }

  async getDashboard(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [tenant, agents, jobsToday, storage] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { _count: { select: { agents: true, users: true } } },
      }),
      this.prisma.agent.groupBy({
        by: ['status'],
        where: { tenantId, hostname: { not: { startsWith: 'pending-' } } },
        _count: true,
      }),
      this.prisma.backupJob.groupBy({
        by: ['status'],
        where: { agent: { tenantId }, createdAt: { gte: today } },
        _count: true,
      }),
      this.prisma.storageVault.aggregate({
        where: { tenantId, active: true },
        _sum: { usedBytes: true },
      }),
    ]);

    return {
      tenant: { id: tenant?.id, name: tenant?.name, agentLimit: tenant?.agentLimit, storageQuotaGb: tenant?.storageQuotaGb },
      agents: Object.fromEntries(agents.map((a) => [a.status, a._count])),
      jobsToday: Object.fromEntries(jobsToday.map((j) => [j.status, j._count])),
      storageUsedBytes: storage._sum.usedBytes?.toString() || '0',
    };
  }
}
