import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { AgentsModule } from './modules/agents/agents.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { SnapshotsModule } from './modules/snapshots/snapshots.module';
import { RestoreModule } from './modules/restore/restore.module';
import { StorageModule } from './modules/storage/storage.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { GatewayModule } from './gateway/gateway.module';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { HealthModule } from './health/health.module';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    AgentsModule,
    PoliciesModule,
    JobsModule,
    SnapshotsModule,
    RestoreModule,
    StorageModule,
    AlertsModule,
    AuditModule,
    NotificationsModule,
    GatewayModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude('auth/(.*)', 'agents/register', 'agents/(.*)/heartbeat', 'health', 'health/(.*)')
      .forRoutes('*');
  }
}
