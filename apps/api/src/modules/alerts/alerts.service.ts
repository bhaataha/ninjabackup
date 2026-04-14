import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRule(tenantId: string, data: any) {
    return this.prisma.alertRule.create({ data: { tenantId, ...data } });
  }

  async findAllRules(tenantId: string) {
    return this.prisma.alertRule.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async updateRule(tenantId: string, id: string, data: any) {
    const rule = await this.prisma.alertRule.findFirst({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('Alert rule not found');
    return this.prisma.alertRule.update({ where: { id }, data });
  }

  async deleteRule(tenantId: string, id: string) {
    const rule = await this.prisma.alertRule.findFirst({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('Alert rule not found');
    await this.prisma.alertRule.delete({ where: { id } });
    return { deleted: true };
  }

  async findAlerts(tenantId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.alert.findMany({
        where: { rule: { tenantId } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.alert.count({ where: { rule: { tenantId } } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async acknowledge(tenantId: string, id: string) {
    return this.prisma.alert.update({
      where: { id },
      data: { acknowledged: true, acknowledgedAt: new Date() },
    });
  }
}
