import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// Import PrismaClient directly from the generated client — avoids the
// @ninjabackup/database workspace package pointing at raw TS source.
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    await this.runSchemaPatches();
  }

  /**
   * Idempotent schema patches — safe to run on every startup.
   * Replaces formal migrations for incremental column additions.
   */
  private async runSchemaPatches() {
    try {
      // Add notification_prefs column if it doesn't already exist (Postgres 9.6+).
      await this.$executeRawUnsafe(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{}';
      `);
    } catch {
      // Non-fatal — column may already exist or DB may not support IF NOT EXISTS.
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
