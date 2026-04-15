import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../auth/decorators/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * In-app notifications come from `Alert` rows. Marking as read is tracked by
   * the existing `acknowledged` field. The TopBar uses this list.
   */
  @Get()
  async list(@TenantId() tid: string) {
    const alerts = await this.prisma.alert.findMany({
      where: { rule: { tenantId: tid } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { rule: true },
    });
    return alerts.map((a) => ({
      id: a.id,
      type: this.severityMap(a.severity),
      title: a.title ?? a.rule?.type ?? 'Notification',
      message: a.message,
      createdAt: a.createdAt,
      read: a.acknowledged,
    }));
  }

  @Get('unread-count')
  async unreadCount(@TenantId() tid: string) {
    const count = await this.prisma.alert.count({ where: { rule: { tenantId: tid }, acknowledged: false } });
    return { count };
  }

  @Post(':id/read')
  async markRead(@TenantId() tid: string, @Param('id') id: string) {
    const alert = await this.prisma.alert.findFirst({ where: { id, rule: { tenantId: tid } } });
    if (!alert) return { ok: false };
    await this.prisma.alert.update({ where: { id }, data: { acknowledged: true, acknowledgedAt: new Date() } });
    return { ok: true };
  }

  @Post('read-all')
  async markAllRead(@TenantId() tid: string) {
    await this.prisma.alert.updateMany({
      where: { rule: { tenantId: tid }, acknowledged: false },
      data: { acknowledged: true, acknowledgedAt: new Date() },
    });
    return { ok: true };
  }

  private severityMap(s: string): 'error' | 'warning' | 'success' | 'info' {
    const lower = (s ?? '').toLowerCase();
    if (lower === 'critical' || lower === 'error') return 'error';
    if (lower === 'warning') return 'warning';
    if (lower === 'success') return 'success';
    return 'info';
  }
}
