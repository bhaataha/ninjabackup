import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RestoreService } from './restore.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('restore')
@Controller('restore')
export class RestoreController {
  constructor(private readonly restoreService: RestoreService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'OPERATOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger a restore job — command dispatched to agent' })
  async create(@TenantId() tid: string, @Body() data: any) {
    return this.restoreService.create(tid, data);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List restore jobs' })
  async findAll(@TenantId() tid: string) {
    return this.restoreService.findAll(tid);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get restore job status' })
  async findOne(@TenantId() tid: string, @Param('id') id: string) {
    return this.restoreService.getStatus(tid, id);
  }

  @Get(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alias for GET /:id — kept for legacy clients' })
  async getStatus(@TenantId() tid: string, @Param('id') id: string) {
    return this.restoreService.getStatus(tid, id);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Agent callback: update restore progress' })
  async updateStatus(@Param('id') id: string, @Body() data: any) {
    return this.restoreService.updateStatus(id, data);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'OPERATOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a running restore' })
  async cancel(@TenantId() tid: string, @Param('id') id: string) {
    return this.restoreService.cancel(tid, id);
  }
}
