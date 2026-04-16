import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';
import { CreatePolicyDto } from './dto/create-policy.dto';

@ApiTags('policies')
@Controller('policies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'OPERATOR')
  @ApiOperation({ summary: 'Create a backup policy' })
  async create(@TenantId() tid: string, @Body() dto: CreatePolicyDto) {
    return this.policiesService.create(tid, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all backup policies' })
  async findAll(@TenantId() tid: string) {
    return this.policiesService.findAll(tid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get policy details' })
  async findOne(@TenantId() tid: string, @Param('id') id: string) {
    return this.policiesService.findOne(tid, id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'OPERATOR')
  @ApiOperation({ summary: 'Update policy' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: Partial<CreatePolicyDto>) {
    return this.policiesService.update(tid, id, dto);
  }

  @Get(':id/agents')
  @ApiOperation({ summary: 'List agents this policy is assigned to' })
  async listAgents(@TenantId() tid: string, @Param('id') id: string) {
    return this.policiesService.listAssignedAgents(tid, id);
  }

  @Post(':id/agents/:agentId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'OPERATOR')
  @ApiOperation({ summary: 'Assign policy to an agent' })
  async assign(@TenantId() tid: string, @Param('id') id: string, @Param('agentId') agentId: string) {
    return this.policiesService.assignToAgent(tid, id, agentId);
  }

  @Delete(':id/agents/:agentId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'OPERATOR')
  @ApiOperation({ summary: 'Unassign policy from an agent' })
  async unassign(@TenantId() tid: string, @Param('id') id: string, @Param('agentId') agentId: string) {
    return this.policiesService.unassignFromAgent(tid, id, agentId);
  }

  // Legacy /assign/:agentId routes kept for backward compatibility
  @Post(':id/assign/:agentId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'OPERATOR')
  async legacyAssign(@TenantId() tid: string, @Param('id') id: string, @Param('agentId') agentId: string) {
    return this.policiesService.assignToAgent(tid, id, agentId);
  }

  @Delete(':id/assign/:agentId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'OPERATOR')
  async legacyUnassign(@TenantId() tid: string, @Param('id') id: string, @Param('agentId') agentId: string) {
    return this.policiesService.unassignFromAgent(tid, id, agentId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete policy' })
  async remove(@TenantId() tid: string, @Param('id') id: string) {
    return this.policiesService.remove(tid, id);
  }
}
