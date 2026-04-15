import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { organization: true, _count: { select: { agents: true } } },
    });
    if (!tenant) throw new NotFoundException();

    const vaults = await this.prisma.storageVault.findMany({ where: { tenantId } });
    const usedBytes = vaults.reduce((s, v) => s + Number(v.usedBytes ?? 0n), 0);

    const settings = (tenant.settings ?? {}) as any;

    return {
      organization: { name: tenant.organization.name },
      tenant: { name: tenant.name, slug: tenant.slug },
      plan: {
        tier: tenant.organization.plan,
        agentLimit: tenant.agentLimit,
        storageQuotaGb: tenant.storageQuotaGb,
        retention: settings.retention ?? 'Per policy',
      },
      usage: {
        agents: tenant._count.agents,
        storageBytes: usedBytes,
      },
      security: {
        enforceMfa: !!settings.enforceMfa,
        zkeEnabled: !!tenant.encryptedDekEnvelope,
        wormStorage: !!settings.wormStorage,
      },
      apiKeyPrefix: 'nb_live_',
      webhookUrl: settings.defaultWebhookUrl ?? '',
    };
  }

  async update(tenantId: string, data: any) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException();
    const current = (tenant.settings ?? {}) as any;
    const next = {
      ...current,
      enforceMfa: data.security?.enforceMfa ?? current.enforceMfa,
      wormStorage: data.security?.wormStorage ?? current.wormStorage,
      defaultWebhookUrl: data.webhookUrl ?? current.defaultWebhookUrl,
      retention: data.plan?.retention ?? current.retention,
    };
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.tenant?.name ?? tenant.name,
        settings: next,
      },
    });
    if (data.organization?.name) {
      await this.prisma.organization.update({
        where: { id: tenant.organizationId },
        data: { name: data.organization.name },
      });
    }
    return this.get(tenantId);
  }
}
