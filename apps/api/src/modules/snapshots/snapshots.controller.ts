import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
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

  @Get()
  @ApiOperation({ summary: 'List snapshots, optionally filtered by agent' })
  async findAll(@TenantId() tid: string, @Query('agentId') agentId?: string) {
    return this.snapshotsService.findAll(tid, agentId);
  }

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

  @Get(':id/browse')
  @ApiOperation({ summary: 'Browse files inside a snapshot at a given path' })
  async browse(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Query('path') path: string = '',
  ) {
    return this.snapshotsService.browse(tid, id, path);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List versions of a file across snapshots' })
  async versions(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Query('path') path: string,
  ) {
    return this.snapshotsService.versions(tid, id, path);
  }

  @Post(':id/download')
  @ApiOperation({ summary: 'Generate a pre-signed download URL for a single file' })
  async download(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() body: { path: string },
  ) {
    return this.snapshotsService.generateDownloadUrl(tid, id, body.path);
  }
}
