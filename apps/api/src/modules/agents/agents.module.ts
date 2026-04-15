import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { CommandsService } from './commands.service';
import { PoliciesModule } from '../policies/policies.module';

@Module({
  imports: [PoliciesModule],
  controllers: [AgentsController],
  providers: [AgentsService, CommandsService],
  exports: [AgentsService, CommandsService],
})
export class AgentsModule {}
