import Aedes from 'aedes';
import type { Client } from 'aedes';
import { createServer, Server } from 'net';
import type { IPublishPacket, ISubscription } from 'mqtt-packet';
import { ActivityLogEntry } from './types.js';
import { EventEmitter } from 'events';

type AedesInstance = ReturnType<typeof Aedes.createBroker>;

export class MqttBrokerWrapper extends EventEmitter {
  private broker: AedesInstance | null = null;
  private tcpServer: Server | null = null;
  private port: number;
  private _running = false;
  private clientSubscriptions = new Map<string, Set<string>>();

  get running(): boolean {
    return this._running;
  }

  get connectedClients(): number {
    return this.broker?.connectedClients ?? 0;
  }

  constructor(port = 1883) {
    super();
    this.port = port;
  }

  async start(): Promise<void> {
    if (this._running) return;

    return new Promise((resolve, reject) => {
      this.broker = Aedes.createBroker({
        id: 'opc-mqtt-test-harness',
        concurrency: 100,
        connectTimeout: 30_000,
      });

      this.setupEventHandlers();

      this.tcpServer = createServer(this.broker.handle);

      this.tcpServer.listen(this.port, () => {
        this._running = true;
        this.log('connect', `MQTT broker started on port ${this.port}`);
        resolve();
      });

      this.tcpServer.on('error', (err) => {
        reject(err);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this._running) return;

    return new Promise<void>((resolve) => {
      this.tcpServer?.close(() => {
        this.broker?.close(() => {
          this._running = false;
          this.clientSubscriptions.clear();
          this.broker = null;
          this.tcpServer = null;
          this.log('disconnect', 'MQTT broker stopped');
          resolve();
        });
      });
    });
  }

  private setupEventHandlers(): void {
    if (!this.broker) return;

    this.broker.on('client', (client: Client) => {
      this.clientSubscriptions.set(client.id, new Set());
      this.log('connect', `Client connected: ${client.id}`);
    });

    this.broker.on('clientDisconnect', (client: Client) => {
      this.clientSubscriptions.delete(client.id);
      this.log('disconnect', `Client disconnected: ${client.id}`);
    });

    this.broker.on('subscribe', (subscriptions: ISubscription[], client: Client) => {
      if (!client) return;
      const topics = this.clientSubscriptions.get(client.id) ?? new Set<string>();
      for (const sub of subscriptions) {
        topics.add(sub.topic);
        this.log('subscribe', `${client.id} subscribed to ${sub.topic}`);
      }
      this.clientSubscriptions.set(client.id, topics);
    });

    this.broker.on('unsubscribe', (topics: string[], client: Client) => {
      if (!client) return;
      const topicSet = this.clientSubscriptions.get(client.id);
      if (topicSet) {
        topics.forEach((t) => topicSet.delete(t));
      }
    });

    this.broker.on('publish', (packet: IPublishPacket, client: Client | null) => {
      if (client && !packet.topic.startsWith('$SYS')) {
        this.log('publish', `${client.id} -> ${packet.topic}: ${packet.payload?.toString().substring(0, 200)}`);
      }
    });
  }

  /** Publish any value to a topic. Accepts raw values (number, string, boolean) or objects. */
  publish(topic: string, payload: unknown, qos: 0 | 1 | 2 = 0): Promise<void> {
    if (!this.broker) return Promise.reject(new Error('Broker not running'));

    return new Promise((resolve, reject) => {
      // Raw scalars get sent as their string representation.
      // Objects/arrays get JSON-encoded.
      const payloadStr = (typeof payload === 'object' && payload !== null)
        ? JSON.stringify(payload)
        : String(payload);

      const packet: IPublishPacket = {
        cmd: 'publish',
        topic,
        payload: Buffer.from(payloadStr),
        qos,
        retain: false,
        dup: false,
      };

      this.broker!.publish(packet, (err?: Error) => {
        if (err) reject(err);
        else {
          this.log('publish', `Server -> ${topic}: ${payloadStr.substring(0, 200)}`);
          this.emit('published', { topic, payload });
          resolve();
        }
      });
    });
  }

  getClients(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [clientId, topics] of this.clientSubscriptions) {
      result[clientId] = Array.from(topics);
    }
    return result;
  }

  private log(type: ActivityLogEntry['type'], detail: string): void {
    this.emit('activity', {
      timestamp: new Date().toISOString(),
      protocol: 'mqtt',
      type,
      detail,
    } satisfies ActivityLogEntry);
  }
}
