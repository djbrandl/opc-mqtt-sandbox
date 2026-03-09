import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpcuaServerWrapper } from './opcua-server.js';
import { MqttBrokerWrapper } from './mqtt-broker.js';
import { DataGenerator } from './generator.js';
import { ConfigStore } from './config-store.js';
import { WsServer } from './websocket.js';
import { createApiRouter } from './api.js';
import { ActivityLogEntry } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.API_PORT ?? process.env.PORT ?? '3005', 10);
const isProd = process.env.NODE_ENV === 'production';

// --- Initialize components ---
const opcua = new OpcuaServerWrapper();
const mqtt = new MqttBrokerWrapper();
const configStore = new ConfigStore();
const ws = new WsServer();

const ctx = {
  opcua,
  mqtt,
  opcuaGenerator: null as unknown as DataGenerator,
  mqttGenerator: null as unknown as DataGenerator,
  configStore,
  ws,
  currentConfig: configStore.getDefaultConfig(),
};

// Generators push values into the respective protocol servers
ctx.opcuaGenerator = new DataGenerator((nodeId, value) => {
  opcua.setValue(nodeId, value);
});

ctx.mqttGenerator = new DataGenerator((topicId, value) => {
  const config = ctx.currentConfig;
  if (!config) return;

  const topicConfig = config.mqtt.topics.find((t) => t.id === topicId);
  const topic = topicConfig?.topic ?? topicId;
  const qos = topicConfig?.qos ?? 0;
  const schema = topicConfig?.payloadSchema;

  // No schema, or single number-only field → publish raw value
  if (!schema?.length || (schema.length === 1 && schema[0].type === 'number')) {
    mqtt.publish(topic, value, qos).catch(console.error);
    return;
  }

  // Multi-field schema → build structured payload
  const payload: Record<string, unknown> = {};
  for (const field of schema) {
    if (field.type === 'timestamp') {
      payload[field.key] = new Date().toISOString();
    } else if (field.type === 'number') {
      payload[field.key] = value;
    } else {
      payload[field.key] = field.staticValue ?? '';
    }
  }

  mqtt.publish(topic, payload, qos).catch(console.error);
});

// --- Wire activity logs to WebSocket ---
opcua.on('activity', (entry: ActivityLogEntry) => ws.broadcastActivity(entry));
mqtt.on('activity', (entry: ActivityLogEntry) => ws.broadcastActivity(entry));
mqtt.on('published', ({ topic, payload }: { topic: string; payload: unknown }) => ws.broadcastMqttMessage(topic, payload));

// --- Periodic OPC UA value broadcast to UI ---
setInterval(() => {
  if (opcua.running) {
    ws.broadcastOpcuaValues(opcua.getAllValues());
  }
}, 500);

// --- Express app ---
const app = express();
const server = http.createServer(app);

app.use(express.json());

// API routes
app.use('/api', createApiRouter(ctx));

// WebSocket
ws.attach(server);

// Production: serve built frontend
if (isProd) {
  const clientDist = path.resolve(__dirname, '../client');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// --- Start ---
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (!isProd) {
    console.log('Dev mode: open http://localhost:9433');
  }
});

// --- Graceful shutdown ---
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  ctx.opcuaGenerator.stopAll();
  ctx.mqttGenerator.stopAll();
  if (opcua.running) await opcua.stop();
  if (mqtt.running) await mqtt.stop();
  server.close();
  process.exit(0);
});
