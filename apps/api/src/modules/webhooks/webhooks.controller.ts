import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Get()
  list(@TenantId() tid: string) {
    return this.service.list(tid);
  }

  @Get('deliveries')
  deliveries(@TenantId() tid: string, @Query('webhookId') webhookId?: string) {
    return this.service.deliveries(tid, webhookId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  create(@TenantId() tid: string, @Body() data: { name: string; url: string; events: string[] }) {
    return this.service.create(tid, data);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  update(@TenantId() tid: string, @Param('id') id: string, @Body() data: any) {
    return this.service.update(tid, id, data);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async delete(@TenantId() tid: string, @Param('id') id: string) {
    await this.service.delete(tid, id);
    return { ok: true };
  }

  @Post(':id/test')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  test(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.test(tid, id);
  }
}
