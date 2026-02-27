import { Router, Request, Response } from 'express';
import { OpcuaServerWrapper } from './opcua-server.js';
import { MqttBrokerWrapper } from './mqtt-broker.js';
import { DataGenerator } from './generator.js';
import { ConfigStore } from './config-store.js';
import { WsServer } from './websocket.js';
import { ProjectConfig, OpcuaNodeConfig } from './types.js';

interface AppContext {
  opcua: OpcuaServerWrapper;
  mqtt: MqttBrokerWrapper;
  opcuaGenerator: DataGenerator;
  mqttGenerator: DataGenerator;
  configStore: ConfigStore;
  ws: WsServer;
  currentConfig: ProjectConfig | null;
}

export function createApiRouter(ctx: AppContext): Router {
  const router = Router();

  // --- Status ---
  router.get('/status', (_req: Request, res: Response) => {
    res.json({
      opcua: {
        running: ctx.opcua.running,
        port: ctx.currentConfig?.opcua.port ?? 4840,
      },
      mqtt: {
        running: ctx.mqtt.running,
        port: ctx.currentConfig?.mqtt.port ?? 1883,
        connectedClients: ctx.mqtt.connectedClients,
      },
      project: ctx.currentConfig?.name ?? null,
    });
  });

  // --- Project Config ---
  router.get('/projects', async (_req: Request, res: Response) => {
    const projects = await ctx.configStore.list();
    res.json(projects);
  });

  router.get('/projects/:name', async (req: Request, res: Response) => {
    try {
      const config = await ctx.configStore.load(req.params.name);
      res.json(config);
    } catch {
      res.status(404).json({ error: 'Project not found' });
    }
  });

  router.post('/projects', async (req: Request, res: Response) => {
    const config = req.body as ProjectConfig;
    await ctx.configStore.save(config);
    res.json({ ok: true });
  });

  router.delete('/projects/:name', async (req: Request, res: Response) => {
    try {
      await ctx.configStore.delete(req.params.name);
      res.json({ ok: true });
    } catch {
      res.status(404).json({ error: 'Project not found' });
    }
  });

  router.get('/projects/default/template', (_req: Request, res: Response) => {
    res.json(ctx.configStore.getDefaultConfig());
  });

  // --- Load/Apply Config ---
  router.post('/config/load', async (req: Request, res: Response) => {
    const { name } = req.body;
    try {
      const config = name ? await ctx.configStore.load(name) : ctx.configStore.getDefaultConfig();
      ctx.currentConfig = config;
      res.json(config);
    } catch {
      res.status(404).json({ error: 'Project not found' });
    }
  });

  router.get('/config/current', (_req: Request, res: Response) => {
    if (!ctx.currentConfig) {
      ctx.currentConfig = ctx.configStore.getDefaultConfig();
    }
    res.json(ctx.currentConfig);
  });

  router.put('/config/current', async (req: Request, res: Response) => {
    ctx.currentConfig = req.body as ProjectConfig;
    await ctx.configStore.save(ctx.currentConfig);
    res.json({ ok: true });
  });

  // --- OPC UA Control ---
  router.post('/opcua/start', async (_req: Request, res: Response) => {
    try {
      if (!ctx.currentConfig) {
        ctx.currentConfig = ctx.configStore.getDefaultConfig();
      }
      await ctx.opcua.start(ctx.currentConfig.opcua.nodes);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/opcua/stop', async (_req: Request, res: Response) => {
    ctx.opcuaGenerator.stopAll();
    await ctx.opcua.stop();
    res.json({ ok: true });
  });

  router.get('/opcua/values', (_req: Request, res: Response) => {
    res.json(ctx.opcua.getAllValues());
  });

  router.post('/opcua/values/:nodeId', (req: Request, res: Response) => {
    const { value } = req.body;
    ctx.opcua.setValue(req.params.nodeId, value);
    res.json({ ok: true });
  });

  router.post('/opcua/nodes', (req: Request, res: Response) => {
    const { node, parentId } = req.body as { node: OpcuaNodeConfig; parentId?: string };
    ctx.opcua.addNode(node, parentId);
    res.json({ ok: true });
  });

  router.delete('/opcua/nodes/:nodeId', (req: Request, res: Response) => {
    ctx.opcua.removeNode(req.params.nodeId);
    res.json({ ok: true });
  });

  // --- OPC UA Generation ---
  router.post('/opcua/generate/start', (req: Request, res: Response) => {
    const { nodeId, config } = req.body;
    ctx.opcuaGenerator.start(nodeId, config);
    res.json({ ok: true });
  });

  router.post('/opcua/generate/stop', (req: Request, res: Response) => {
    const { nodeId } = req.body;
    ctx.opcuaGenerator.stop(nodeId);
    res.json({ ok: true });
  });

  router.post('/opcua/generate/stop-all', (_req: Request, res: Response) => {
    ctx.opcuaGenerator.stopAll();
    res.json({ ok: true });
  });

  // --- MQTT Control ---
  router.post('/mqtt/start', async (_req: Request, res: Response) => {
    try {
      await ctx.mqtt.start();
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/mqtt/stop', async (_req: Request, res: Response) => {
    ctx.mqttGenerator.stopAll();
    await ctx.mqtt.stop();
    res.json({ ok: true });
  });

  // Publish with full control: { topic, payload (any), qos }
  router.post('/mqtt/publish', async (req: Request, res: Response) => {
    const { topic, payload, value, qos } = req.body;
    try {
      // Accept either "payload" (object/any) or "value" (simple scalar)
      const data = payload !== undefined ? payload : value;
      await ctx.mqtt.publish(topic, data, qos ?? 0);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Quick publish a raw value to any topic: POST /mqtt/value/my/topic  { "value": 42.5 }
  // The topic is in the URL path, the value is in the body. Minimal overhead.
  router.post('/mqtt/value/*', async (req: Request, res: Response) => {
    const topic = req.params[0]; // everything after /mqtt/value/
    const { value, qos } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: 'Missing "value" in body' });
    }
    try {
      await ctx.mqtt.publish(topic, value, qos ?? 0);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/mqtt/clients', (_req: Request, res: Response) => {
    res.json(ctx.mqtt.getClients());
  });

  // --- MQTT Generation ---
  router.post('/mqtt/generate/start', (req: Request, res: Response) => {
    const { topicId, config } = req.body;
    ctx.mqttGenerator.start(topicId, config);
    res.json({ ok: true });
  });

  router.post('/mqtt/generate/stop', (req: Request, res: Response) => {
    const { topicId } = req.body;
    ctx.mqttGenerator.stop(topicId);
    res.json({ ok: true });
  });

  return router;
}
