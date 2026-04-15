import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

/**
 * Simple in-memory rate limiter guard.
 * Limits requests per IP address to prevent abuse.
 *
 * Default: 100 requests per 60 seconds per IP.
 * Auth endpoints: 10 requests per 60 seconds per IP.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly store = new Map<string, { count: number; resetAt: number }>();
  // Class fields instead of constructor params — primitives can't be DI-injected
  // which broke APP_GUARD registration (Nest tried to resolve `Object`).
  protected readonly limit: number = 100;
  protected readonly windowMs: number = 60000;

  constructor() {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetAt < now) this.store.delete(key);
      }
    }, 300000);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const path = request.url;

    // Stricter limits for auth endpoints
    const isAuth = path.includes('/auth/');
    const limit = isAuth ? 10 : this.limit;

    const key = `${ip}:${isAuth ? 'auth' : 'general'}`;
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt < now) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
    return true;
  }
}

/**
 * Stricter rate limiter for authentication endpoints
 */
@Injectable()
export class AuthRateLimitGuard extends RateLimitGuard {
  protected readonly limit = 10;
  protected readonly windowMs = 60000;
}
