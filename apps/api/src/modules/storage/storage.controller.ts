import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';
import { CreateStorageVaultDto } from './dto/create-storage-vault.dto';
import { UpdateStorageVaultDto } from './dto/update-storage-vault.dto';

@ApiTags('storage')
@Controller('storage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a new storage vault' })
  async create(@TenantId() tid: string, @Body() dto: CreateStorageVaultDto) {
    return this.storageService.create(tid, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all storage vaults' })
  async findAll(@TenantId() tid: string) {
    return this.storageService.findAll(tid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get storage vault details' })
  async findOne(@TenantId() tid: string, @Param('id') id: string) {
    return this.storageService.findOne(tid, id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update storage vault' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateStorageVaultDto) {
    return this.storageService.update(tid, id, dto);
  }

  @Post(':id/test')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Test storage vault connection' })
  async testConnection(@TenantId() tid: string, @Param('id') id: string) {
    return this.storageService.testConnection(tid, id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get storage usage statistics' })
  async getUsage(@TenantId() tid: string, @Param('id') id: string) {
    return this.storageService.getUsage(tid, id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete storage vault' })
  async remove(@TenantId() tid: string, @Param('id') id: string) {
    return this.storageService.remove(tid, id);
  }
}
