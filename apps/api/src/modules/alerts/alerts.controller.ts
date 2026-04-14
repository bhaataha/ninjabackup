import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('alerts')
@Controller('alerts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post('rules')
  @UseGuards(RolesGuard) @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create alert rule' })
  async createRule(@TenantId() tid: string, @Body() data: any) { return this.alertsService.createRule(tid, data); }

  @Get('rules')
  @ApiOperation({ summary: 'List alert rules' })
  async findAllRules(@TenantId() tid: string) { return this.alertsService.findAllRules(tid); }

  @Patch('rules/:id')
  @UseGuards(RolesGuard) @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update alert rule' })
  async updateRule(@TenantId() tid: string, @Param('id') id: string, @Body() data: any) { return this.alertsService.updateRule(tid, id, data); }

  @Delete('rules/:id')
  @UseGuards(RolesGuard) @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete alert rule' })
  async deleteRule(@TenantId() tid: string, @Param('id') id: string) { return this.alertsService.deleteRule(tid, id); }

  @Get()
  @ApiOperation({ summary: 'List triggered alerts' })
  async findAlerts(@TenantId() tid: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.alertsService.findAlerts(tid, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  async acknowledge(@TenantId() tid: string, @Param('id') id: string) { return this.alertsService.acknowledge(tid, id); }
}
