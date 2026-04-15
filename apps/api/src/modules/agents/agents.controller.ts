import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CommandsService } from './commands.service';
import { PoliciesService } from '../policies/policies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';
import { RegisterAgentDto } from './dto/register-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly policiesService: PoliciesService,
    private readonly commandsService: CommandsService,
  ) {}

  @Post('token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'OPERATOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a one-time agent registration token' })
  async generateToken(@TenantId() tenantId: string) {
    return this.agentsService.generateRegistrationToken(tenantId);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new agent using a registration token (called by agent installer)' })
  async register(@Body() dto: RegisterAgentDto) {
    return this.agentsService.register(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all agents for current tenant' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.agentsService.findAll(tenantId, {
      status,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get agent dashboard statistics' })
  async getStats(@TenantId() tenantId: string) {
    return this.agentsService.getStats(tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get agent details' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.agentsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'OPERATOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update agent details' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.agentsService.update(tenantId, id, dto);
  }

  @Post(':id/heartbeat')
  @ApiOperation({ summary: 'Agent heartbeat (called periodically by the agent)' })
  async heartbeat(
    @Param('id') id: string,
    @Body() data: { status?: string; agentVersion?: string; diskInfo?: any },
  ) {
    const agent = await this.agentsService.heartbeat(id, data);
    const commands = await this.commandsService.claimPending(id);
    return { agent, commands };
  }

  @Post('commands/:commandId/ack')
  @ApiOperation({ summary: 'Agent acknowledges a received command' })
  async ackCommand(
    @Param('commandId') commandId: string,
    @Body() body: { error?: string },
  ) {
    return this.commandsService.acknowledge(commandId, body?.error);
  }

  @Get(':id/policies')
  @ApiOperation({ summary: 'Get assigned policies for an agent (called by agent runtime)' })
  async getAgentPolicies(@Param('id') id: string) {
    await this.agentsService.ensureExists(id);
    return this.policiesService.findForAgent(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Decommission an agent' })
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.agentsService.remove(tenantId, id);
  }
}
