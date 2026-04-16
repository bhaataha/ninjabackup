import { Controller, Get, Header, HttpException, HttpStatus, Post, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  summary(@TenantId() tid: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(tid, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  @Get('storage-usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  storageUsage(@TenantId() tid: string) {
    return this.service.storageUsage(tid);
  }

  @Get('success-rate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  successRate(@TenantId() tid: string, @Query('days') days?: string) {
    return this.service.successRate(tid, days ? parseInt(days, 10) : 14);
  }

  @Post(':kind/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  exportReport(@TenantId() tid: string, @Param('kind') kind: string) {
    return this.service.exportReport(tid, kind);
  }

  /**
   * Public, signed-URL endpoint — opens the printable report directly in the
   * browser without an Authorization header. The URL is HMAC-signed and
   * expires after 5 minutes (issued by POST /reports/:kind/export).
   */
  @Get(':kind/print.html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async print(
    @Param('kind') kind: string,
    @Query('tid') tid: string,
    @Query('expires') expires: string,
    @Query('sig') sig: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    if (!tid || !expires || !sig || !this.service.verifyPrintToken(tid, kind, expires, sig)) {
      throw new HttpException('Invalid or expired link', HttpStatus.UNAUTHORIZED);
    }
    const summary = await this.service.summary(
      tid,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
    res.send(this.service.renderHtml(kind, summary));
  }
}
