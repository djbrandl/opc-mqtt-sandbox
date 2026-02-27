import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { ActivityLogEntry } from './types.js';

export interface WsMessage {
  type: 'opcua-values' | 'mqtt-message' | 'activity' | 'status' | 'mqtt-clients' | 'opcua-clients';
  data: unknown;
}

export class WsServer {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();

  attach(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      ws.on('close', () => {
        this.clients.delete(ws);
      });
      ws.on('error', () => {
        this.clients.delete(ws);
      });
    });
  }

  broadcast(message: WsMessage): void {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  broadcastActivity(entry: ActivityLogEntry): void {
    this.broadcast({ type: 'activity', data: entry });
  }

  broadcastOpcuaValues(values: Record<string, { value: any; timestamp: string }>): void {
    this.broadcast({ type: 'opcua-values', data: values });
  }

  broadcastMqttMessage(topic: string, payload: unknown): void {
    this.broadcast({ type: 'mqtt-message', data: { topic, payload } });
  }

  broadcastStatus(status: unknown): void {
    this.broadcast({ type: 'status', data: status });
  }

  get connectedCount(): number {
    return this.clients.size;
  }
}
