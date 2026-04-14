import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SnapshotsService } from './snapshots.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('snapshots')
@Controller('snapshots')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SnapshotsController {
  constructor(private readonly snapshotsService: SnapshotsService) {}

  @Get('agent/:agentId')
  @ApiOperation({ summary: 'List snapshots for an agent' })
  async findByAgent(@TenantId() tid: string, @Param('agentId') agentId: string) {
    return this.snapshotsService.findByAgent(tid, agentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get snapshot details' })
  async findOne(@TenantId() tid: string, @Param('id') id: string) {
    return this.snapshotsService.findOne(tid, id);
  }
}
