import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHmac } from 'node:crypto';

/**
 * Webhooks are stored as AlertRules with `notifyWebhook = true` to avoid a new
 * Prisma model in this iteration. Deliveries are stored in the `settings` JSON
 * column on the alert rule (capped to last 50).
 */
@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const rules = await this.prisma.alertRule.findMany({
      where: { tenantId, notifyWebhook: true },
      orderBy: { createdAt: 'desc' },
    });
    return rules.map((r) => this.serialize(r));
  }

  async create(tenantId: string, data: { name: string; url: string; events: string[] }) {
    const created = await this.prisma.alertRule.create({
      data: {
        tenantId,
        type: 'BACKUP_FAILED',
        notifyEmail: false,
        notifyWebhook: true,
        webhookUrl: data.url,
        conditions: { name: data.name, events: data.events, deliveries: [], successCount: 0, failureCount: 0 } as any,
      },
    });
    return this.serialize(created);
  }

  async update(tenantId: string, id: string, data: any) {
    const rule = await this.prisma.alertRule.findFirst({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('Webhook not found');
    const merged: any = { ...((rule.conditions as any) ?? {}) };
    if (data.name) merged.name = data.name;
    if (data.events) merged.events = data.events;
    const updated = await this.prisma.alertRule.update({
      where: { id },
      data: {
        webhookUrl: data.url ?? rule.webhookUrl,
        conditions: merged,
        // Use the AlertRule.enabled-equivalent via notifyWebhook toggle when `active` is sent.
        notifyWebhook: typeof data.active === 'boolean' ? data.active : rule.notifyWebhook,
      },
    });
    return this.serialize(updated);
  }

  async delete(tenantId: string, id: string) {
    const rule = await this.prisma.alertRule.findFirst({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('Webhook not found');
    await this.prisma.alertRule.delete({ where: { id } });
  }

  async test(tenantId: string, id: string) {
    const rule = await this.prisma.alertRule.findFirst({ where: { id, tenantId } });
    if (!rule || !rule.webhookUrl) throw new NotFoundException('Webhook not found');
    return this.deliver(rule.id, rule.webhookUrl, 'webhook.test', { message: 'NinjaBackup test event' });
  }

  async deliveries(tenantId: string, webhookId?: string) {
    const where: any = { tenantId, notifyWebhook: true };
    if (webhookId) where.id = webhookId;
    const rules = await this.prisma.alertRule.findMany({ where });
    const all: any[] = [];
    for (const r of rules) {
      const deliveries = ((r.conditions as any)?.deliveries ?? []) as any[];
      const name = (r.conditions as any)?.name ?? 'webhook';
      for (const d of deliveries) {
        all.push({ ...d, webhookId: r.id, webhookName: name });
      }
    }
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100);
  }

  async deliver(webhookId: string, url: string, event: string, payload: Record<string, any>) {
    const start = Date.now();
    let status = 0;
    let success = false;
    try {
      const body = JSON.stringify({ event, ...payload, timestamp: new Date().toISOString() });
      const signature = createHmac('sha256', process.env.WEBHOOK_SECRET ?? 'dev-secret').update(body).digest('hex');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-NinjaBackup-Signature': signature },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      status = res.status;
      success = res.status >= 200 && res.status < 300;
    } catch {
      status = 0;
      success = false;
    }
    const duration = Date.now() - start;

    const rule = await this.prisma.alertRule.findUnique({ where: { id: webhookId } });
    if (rule) {
      const cond: any = { ...((rule.conditions as any) ?? {}) };
      const deliveries = (cond.deliveries ?? []) as any[];
      deliveries.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        event,
        status,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      });
      cond.deliveries = deliveries.slice(0, 50);
      cond.successCount = (cond.successCount ?? 0) + (success ? 1 : 0);
      cond.failureCount = (cond.failureCount ?? 0) + (success ? 0 : 1);
      cond.lastTriggered = new Date().toISOString();
      await this.prisma.alertRule.update({ where: { id: webhookId }, data: { conditions: cond } });
    }

    return { success, status, durationMs: duration };
  }

  private serialize(r: any) {
    const cond = (r.conditions ?? {}) as any;
    const total = (cond.successCount ?? 0) + (cond.failureCount ?? 0);
    const successRate = total > 0 ? Math.round(((cond.successCount ?? 0) / total) * 100) : 100;
    return {
      id: r.id,
      name: cond.name ?? 'webhook',
      url: r.webhookUrl,
      events: cond.events ?? [],
      active: r.notifyWebhook,
      lastTriggered: cond.lastTriggered ?? null,
      successRate,
    };
  }
}
