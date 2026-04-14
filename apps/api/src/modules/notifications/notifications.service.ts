import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface NotificationPayload {
  tenantId: string;
  type: 'BACKUP_SUCCESS' | 'BACKUP_FAILED' | 'AGENT_OFFLINE' | 'STORAGE_WARNING' | 'RESTORE_COMPLETE';
  subject: string;
  body: string;
  metadata?: Record<string, any>;
}

/**
 * Notification service — sends alerts via multiple channels.
 * Supports Email (SMTP), Webhook, and in-app notifications.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');

  constructor(private readonly config: ConfigService) {}

  /**
   * Send a notification via all configured channels
   */
  async send(payload: NotificationPayload): Promise<void> {
    const promises: Promise<void>[] = [];

    // Email notification
    if (this.config.get('SMTP_HOST')) {
      promises.push(this.sendEmail(payload));
    }

    // Webhook notification
    if (this.config.get('WEBHOOK_URL')) {
      promises.push(this.sendWebhook(payload));
    }

    // Always log
    this.logger.log(`[${payload.type}] ${payload.subject}`);

    // Fire-and-forget — don't block the caller
    await Promise.allSettled(promises);
  }

  /**
   * Send email notification via SMTP
   */
  private async sendEmail(payload: NotificationPayload): Promise<void> {
    const nodemailer = await import('nodemailer');

    const transport = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: parseInt(this.config.get('SMTP_PORT') || '587'),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });

    const icon = this.getIcon(payload.type);
    const color = this.getColor(payload.type);

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0f1729, #1a1a2e); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; font-size: 18px; margin: 0; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">${icon}</span>
            NinjaBackup Alert
          </h1>
        </div>
        <div style="background: #1a1a2e; padding: 24px; border: 1px solid #2a2a4a;">
          <h2 style="color: ${color}; font-size: 16px; margin: 0 0 12px;">${payload.subject}</h2>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0;">${payload.body}</p>
          ${payload.metadata ? `
            <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
              ${Object.entries(payload.metadata).map(([k, v]) => `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px;">
                  <span style="color: #64748b;">${k}</span>
                  <span style="color: #e2e8f0; font-weight: 600;">${v}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div style="background: #0f1729; padding: 16px 24px; border-radius: 0 0 12px 12px; text-align: center;">
          <a href="${this.config.get('DASHBOARD_URL') || 'http://localhost:3039'}/dashboard"
             style="color: #3b82f6; text-decoration: none; font-size: 13px; font-weight: 600;">
            Open Dashboard →
          </a>
        </div>
      </div>
    `;

    try {
      await transport.sendMail({
        from: this.config.get('SMTP_FROM') || 'noreply@ninjabackup.io',
        to: this.config.get('ALERT_EMAIL'),
        subject: `${icon} [NinjaBackup] ${payload.subject}`,
        html,
      });
      this.logger.log(`Email sent: ${payload.subject}`);
    } catch (err) {
      this.logger.error(`Email failed: ${err}`);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(payload: NotificationPayload): Promise<void> {
    const url = this.config.get('WEBHOOK_URL');
    if (!url) return;

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: payload.type,
          subject: payload.subject,
          body: payload.body,
          metadata: payload.metadata,
          timestamp: new Date().toISOString(),
        }),
      });
      this.logger.log(`Webhook sent: ${payload.subject}`);
    } catch (err) {
      this.logger.error(`Webhook failed: ${err}`);
    }
  }

  private getIcon(type: string): string {
    const icons: Record<string, string> = {
      BACKUP_SUCCESS: '✅',
      BACKUP_FAILED: '❌',
      AGENT_OFFLINE: '🔴',
      STORAGE_WARNING: '⚠️',
      RESTORE_COMPLETE: '♻️',
    };
    return icons[type] || '📢';
  }

  private getColor(type: string): string {
    const colors: Record<string, string> = {
      BACKUP_SUCCESS: '#22c55e',
      BACKUP_FAILED: '#ef4444',
      AGENT_OFFLINE: '#f59e0b',
      STORAGE_WARNING: '#f59e0b',
      RESTORE_COMPLETE: '#3b82f6',
    };
    return colors[type] || '#94a3b8';
  }
}
