import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterAgentDto } from './dto/register-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a one-time registration token for a new agent.
   * The token is used by the agent installer to register with the server.
   */
  async generateRegistrationToken(tenantId: string) {
    // Check agent limit
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { _count: { select: { agents: true } } },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant._count.agents >= tenant.agentLimit) {
      throw new ForbiddenException(
        `Agent limit reached (${tenant.agentLimit}). Upgrade your plan.`,
      );
    }

    const token = `nbk_${randomBytes(32).toString('hex')}`;

    // Store as a pending agent with the registration token
    const pendingAgent = await this.prisma.agent.create({
      data: {
        tenantId,
        hostname: `pending-${token.slice(0, 8)}`,
        osType: 'WINDOWS', // will be updated on registration
        registrationToken: token,
        status: 'OFFLINE',
      },
    });

    return {
      registrationToken: token,
      agentId: pendingAgent.id,
      expiresIn: '24h',
    };
  }

  /**
   * Register an agent using a one-time registration token.
   * Called by the agent installer during first-time setup.
   */
  async register(dto: RegisterAgentDto) {
    const pendingAgent = await this.prisma.agent.findFirst({
      where: {
        registrationToken: dto.registrationToken,
        hostname: { startsWith: 'pending-' },
      },
    });

    if (!pendingAgent) {
      throw new NotFoundException('Invalid or expired registration token');
    }

    // Check for duplicate hostname in this tenant
    const existing = await this.prisma.agent.findFirst({
      where: {
        tenantId: pendingAgent.tenantId,
        hostname: dto.hostname,
        id: { not: pendingAgent.id },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Agent with hostname '${dto.hostname}' already exists in this tenant`,
      );
    }

    // Update the pending agent with real data
    const agent = await this.prisma.agent.update({
      where: { id: pendingAgent.id },
      data: {
        hostname: dto.hostname,
        displayName: dto.displayName || dto.hostname,
        osType: dto.osType,
        osVersion: dto.osVersion,
        agentVersion: dto.agentVersion,
        clientCertFingerprint: dto.clientCertFingerprint,
        cpuInfo: dto.cpuInfo,
        ramGb: dto.ramGb,
        diskInfo: dto.diskInfo,
        registrationToken: null, // consume the token
        status: 'ONLINE',
        lastSeen: new Date(),
      },
    });

    return {
      agentId: agent.id,
      tenantId: agent.tenantId,
      status: 'registered',
    };
  }

  /**
   * List all agents for a tenant with filtering and pagination.
   */
  async findAll(
    tenantId: string,
    params: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { status, search, page = 1, limit = 20 } = params;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { hostname: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Exclude pending (unregistered) agents
    where.hostname = { ...where.hostname, not: { startsWith: 'pending-' } };

    const [agents, total] = await Promise.all([
      this.prisma.agent.findMany({
        where,
        orderBy: { lastSeen: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { backupJobs: true } },
        },
      }),
      this.prisma.agent.count({ where }),
    ]);

    return {
      data: agents.map((a) => ({
        id: a.id,
        hostname: a.hostname,
        displayName: a.displayName,
        osType: a.osType,
        osVersion: a.osVersion,
        agentVersion: a.agentVersion,
        status: a.status,
        totalDataBytes: a.totalDataBytes.toString(),
        totalBackups: a.totalBackups,
        lastSeen: a.lastSeen,
        lastBackup: a.lastBackup,
        cpuInfo: a.cpuInfo,
        ramGb: a.ramGb,
        diskInfo: a.diskInfo,
        jobCount: a._count.backupJobs,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get detailed info about a specific agent.
   */
  async findOne(tenantId: string, agentId: string) {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, tenantId },
      include: {
        agentPolicies: { include: { policy: true } },
        backupJobs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { backupJobs: true, restoreJobs: true },
        },
      },
    });

    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  /**
   * Update agent details (display name, etc).
   */
  async update(tenantId: string, agentId: string, dto: UpdateAgentDto) {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, tenantId },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    return this.prisma.agent.update({
      where: { id: agentId },
      data: dto,
    });
  }

  /**
   * Agent heartbeat — called periodically by the agent to report status.
   */
  async heartbeat(
    agentId: string,
    data: {
      status?: string;
      agentVersion?: string;
      diskInfo?: any;
    },
  ) {
    return this.prisma.agent.update({
      where: { id: agentId },
      data: {
        lastSeen: new Date(),
        status: (data.status as any) || 'ONLINE',
        agentVersion: data.agentVersion,
        diskInfo: data.diskInfo,
      },
    });
  }

  /**
   * Verify an agent exists (used by unauthenticated agent endpoints).
   */
  async ensureExists(agentId: string) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  /**
   * Decommission (soft-delete) an agent.
   */
  async remove(tenantId: string, agentId: string) {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, tenantId },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    await this.prisma.agent.delete({ where: { id: agentId } });
    return { deleted: true };
  }

  /**
   * Get dashboard stats for a tenant.
   */
  async getStats(tenantId: string) {
    const [totalAgents, onlineAgents, backingUp, errorAgents, recentJobs] =
      await Promise.all([
        this.prisma.agent.count({
          where: { tenantId, hostname: { not: { startsWith: 'pending-' } } },
        }),
        this.prisma.agent.count({ where: { tenantId, status: 'ONLINE' } }),
        this.prisma.agent.count({ where: { tenantId, status: 'BACKING_UP' } }),
        this.prisma.agent.count({ where: { tenantId, status: 'ERROR' } }),
        this.prisma.backupJob.count({
          where: {
            agent: { tenantId },
            status: 'SUCCESS',
            completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

    return {
      totalAgents,
      onlineAgents,
      backingUp,
      errorAgents,
      protectedToday: recentJobs,
    };
  }
}
