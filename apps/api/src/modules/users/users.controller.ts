import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users in tenant' })
  async findAll(@TenantId() tid: string) { return this.usersService.findAll(tid); }

  @Post()
  @UseGuards(RolesGuard) @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a new user' })
  async create(@TenantId() tid: string, @Body() data: { email: string; password: string; firstName?: string; lastName?: string; role?: string }) {
    return this.usersService.create(tid, data);
  }

  @Patch(':id')
  @UseGuards(RolesGuard) @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update user' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() data: any) {
    return this.usersService.update(tid, id, data);
  }

  @Delete(':id')
  @UseGuards(RolesGuard) @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Deactivate user' })
  async remove(@TenantId() tid: string, @Param('id') id: string) {
    return this.usersService.remove(tid, id);
  }
}
