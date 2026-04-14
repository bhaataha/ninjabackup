import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant info' })
  async getCurrent(@TenantId() tid: string) {
    return this.tenantsService.findOne(tid);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get tenant dashboard data' })
  async getDashboard(@TenantId() tid: string) {
    return this.tenantsService.getDashboard(tid);
  }

  @Patch('current')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update tenant settings' })
  async update(@TenantId() tid: string, @Body() data: { name?: string; settings?: any }) {
    return this.tenantsService.update(tid, data);
  }
}
