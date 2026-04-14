import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tenant isolation middleware — ensures every request is scoped to a valid tenant.
 * Validates tenantId from JWT against the database and injects tenant info.
 * Activated for all protected routes.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const user = (req as any).user;

    // Skip for unauthenticated routes (register, login, agent heartbeat)
    if (!user?.tenantId) {
      return next();
    }

    // Verify tenant exists and is active
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, active: true, agentLimit: true, storageQuotaGb: true },
    });

    if (!tenant || !tenant.active) {
      throw new ForbiddenException('Tenant is disabled or does not exist');
    }

    // Inject tenant data into request for downstream use
    (req as any).tenant = tenant;

    next();
  }
}
