import { Module } from '@nestjs/common';
import { RestoreController } from './restore.controller';
import { RestoreService } from './restore.service';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [AgentsModule],
  controllers: [RestoreController],
  providers: [RestoreService],
  exports: [RestoreService],
})
export class RestoreModule {}
