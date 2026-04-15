import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Queue of pending commands for agents.
 *
 * Commands are enqueued by services (e.g. jobs.service on triggerBackup).
 * Agents pick them up via the heartbeat response, which atomically marks
 * them DELIVERED. Agents can later ACK or report failure.
 */
@Injectable()
export class CommandsService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(agentId: string, type: string, payload: Record<string, any> = {}) {
    return this.prisma.agentCommand.create({
      data: { agentId, type, payload },
    });
  }

  /**
   * Return pending commands for an agent and mark them DELIVERED in one
   * transaction so they aren't picked up twice by concurrent heartbeats.
   */
  async claimPending(agentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const pending = await tx.agentCommand.findMany({
        where: { agentId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });

      if (pending.length === 0) return [];

      await tx.agentCommand.updateMany({
        where: { id: { in: pending.map((c) => c.id) } },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      });

      return pending.map((c) => ({
        id: c.id,
        type: c.type,
        payload: c.payload,
      }));
    });
  }

  async acknowledge(commandId: string, errorMessage?: string) {
    return this.prisma.agentCommand.update({
      where: { id: commandId },
      data: {
        status: errorMessage ? 'FAILED' : 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        errorMessage: errorMessage ?? null,
      },
    });
  }
}
