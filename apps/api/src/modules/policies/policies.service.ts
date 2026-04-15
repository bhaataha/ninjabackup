import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePolicyDto } from './dto/create-policy.dto';

@Injectable()
export class PoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePolicyDto) {
    const { type, ...rest } = dto;
    return this.prisma.backupPolicy.create({
      data: { tenantId, ...rest, type: type as any },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.backupPolicy.findMany({
      where: { tenantId },
      include: {
        storageVault: { select: { id: true, name: true, type: true } },
        _count: { select: { agentPolicies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const policy = await this.prisma.backupPolicy.findFirst({
      where: { id, tenantId },
      include: {
        storageVault: true,
        agentPolicies: { include: { agent: { select: { id: true, hostname: true, status: true } } } },
      },
    });
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  async update(tenantId: string, id: string, dto: Partial<CreatePolicyDto>) {
    const policy = await this.prisma.backupPolicy.findFirst({ where: { id, tenantId } });
    if (!policy) throw new NotFoundException('Policy not found');
    return this.prisma.backupPolicy.update({ where: { id }, data: dto as any });
  }

  async remove(tenantId: string, id: string) {
    const policy = await this.prisma.backupPolicy.findFirst({ where: { id, tenantId } });
    if (!policy) throw new NotFoundException('Policy not found');
    await this.prisma.backupPolicy.delete({ where: { id } });
    return { deleted: true };
  }

  async assignToAgent(tenantId: string, policyId: string, agentId: string) {
    // Verify both belong to tenant
    const [policy, agent] = await Promise.all([
      this.prisma.backupPolicy.findFirst({ where: { id: policyId, tenantId } }),
      this.prisma.agent.findFirst({ where: { id: agentId, tenantId } }),
    ]);
    if (!policy) throw new NotFoundException('Policy not found');
    if (!agent) throw new NotFoundException('Agent not found');

    return this.prisma.agentPolicy.upsert({
      where: { agentId_policyId: { agentId, policyId } },
      create: { agentId, policyId },
      update: {},
    });
  }

  async unassignFromAgent(tenantId: string, policyId: string, agentId: string) {
    await this.prisma.agentPolicy.deleteMany({
      where: { agentId, policyId },
    });
    return { unassigned: true };
  }

  /**
   * Return enabled policies assigned to an agent, shaped for the agent runtime
   * (no encrypted credentials, only fields the agent needs to schedule + run).
   */
  async findForAgent(agentId: string) {
    const rows = await this.prisma.agentPolicy.findMany({
      where: { agentId, policy: { enabled: true } },
      include: {
        policy: {
          include: {
            storageVault: {
              select: { id: true, type: true, endpoint: true, bucket: true, region: true, prefix: true },
            },
          },
        },
      },
    });

    return rows.map((row) => {
      const p = row.policy;
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        scheduleCron: p.scheduleCron,
        enabled: p.enabled,
        includePaths: p.includePaths,
        excludePatterns: p.excludePatterns,
        retentionHourly: p.retentionHourly,
        retentionDaily: p.retentionDaily,
        retentionWeekly: p.retentionWeekly,
        retentionMonthly: p.retentionMonthly,
        retentionYearly: p.retentionYearly,
        retentionLast: p.retentionLast,
        bandwidthLimitMbps: p.bandwidthLimitMbps ?? 0,
        cpuPriority: p.cpuPriority,
        compressionEnabled: p.compressionEnabled,
        vssEnabled: p.vssEnabled,
        storageVault: p.storageVault
          ? {
              id: p.storageVault.id,
              type: p.storageVault.type,
              endpoint: p.storageVault.endpoint,
              bucket: p.storageVault.bucket,
              region: p.storageVault.region,
              prefix: p.storageVault.prefix,
            }
          : null,
      };
    });
  }
}
