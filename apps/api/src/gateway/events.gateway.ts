import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

/**
 * Real-time WebSocket gateway for:
 * - Agent status updates (online/offline/backing_up)
 * - Job progress streaming
 * - Alert notifications
 * - Dashboard live updates
 */
@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:3039' },
  namespace: '/ws',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('EventsGateway');

  // Track connected clients by tenant
  private tenantClients: Map<string, Set<string>> = new Map();
  // Track connected agents
  private agentClients: Map<string, string> = new Map(); // socketId -> agentId

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Clean up tenant tracking
    for (const [tenantId, clients] of this.tenantClients.entries()) {
      clients.delete(client.id);
      if (clients.size === 0) this.tenantClients.delete(tenantId);
    }

    // If agent disconnected, notify dashboard
    const agentId = this.agentClients.get(client.id);
    if (agentId) {
      this.agentClients.delete(client.id);
      this.server.emit('agent:status', { agentId, status: 'OFFLINE' });
    }
  }

  /**
   * Dashboard clients join their tenant room
   */
  @SubscribeMessage('join:tenant')
  handleJoinTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ) {
    client.join(`tenant:${data.tenantId}`);

    if (!this.tenantClients.has(data.tenantId)) {
      this.tenantClients.set(data.tenantId, new Set());
    }
    this.tenantClients.get(data.tenantId)!.add(client.id);

    this.logger.log(`Client ${client.id} joined tenant ${data.tenantId}`);
    return { status: 'joined', tenantId: data.tenantId };
  }

  /**
   * Agent registers itself for bidirectional communication
   */
  @SubscribeMessage('agent:connect')
  handleAgentConnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { agentId: string; tenantId: string },
  ) {
    client.join(`tenant:${data.tenantId}`);
    client.join(`agent:${data.agentId}`);
    this.agentClients.set(client.id, data.agentId);

    // Notify dashboard of agent connection
    this.server.to(`tenant:${data.tenantId}`).emit('agent:status', {
      agentId: data.agentId,
      status: 'ONLINE',
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Agent ${data.agentId} connected`);
    return { status: 'connected' };
  }

  /**
   * Agent reports backup progress
   */
  @SubscribeMessage('job:progress')
  handleJobProgress(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      tenantId: string;
      jobId: string;
      agentId: string;
      progress: number;
      bytesProcessed: number;
      bytesUploaded: number;
      status: string;
    },
  ) {
    // Broadcast to all dashboard clients of this tenant
    this.server.to(`tenant:${data.tenantId}`).emit('job:progress', data);
  }

  // ─── Public methods for other services to emit events ───

  /**
   * Emit agent status change to all dashboard clients
   */
  emitAgentStatus(tenantId: string, agentId: string, status: string) {
    this.server.to(`tenant:${tenantId}`).emit('agent:status', {
      agentId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit job progress to dashboard
   */
  emitJobProgress(tenantId: string, jobId: string, progress: any) {
    this.server.to(`tenant:${tenantId}`).emit('job:progress', {
      jobId,
      ...progress,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit new alert to dashboard
   */
  emitAlert(tenantId: string, alert: any) {
    this.server.to(`tenant:${tenantId}`).emit('alert:new', {
      ...alert,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send command to specific agent (backup, restore, cancel, etc.)
   */
  sendAgentCommand(agentId: string, command: string, payload: any) {
    this.server.to(`agent:${agentId}`).emit('agent:command', {
      command,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit generic event to a tenant's dashboards
   */
  emitToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }
}
