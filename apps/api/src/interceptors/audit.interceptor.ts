import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../modules/audit/audit.service';

/**
 * Global interceptor that automatically logs all mutating API calls
 * (POST, PATCH, PUT, DELETE) to the audit log.
 *
 * Reads tenantId and userId from the JWT payload in the request object.
 * Non-intrusive: never blocks the request or modifies the response.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only log mutating operations
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const now = Date.now();
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const user = request.user;

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          // Fire-and-forget audit log — never block the response
          this.logAction(request, controller, handler, user, responseBody, null, now).catch(
            (err) => console.error('Audit log error:', err),
          );
        },
        error: (error) => {
          this.logAction(request, controller, handler, user, null, error, now).catch(
            (err) => console.error('Audit log error:', err),
          );
        },
      }),
    );
  }

  private async logAction(
    request: any,
    controller: string,
    handler: string,
    user: any,
    response: any,
    error: any,
    startTime: number,
  ) {
    const tenantId = user?.tenantId;
    if (!tenantId) return; // Skip unauthenticated requests

    const resourceType = controller.replace('Controller', '');
    const action = `${resourceType.toLowerCase()}.${handler}`;

    // Extract resource ID from params or response
    const resourceId =
      request.params?.id ||
      response?.id ||
      response?.agentId ||
      null;

    await this.auditService.log({
      tenantId,
      userId: user?.sub || user?.id,
      action,
      resourceType,
      resourceId,
      details: {
        method: request.method,
        path: request.url,
        statusCode: error ? error.status || 500 : 200,
        durationMs: Date.now() - startTime,
        error: error ? error.message : undefined,
      },
      ipAddress: request.ip || request.connection?.remoteAddress,
      userAgent: request.headers?.['user-agent'],
    });
  }
}
