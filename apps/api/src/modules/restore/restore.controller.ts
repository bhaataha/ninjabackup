import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RestoreService } from './restore.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('restore')
@Controller('restore')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RestoreController {
  constructor(private readonly restoreService: RestoreService) {}

  @Post()
  @UseGuards(RolesGuard) @Roles('OWNER', 'ADMIN', 'OPERATOR')
  @ApiOperation({ summary: 'Trigger a restore job' })
  async create(@TenantId() tid: string, @Body() data: any) { return this.restoreService.create(tid, data); }

  @Get()
  @ApiOperation({ summary: 'List restore jobs' })
  async findAll(@TenantId() tid: string) { return this.restoreService.findAll(tid); }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get restore job status' })
  async getStatus(@TenantId() tid: string, @Param('id') id: string) { return this.restoreService.getStatus(tid, id); }
}
