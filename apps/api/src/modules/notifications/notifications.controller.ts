import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../auth/decorators/tenant.decorator';
import { CurrentUser } from '../auth/decorators/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export const NOTIFICATION_EVENT_TYPES = [
  'BACKUP_SUCCESS',
  'BACKUP_FAILED',
  'AGENT_OFFLINE',
  'STORAGE_WARNING',
  'RESTORE_COMPLETE',
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export interface EventPrefs {
  email: boolean;
  inApp: boolean;
}

export interface NotificationPrefs {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  events: Partial<Record<NotificationEventType, EventPrefs>>;
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailEnabled: true,
  inAppEnabled: true,
  events: Object.fromEntries(
    NOTIFICATION_EVENT_TYPES.map((t) => [t, { email: true, inApp: true }]),
  ) as Record<NotificationEventType, EventPrefs>,
};

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

  // ─── Notification preferences ───────────────────────────────────────────

  @Get('prefs')
  @ApiOperation({ summary: 'Get current user notification preferences' })
  async getPrefs(@CurrentUser() user: { sub: string }) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { notificationPrefs: true },
    });
    const stored = (dbUser?.notificationPrefs as any) ?? {};
    return mergePrefs(stored);
  }

  @Put('prefs')
  @ApiOperation({ summary: 'Save current user notification preferences' })
  async savePrefs(
    @CurrentUser() user: { sub: string },
    @Body() body: Partial<NotificationPrefs>,
  ) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { notificationPrefs: true },
    });
    const current = mergePrefs((dbUser?.notificationPrefs as any) ?? {});
    const merged: NotificationPrefs = {
      emailEnabled: body.emailEnabled ?? current.emailEnabled,
      inAppEnabled: body.inAppEnabled ?? current.inAppEnabled,
      events: { ...current.events, ...(body.events ?? {}) },
    };
    await this.prisma.user.update({
      where: { id: user.sub },
      data: { notificationPrefs: merged as any },
    });
    return merged;
  }

  private severityMap(s: string): 'error' | 'warning' | 'success' | 'info' {
    const lower = (s ?? '').toLowerCase();
    if (lower === 'critical' || lower === 'error') return 'error';
    if (lower === 'warning') return 'warning';
    if (lower === 'success') return 'success';
    return 'info';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Deep-merge stored prefs with defaults so new event types always have values. */
function mergePrefs(stored: Partial<NotificationPrefs>): NotificationPrefs {
  const defaultEvents = DEFAULT_PREFS.events as Record<string, EventPrefs>;
  const storedEvents = (stored.events ?? {}) as Record<string, EventPrefs>;
  const mergedEvents = Object.fromEntries(
    NOTIFICATION_EVENT_TYPES.map((t) => [
      t,
      { ...defaultEvents[t], ...(storedEvents[t] ?? {}) },
    ]),
  ) as Record<NotificationEventType, EventPrefs>;
  return {
    emailEnabled: stored.emailEnabled ?? DEFAULT_PREFS.emailEnabled,
    inAppEnabled: stored.inAppEnabled ?? DEFAULT_PREFS.inAppEnabled,
    events: mergedEvents,
  };
}
