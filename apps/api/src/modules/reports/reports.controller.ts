import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('summary')
  summary(@TenantId() tid: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(tid, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  @Get('storage-usage')
  storageUsage(@TenantId() tid: string) {
    return this.service.storageUsage(tid);
  }

  @Get('success-rate')
  successRate(@TenantId() tid: string, @Query('days') days?: string) {
    return this.service.successRate(tid, days ? parseInt(days, 10) : 14);
  }

  @Post(':kind/export')
  exportReport(@TenantId() tid: string, @Param('kind') kind: string) {
    return this.service.exportReport(tid, kind);
  }
}
