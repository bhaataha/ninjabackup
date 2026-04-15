'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Derive WS URL from the API URL when NEXT_PUBLIC_WS_URL isn't explicitly set,
// so the dashboard works in production without an extra env var.
function deriveWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      const u = new URL(apiUrl);
      return `${u.protocol}//${u.host}`;
    } catch {
      // fall through
    }
  }
  return 'http://localhost:3038';
}

const WS_URL = deriveWsUrl();

interface UseSocketOptions {
  tenantId?: string;
  autoConnect?: boolean;
}

interface JobProgress {
  jobId: string;
  agentId: string;
  progress: number;
  bytesProcessed: number;
  bytesUploaded: number;
  status: string;
  timestamp: string;
}

interface AgentStatus {
  agentId: string;
  status: string;
  timestamp: string;
}

interface AlertEvent {
  id: string;
  rule: string;
  message: string;
  severity: string;
  timestamp: string;
}

/**
 * React hook for WebSocket real-time events.
 * 
 * Usage:
 * ```tsx
 * const { connected, jobProgress, agentStatuses, alerts } = useSocket({ tenantId: 'xxx' });
 * ```
 */
export function useSocket(options: UseSocketOptions = {}) {
  const { tenantId, autoConnect = true } = options;
  const wsRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [jobProgress, setJobProgress] = useState<Map<string, JobProgress>>(new Map());
  const [agentStatuses, setAgentStatuses] = useState<Map<string, AgentStatus>>(new Map());
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);

  const connect = useCallback(async () => {
    if (wsRef.current) return;

    // Dynamically import socket.io-client
    const { io } = await import('socket.io-client');

    const socket = io(`${WS_URL}/ws`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      setConnected(true);
      if (tenantId) {
        socket.emit('join:tenant', { tenantId });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Job progress updates
    socket.on('job:progress', (data: JobProgress) => {
      setJobProgress((prev) => {
        const next = new Map(prev);
        next.set(data.jobId, data);
        return next;
      });
      setActivityFeed((prev) => [
        { type: 'job', ...data, receivedAt: new Date().toISOString() },
        ...prev.slice(0, 49),
      ]);
    });

    // Agent status changes
    socket.on('agent:status', (data: AgentStatus) => {
      setAgentStatuses((prev) => {
        const next = new Map(prev);
        next.set(data.agentId, data);
        return next;
      });
      setActivityFeed((prev) => [
        { type: 'agent', ...data, receivedAt: new Date().toISOString() },
        ...prev.slice(0, 49),
      ]);
    });

    // New alerts
    socket.on('alert:new', (data: AlertEvent) => {
      setAlerts((prev) => [data, ...prev.slice(0, 49)]);
      setActivityFeed((prev) => [
        { type: 'alert', ...data, receivedAt: new Date().toISOString() },
        ...prev.slice(0, 49),
      ]);
    });

    wsRef.current = socket;
  }, [tenantId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (autoConnect && tenantId) {
      connect();
    }
    return () => disconnect();
  }, [autoConnect, tenantId, connect, disconnect]);

  return {
    connected,
    jobProgress,
    agentStatuses,
    alerts,
    activityFeed,
    connect,
    disconnect,
  };
}
