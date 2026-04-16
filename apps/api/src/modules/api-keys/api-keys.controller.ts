import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../auth/decorators/tenant.decorator';

@ApiTags('api-keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly service: ApiKeysService) {}

  @Get()
  list(@TenantId() tid: string) {
    return this.service.list(tid);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a new API key — returned in plaintext only once' })
  create(
    @TenantId() tid: string,
    @CurrentUser() user: { sub: string },
    @Body() data: { name: string; permissions: string[]; expiresAt?: string },
  ) {
    return this.service.create(user.sub, tid, {
      name: data.name,
      permissions: data.permissions,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Rename an API key (does not change the secret)' })
  async rename(@TenantId() tid: string, @Param('id') id: string, @Body() body: { name: string }) {
    return this.service.rename(tid, id, body.name);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async revoke(@TenantId() tid: string, @Param('id') id: string) {
    await this.service.revoke(tid, id);
    return { ok: true };
  }
}
