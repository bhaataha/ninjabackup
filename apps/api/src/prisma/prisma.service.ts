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
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
