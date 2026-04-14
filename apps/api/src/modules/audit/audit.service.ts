import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuditService {
  private readonly hmacKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.hmacKey = this.config.get('JWT_SECRET', 'ninjabackup-audit-key');
  }

  /**
   * Log an audit event with HMAC signature for integrity.
   */
  async log(params: {
    tenantId: string;
    userId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const entry = {
      tenantId: params.tenantId,
      userId: params.userId || null,
      action: params.action,
      resourceType: params.resourceType || null,
      resourceId: params.resourceId || null,
      details: params.details || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    };

    // Generate HMAC signature for integrity verification
    const signature = this.sign(entry);

    return this.prisma.auditLog.create({
      data: { ...entry, signature },
    });
  }

  /**
   * Query audit logs with filtering/pagination.
   */
  async findAll(
    tenantId: string,
    params: {
      action?: string;
      resourceType?: string;
      userId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { action, resourceType, userId, from, to, page = 1, limit = 50 } = params;

    const where: any = { tenantId };
    if (action) where.action = { contains: action };
    if (resourceType) where.resourceType = resourceType;
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private sign(entry: any): string {
    const payload = JSON.stringify(entry);
    return createHmac('sha256', this.hmacKey).update(payload).digest('hex');
  }
}
