import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'List backup jobs' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @TenantId() tid: string,
    @Query('status') status?: string,
    @Query('agentId') agentId?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.jobsService.findAll(tid, {
      status, agentId, type,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get backup job statistics' })
  async getStats(@TenantId() tid: string) {
    return this.jobsService.getStats(tid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job details' })
  async findOne(@TenantId() tid: string, @Param('id') id: string) {
    return this.jobsService.findOne(tid, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'OPERATOR')
  @ApiOperation({ summary: 'Trigger a manual backup job' })
  async triggerBackup(
    @TenantId() tid: string,
    @Body() body: { agentId: string; policyId?: string; type?: string },
  ) {
    return this.jobsService.triggerBackup(tid, body.agentId, body.policyId, body.type);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'OPERATOR')
  @ApiOperation({ summary: 'Cancel a running backup job' })
  async cancel(@TenantId() tid: string, @Param('id') id: string) {
    return this.jobsService.cancelJob(tid, id);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Update job status (called by agent)' })
  async updateStatus(@Param('id') id: string, @Body() data: any) {
    return this.jobsService.updateJobStatus(id, data);
  }
}
