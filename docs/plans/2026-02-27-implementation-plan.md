# OPC UA / MQTT Test Harness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a self-contained OPC UA + MQTT data source simulator with a web UI for configuring, generating, and monitoring SPC test data.

**Architecture:** Single Node.js/TypeScript monolith running Express (port 3000), node-opcua server (port 4840), and Aedes MQTT broker (port 1883). React SPA frontend served by Express with WebSocket for real-time updates. Config persisted as JSON files.

**Tech Stack:** TypeScript, Express, node-opcua, Aedes, React, Vite, shadcn/ui, Tailwind CSS, WebSocket (ws)

---

## Phase 1: Project Foundation

### Task 1: Scaffold Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.client.json`
- Create: `tsconfig.server.json`
- Create: `vite.config.ts`
- Create: `.gitignore`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/vite-env.d.ts`

**Step 1: Initialize git repo**

```bash
cd C:/Users/djbra/Projects/OPC-MQTT-Server
git init
```

**Step 2: Create package.json**

```json
{
  "name": "opc-mqtt-server",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently -n vite,server -c cyan,yellow \"vite\" \"tsx watch server/index.ts\"",
    "build": "vite build && tsc -p tsconfig.server.json",
    "start": "NODE_ENV=production node dist/server/index.js",
    "typecheck": "tsc -p tsconfig.client.json --noEmit && tsc -p tsconfig.server.json --noEmit"
  },
  "dependencies": {
    "aedes": "^0.51.3",
    "express": "^4.21.0",
    "node-opcua": "^2.131.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "uuid": "^10.0.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/uuid": "^10.0.0",
    "@types/ws": "^8.5.10",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "concurrently": "^9.0.1",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "tsx": "^4.15.7",
    "typescript": "^5.5.3",
    "vite": "^5.3.1"
  }
}
```

**Step 3: Create tsconfig files**

`tsconfig.json` (root references only):
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.client.json" },
    { "path": "./tsconfig.server.json" }
  ]
}
```

`tsconfig.client.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./client/src/*"]
    }
  },
  "include": ["client/src", "vite.config.ts"]
}
```

`tsconfig.server.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist/server",
    "rootDir": "./server",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "sourceMap": true
  },
  "include": ["server/**/*"]
}
```

**Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'client'),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
    },
  },
});
```

**Step 5: Create Tailwind + PostCSS config**

`tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/index.html', './client/src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

`postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 6: Create client entry files**

`client/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OPC UA / MQTT Test Harness</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`client/src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`client/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`client/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';

function Dashboard() {
  return <div className="p-6"><h1 className="text-2xl font-bold">Dashboard</h1></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <nav className="border-b border-gray-800 px-6 py-3 flex gap-6">
          <NavLink to="/" className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>Dashboard</NavLink>
          <NavLink to="/opcua" className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>OPC UA</NavLink>
          <NavLink to="/mqtt" className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>MQTT</NavLink>
          <NavLink to="/activity" className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>Activity</NavLink>
        </nav>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/opcua" element={<div className="p-6">OPC UA Config</div>} />
          <Route path="/mqtt" element={<div className="p-6">MQTT Config</div>} />
          <Route path="/activity" element={<div className="p-6">Activity Monitor</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
```

`client/src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />
```

**Step 7: Create .gitignore**

```
node_modules/
dist/
.env
*.local
configs/*.json
!configs/.gitkeep
```

**Step 8: Create configs directory**

```bash
mkdir -p configs
touch configs/.gitkeep
```

**Step 9: Install dependencies and verify**

```bash
npm install
```

**Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold project with Vite, React, Express, TypeScript"
```

---

### Task 2: Express Server Skeleton

**Files:**
- Create: `server/index.ts`

**Step 1: Create Express server**

`server/index.ts`:
```typescript
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Production: serve built frontend
if (isProd) {
  const clientDist = path.resolve(__dirname, '../client');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { app };
```

**Step 2: Verify server starts**

```bash
npx tsx server/index.ts
# Should print: Server running on http://localhost:3000
# Ctrl+C to stop
```

**Step 3: Verify health endpoint**

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

**Step 4: Commit**

```bash
git add server/
git commit -m "feat: add Express server skeleton with health endpoint"
```

---

### Task 3: Initialize shadcn/ui

**Step 1: Install shadcn/ui dependencies**

```bash
npx shadcn@latest init
```

Follow prompts selecting: TypeScript, Default style, Slate base color, CSS variables, `client/src` as components path.

If the CLI doesn't work well with this directory structure, manually install:

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install -D @types/node
```

Create `client/src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 2: Add commonly needed shadcn components**

```bash
npx shadcn@latest add button card input label tabs select badge separator scroll-area dialog
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui with base components"
```

---

## Phase 2: Protocol Servers

### Task 4: OPC UA Server Wrapper

**Files:**
- Create: `server/opcua-server.ts`
- Create: `server/types.ts`

**Step 1: Create shared types**

`server/types.ts`:
```typescript
export interface OpcuaNodeConfig {
  id: string;
  name: string;
  type: 'folder' | 'object' | 'variable';
  dataType?: 'Double' | 'Int32' | 'String' | 'Boolean';
  initialValue?: string | number | boolean;
  children?: OpcuaNodeConfig[];
  generation?: GenerationConfig;
}

export interface GenerationConfig {
  mode: 'normal' | 'uniform' | 'sine' | 'step' | 'drift';
  nominal?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  rateMs: number;
  stepValues?: number[];
}

export interface MqttTopicConfig {
  id: string;
  topic: string;
  payloadSchema: MqttFieldConfig[];
  qos: 0 | 1 | 2;
  publishOnChange: boolean;
  publishRateMs?: number;
}

export interface MqttFieldConfig {
  key: string;
  type: 'number' | 'string' | 'boolean' | 'timestamp';
  generation?: GenerationConfig;
  staticValue?: string | number | boolean;
}

export interface ProjectConfig {
  name: string;
  opcua: {
    port: number;
    nodes: OpcuaNodeConfig[];
  };
  mqtt: {
    port: number;
    topics: MqttTopicConfig[];
  };
  metadata: {
    partIdPattern: string;
    machineId: string;
    operatorId: string;
    customFields: Record<string, string>;
  };
}

export interface ServerStatus {
  opcua: { running: boolean; port: number; connectedClients: number };
  mqtt: { running: boolean; port: number; connectedClients: number };
}

export interface ActivityLogEntry {
  timestamp: string;
  protocol: 'opcua' | 'mqtt';
  type: 'read' | 'write' | 'publish' | 'subscribe' | 'connect' | 'disconnect';
  detail: string;
}
```

**Step 2: Create OPC UA server wrapper**

`server/opcua-server.ts`:
```typescript
import {
  OPCUAServer,
  AddressSpace,
  UANamespace,
  UAVariable,
  UAObject,
  DataType,
  Variant,
  StatusCodes,
  AccessLevelFlag,
  coerceNodeId,
} from 'node-opcua';
import { OpcuaNodeConfig, ActivityLogEntry } from './types.js';
import { EventEmitter } from 'events';

type NodeMap = Map<string, UAVariable>;

export class OpcuaServerWrapper extends EventEmitter {
  private server: OPCUAServer | null = null;
  private namespace: UANamespace | null = null;
  private addressSpace: AddressSpace | null = null;
  private nodeMap: NodeMap = new Map();
  private port: number;
  private _running = false;

  get running(): boolean {
    return this._running;
  }

  constructor(port = 4840) {
    super();
    this.port = port;
  }

  async start(nodes: OpcuaNodeConfig[]): Promise<void> {
    if (this._running) return;

    this.server = new OPCUAServer({
      port: this.port,
      resourcePath: '/UA/TestHarness',
      buildInfo: {
        productName: 'OPC-MQTT Test Harness',
        buildNumber: '1.0.0',
        buildDate: new Date(),
      },
    });

    await this.server.initialize();
    this.addressSpace = this.server.engine.addressSpace!;
    this.namespace = this.addressSpace.registerNamespace('urn:opc-mqtt-test-harness');

    // Build address space from config
    this.buildNodes(nodes, this.addressSpace.rootFolder.objects);

    await this.server.start();
    this._running = true;
    this.log('connect', `OPC UA server started on port ${this.port}`);
  }

  async stop(): Promise<void> {
    if (!this._running || !this.server) return;
    await this.server.shutdown(1000);
    this.nodeMap.clear();
    this.server = null;
    this.namespace = null;
    this.addressSpace = null;
    this._running = false;
    this.log('disconnect', 'OPC UA server stopped');
  }

  private buildNodes(nodes: OpcuaNodeConfig[], parent: any): void {
    if (!this.namespace) return;

    for (const node of nodes) {
      const nsIdx = this.namespace.index;
      const nodeId = `ns=${nsIdx};s=${node.id}`;

      if (node.type === 'folder') {
        const folder = this.namespace.addFolder(parent, {
          browseName: node.name,
          nodeId,
        });
        if (node.children) {
          this.buildNodes(node.children, folder);
        }
      } else if (node.type === 'object') {
        const obj = this.namespace.addObject({
          organizedBy: parent,
          browseName: node.name,
          nodeId,
        });
        if (node.children) {
          this.buildNodes(node.children, obj);
        }
      } else if (node.type === 'variable') {
        const dataType = this.mapDataType(node.dataType ?? 'Double');
        const variable = this.namespace.addVariable({
          componentOf: parent,
          browseName: node.name,
          nodeId,
          dataType,
          accessLevel: AccessLevelFlag.CurrentRead | AccessLevelFlag.CurrentWrite,
          userAccessLevel: AccessLevelFlag.CurrentRead | AccessLevelFlag.CurrentWrite,
        });

        // Set initial value
        if (node.initialValue !== undefined) {
          variable.setValueFromSource(
            new Variant({ dataType, value: node.initialValue }),
            StatusCodes.Good,
            new Date()
          );
        }

        this.nodeMap.set(node.id, variable);
      }
    }
  }

  private mapDataType(dt: string): DataType {
    switch (dt) {
      case 'Double': return DataType.Double;
      case 'Int32': return DataType.Int32;
      case 'String': return DataType.String;
      case 'Boolean': return DataType.Boolean;
      default: return DataType.Double;
    }
  }

  /** Set a variable's value from external code (manual entry or generator) */
  setValue(nodeId: string, value: number | string | boolean): void {
    const variable = this.nodeMap.get(nodeId);
    if (!variable) return;

    const dataType = variable.dataType.value as number;
    variable.setValueFromSource(
      new Variant({ dataType, value }),
      StatusCodes.Good,
      new Date()
    );
    this.log('write', `${nodeId} = ${value}`);
  }

  /** Read a variable's current value */
  getValue(nodeId: string): { value: any; timestamp: Date } | null {
    const variable = this.nodeMap.get(nodeId);
    if (!variable) return null;

    const dv = variable.readValue();
    return {
      value: dv.value?.value,
      timestamp: dv.sourceTimestamp ?? new Date(),
    };
  }

  /** Get all current values */
  getAllValues(): Record<string, { value: any; timestamp: string }> {
    const result: Record<string, { value: any; timestamp: string }> = {};
    for (const [id, variable] of this.nodeMap) {
      const dv = variable.readValue();
      result[id] = {
        value: dv.value?.value,
        timestamp: (dv.sourceTimestamp ?? new Date()).toISOString(),
      };
    }
    return result;
  }

  /** Add a node at runtime */
  addNode(node: OpcuaNodeConfig, parentId?: string): void {
    if (!this.namespace || !this.addressSpace) return;

    let parent: any;
    if (parentId) {
      const nsIdx = this.namespace.index;
      parent = this.addressSpace.findNode(coerceNodeId(`ns=${nsIdx};s=${parentId}`));
    }
    if (!parent) {
      parent = this.addressSpace.rootFolder.objects;
    }

    this.buildNodes([node], parent);
  }

  /** Remove a node at runtime */
  removeNode(nodeId: string): void {
    if (!this.addressSpace || !this.namespace) return;
    const nsIdx = this.namespace.index;
    const node = this.addressSpace.findNode(coerceNodeId(`ns=${nsIdx};s=${nodeId}`));
    if (node) {
      this.addressSpace.deleteNode(node);
      this.nodeMap.delete(nodeId);
    }
  }

  getNodeIds(): string[] {
    return Array.from(this.nodeMap.keys());
  }

  private log(type: ActivityLogEntry['type'], detail: string): void {
    this.emit('activity', {
      timestamp: new Date().toISOString(),
      protocol: 'opcua',
      type,
      detail,
    } satisfies ActivityLogEntry);
  }
}
```

**Step 3: Verify it compiles**

```bash
npx tsx -e "import './server/opcua-server.js'; console.log('OK')"
```

**Step 4: Commit**

```bash
git add server/types.ts server/opcua-server.ts
git commit -m "feat: add OPC UA server wrapper with dynamic node management"
```

---

### Task 5: MQTT Broker Wrapper

**Files:**
- Create: `server/mqtt-broker.ts`

**Step 1: Create MQTT broker wrapper**

`server/mqtt-broker.ts`:
```typescript
import Aedes from 'aedes';
import { createServer, Server } from 'net';
import type { Client } from 'aedes';
import type { IPublishPacket, ISubscription } from 'mqtt-packet';
import { MqttTopicConfig, ActivityLogEntry } from './types.js';
import { EventEmitter } from 'events';

export class MqttBrokerWrapper extends EventEmitter {
  private broker: InstanceType<typeof Aedes.Server> | null = null;
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
      this.broker = new Aedes.Server({
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

  /** Publish a message from server code */
  publish(topic: string, payload: Record<string, unknown>, qos: 0 | 1 | 2 = 0): Promise<void> {
    if (!this.broker) return Promise.reject(new Error('Broker not running'));

    return new Promise((resolve, reject) => {
      const packet: IPublishPacket = {
        cmd: 'publish',
        topic,
        payload: Buffer.from(JSON.stringify(payload)),
        qos,
        retain: false,
        dup: false,
      };

      this.broker!.publish(packet, (err?: Error) => {
        if (err) reject(err);
        else {
          this.log('publish', `Server -> ${topic}: ${JSON.stringify(payload).substring(0, 200)}`);
          this.emit('published', { topic, payload });
          resolve();
        }
      });
    });
  }

  /** Get all connected client IDs and their subscriptions */
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
```

**Step 2: Verify it compiles**

```bash
npx tsx -e "import './server/mqtt-broker.js'; console.log('OK')"
```

**Step 3: Commit**

```bash
git add server/mqtt-broker.ts
git commit -m "feat: add MQTT broker wrapper with Aedes"
```

---

### Task 6: Data Generator Engine

**Files:**
- Create: `server/generator.ts`

**Step 1: Create the data generator**

`server/generator.ts`:
```typescript
import { GenerationConfig } from './types.js';

export interface GeneratorInstance {
  id: string;
  config: GenerationConfig;
  interval: ReturnType<typeof setInterval> | null;
  currentValue: number;
  tick: number;
}

type ValueCallback = (id: string, value: number) => void;

export class DataGenerator {
  private generators = new Map<string, GeneratorInstance>();
  private callback: ValueCallback;

  constructor(callback: ValueCallback) {
    this.callback = callback;
  }

  start(id: string, config: GenerationConfig): void {
    this.stop(id); // clear any existing generator for this id

    const instance: GeneratorInstance = {
      id,
      config,
      interval: null,
      currentValue: config.nominal ?? 0,
      tick: 0,
    };

    instance.interval = setInterval(() => {
      instance.tick++;
      instance.currentValue = this.generate(instance);
      this.callback(id, instance.currentValue);
    }, config.rateMs);

    this.generators.set(id, instance);
  }

  stop(id: string): void {
    const instance = this.generators.get(id);
    if (instance?.interval) {
      clearInterval(instance.interval);
    }
    this.generators.delete(id);
  }

  stopAll(): void {
    for (const [id] of this.generators) {
      this.stop(id);
    }
  }

  isRunning(id: string): boolean {
    return this.generators.has(id);
  }

  private generate(instance: GeneratorInstance): number {
    const { config, tick } = instance;

    switch (config.mode) {
      case 'normal': {
        const nominal = config.nominal ?? 0;
        const stdDev = config.stdDev ?? 1;
        return nominal + this.boxMullerRandom() * stdDev;
      }

      case 'uniform': {
        const min = config.min ?? 0;
        const max = config.max ?? 100;
        return min + Math.random() * (max - min);
      }

      case 'sine': {
        const nominal = config.nominal ?? 0;
        const amplitude = (config.max ?? 10) - nominal;
        const period = 100; // ticks per full cycle
        return nominal + amplitude * Math.sin((2 * Math.PI * tick) / period);
      }

      case 'step': {
        const steps = config.stepValues ?? [0, 1];
        return steps[tick % steps.length];
      }

      case 'drift': {
        const nominal = config.nominal ?? 0;
        const stdDev = config.stdDev ?? 0.1;
        const driftRate = 0.01; // slow linear drift per tick
        const noise = this.boxMullerRandom() * stdDev;
        return nominal + (tick * driftRate) + noise;
      }

      default:
        return config.nominal ?? 0;
    }
  }

  /** Box-Muller transform for normal distribution */
  private boxMullerRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}
```

**Step 2: Commit**

```bash
git add server/generator.ts
git commit -m "feat: add data generator engine with 5 distribution modes"
```

---

### Task 7: Config Store

**Files:**
- Create: `server/config-store.ts`

**Step 1: Create config store**

`server/config-store.ts`:
```typescript
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProjectConfig } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIGS_DIR = path.resolve(__dirname, '../configs');

// Ensure dev mode also works (tsx runs from project root)
const getConfigsDir = (): string => {
  // In dev, __dirname is the server/ source dir
  // In prod, __dirname is dist/server/
  const devPath = path.resolve(process.cwd(), 'configs');
  return devPath;
};

export class ConfigStore {
  private configsDir: string;

  constructor() {
    this.configsDir = getConfigsDir();
  }

  async ensureDir(): Promise<void> {
    await fs.mkdir(this.configsDir, { recursive: true });
  }

  async save(config: ProjectConfig): Promise<void> {
    await this.ensureDir();
    const filename = this.sanitizeFilename(config.name) + '.json';
    const filepath = path.join(this.configsDir, filename);
    await fs.writeFile(filepath, JSON.stringify(config, null, 2), 'utf-8');
  }

  async load(name: string): Promise<ProjectConfig> {
    const filename = this.sanitizeFilename(name) + '.json';
    const filepath = path.join(this.configsDir, filename);
    const data = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(data) as ProjectConfig;
  }

  async list(): Promise<string[]> {
    await this.ensureDir();
    const files = await fs.readdir(this.configsDir);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
  }

  async delete(name: string): Promise<void> {
    const filename = this.sanitizeFilename(name) + '.json';
    const filepath = path.join(this.configsDir, filename);
    await fs.unlink(filepath);
  }

  getDefaultConfig(): ProjectConfig {
    return {
      name: 'default',
      opcua: {
        port: 4840,
        nodes: [
          {
            id: 'SPC',
            name: 'SPC',
            type: 'folder',
            children: [
              {
                id: 'SPC.Machine1',
                name: 'Machine1',
                type: 'object',
                children: [
                  {
                    id: 'SPC.Machine1.Temperature',
                    name: 'Temperature',
                    type: 'variable',
                    dataType: 'Double',
                    initialValue: 25.0,
                  },
                  {
                    id: 'SPC.Machine1.Pressure',
                    name: 'Pressure',
                    type: 'variable',
                    dataType: 'Double',
                    initialValue: 101.3,
                  },
                ],
              },
            ],
          },
        ],
      },
      mqtt: {
        port: 1883,
        topics: [
          {
            id: 'topic-1',
            topic: 'spc/machine1/measurements',
            payloadSchema: [
              { key: 'temperature', type: 'number' },
              { key: 'pressure', type: 'number' },
              { key: 'timestamp', type: 'timestamp' },
            ],
            qos: 0,
            publishOnChange: false,
            publishRateMs: 1000,
          },
        ],
      },
      metadata: {
        partIdPattern: 'PART-{seq:0000}',
        machineId: 'MACHINE-001',
        operatorId: 'OP-001',
        customFields: {},
      },
    };
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
}
```

**Step 2: Commit**

```bash
git add server/config-store.ts
git commit -m "feat: add JSON config store for project persistence"
```

---

### Task 8: WebSocket Server for Live Updates

**Files:**
- Create: `server/websocket.ts`

**Step 1: Create WebSocket server**

`server/websocket.ts`:
```typescript
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
```

**Step 2: Commit**

```bash
git add server/websocket.ts
git commit -m "feat: add WebSocket server for real-time UI updates"
```

---

## Phase 3: API Layer & Integration

### Task 9: Wire Everything Together in server/index.ts

**Files:**
- Modify: `server/index.ts`
- Create: `server/api.ts`

**Step 1: Create API routes**

`server/api.ts`:
```typescript
import { Router, Request, Response } from 'express';
import { OpcuaServerWrapper } from './opcua-server.js';
import { MqttBrokerWrapper } from './mqtt-broker.js';
import { DataGenerator } from './generator.js';
import { ConfigStore } from './config-store.js';
import { WsServer } from './websocket.js';
import { ProjectConfig, OpcuaNodeConfig, MqttTopicConfig } from './types.js';

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
    res.json(ctx.currentConfig ?? ctx.configStore.getDefaultConfig());
  });

  router.put('/config/current', async (req: Request, res: Response) => {
    ctx.currentConfig = req.body as ProjectConfig;
    await ctx.configStore.save(ctx.currentConfig);
    res.json({ ok: true });
  });

  // --- OPC UA Control ---
  router.post('/opcua/start', async (_req: Request, res: Response) => {
    try {
      const config = ctx.currentConfig ?? ctx.configStore.getDefaultConfig();
      await ctx.opcua.start(config.opcua.nodes);
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

  router.post('/mqtt/publish', async (req: Request, res: Response) => {
    const { topic, payload, qos } = req.body;
    try {
      await ctx.mqtt.publish(topic, payload, qos ?? 0);
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
```

**Step 2: Rewrite server/index.ts to integrate everything**

`server/index.ts`:
```typescript
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

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// --- Initialize components ---
const opcua = new OpcuaServerWrapper();
const mqtt = new MqttBrokerWrapper();
const configStore = new ConfigStore();
const ws = new WsServer();

// Generators push values into the respective protocol servers
const opcuaGenerator = new DataGenerator((nodeId, value) => {
  opcua.setValue(nodeId, value);
});

const mqttGenerator = new DataGenerator((topicId, value) => {
  // For MQTT generation, we build and publish a message
  // This is simplified — in practice each topic has its own schema
  const config = ctx.currentConfig;
  if (!config) return;

  const topicConfig = config.mqtt.topics.find((t) => t.id === topicId);
  if (!topicConfig) return;

  const payload: Record<string, unknown> = {};
  for (const field of topicConfig.payloadSchema) {
    if (field.type === 'timestamp') {
      payload[field.key] = new Date().toISOString();
    } else if (field.type === 'number') {
      payload[field.key] = value; // Use generated value
    } else {
      payload[field.key] = field.staticValue ?? '';
    }
  }

  mqtt.publish(topicConfig.topic, payload, topicConfig.qos).catch(console.error);
});

const ctx = {
  opcua,
  mqtt,
  opcuaGenerator,
  mqttGenerator,
  configStore,
  ws,
  currentConfig: configStore.getDefaultConfig(),
};

// --- Wire activity logs to WebSocket ---
opcua.on('activity', (entry: ActivityLogEntry) => ws.broadcastActivity(entry));
mqtt.on('activity', (entry: ActivityLogEntry) => ws.broadcastActivity(entry));
mqtt.on('published', ({ topic, payload }) => ws.broadcastMqttMessage(topic, payload));

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
    console.log('Dev mode: open http://localhost:5173');
  }
});

// --- Graceful shutdown ---
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  opcuaGenerator.stopAll();
  mqttGenerator.stopAll();
  if (opcua.running) await opcua.stop();
  if (mqtt.running) await mqtt.stop();
  server.close();
  process.exit(0);
});
```

**Step 3: Verify server starts without errors**

```bash
npx tsx server/index.ts
# Expected: Server running on http://localhost:3000
```

**Step 4: Commit**

```bash
git add server/api.ts server/index.ts
git commit -m "feat: integrate all backend components with API routes"
```

---

## Phase 4: Frontend — Dashboard

### Task 10: WebSocket Hook and API Client

**Files:**
- Create: `client/src/hooks/useWebSocket.ts`
- Create: `client/src/lib/api.ts`

**Step 1: Create API client**

`client/src/lib/api.ts`:
```typescript
const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Status
  getStatus: () => request<any>('/status'),

  // Config
  getConfig: () => request<any>('/config/current'),
  updateConfig: (config: any) => request<any>('/config/current', { method: 'PUT', body: JSON.stringify(config) }),
  loadConfig: (name: string) => request<any>('/config/load', { method: 'POST', body: JSON.stringify({ name }) }),

  // Projects
  listProjects: () => request<string[]>('/projects'),
  getProject: (name: string) => request<any>(`/projects/${name}`),
  saveProject: (config: any) => request<any>('/projects', { method: 'POST', body: JSON.stringify(config) }),
  deleteProject: (name: string) => request<any>(`/projects/${name}`, { method: 'DELETE' }),
  getDefaultTemplate: () => request<any>('/projects/default/template'),

  // OPC UA
  startOpcua: () => request<any>('/opcua/start', { method: 'POST' }),
  stopOpcua: () => request<any>('/opcua/stop', { method: 'POST' }),
  getOpcuaValues: () => request<any>('/opcua/values'),
  setOpcuaValue: (nodeId: string, value: any) =>
    request<any>(`/opcua/values/${encodeURIComponent(nodeId)}`, { method: 'POST', body: JSON.stringify({ value }) }),
  addOpcuaNode: (node: any, parentId?: string) =>
    request<any>('/opcua/nodes', { method: 'POST', body: JSON.stringify({ node, parentId }) }),
  removeOpcuaNode: (nodeId: string) =>
    request<any>(`/opcua/nodes/${encodeURIComponent(nodeId)}`, { method: 'DELETE' }),
  startOpcuaGeneration: (nodeId: string, config: any) =>
    request<any>('/opcua/generate/start', { method: 'POST', body: JSON.stringify({ nodeId, config }) }),
  stopOpcuaGeneration: (nodeId: string) =>
    request<any>('/opcua/generate/stop', { method: 'POST', body: JSON.stringify({ nodeId }) }),
  stopAllOpcuaGeneration: () =>
    request<any>('/opcua/generate/stop-all', { method: 'POST' }),

  // MQTT
  startMqtt: () => request<any>('/mqtt/start', { method: 'POST' }),
  stopMqtt: () => request<any>('/mqtt/stop', { method: 'POST' }),
  publishMqtt: (topic: string, payload: any, qos?: number) =>
    request<any>('/mqtt/publish', { method: 'POST', body: JSON.stringify({ topic, payload, qos }) }),
  getMqttClients: () => request<any>('/mqtt/clients'),
  startMqttGeneration: (topicId: string, config: any) =>
    request<any>('/mqtt/generate/start', { method: 'POST', body: JSON.stringify({ topicId, config }) }),
  stopMqttGeneration: (topicId: string) =>
    request<any>('/mqtt/generate/stop', { method: 'POST', body: JSON.stringify({ topicId }) }),
};
```

**Step 2: Create WebSocket hook**

`client/src/hooks/useWebSocket.ts`:
```typescript
import { useEffect, useRef, useCallback, useState } from 'react';

interface WsMessage {
  type: string;
  data: any;
}

type MessageHandler = (msg: WsMessage) => void;

export function useWebSocket(handlers: Record<string, MessageHandler>) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws`;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        // Reconnect after 2 seconds
        setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          const handler = handlersRef.current[msg.type];
          if (handler) handler(msg);
        } catch {
          // ignore parse errors
        }
      };
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { connected };
}
```

**Step 3: Commit**

```bash
git add client/src/lib/api.ts client/src/hooks/useWebSocket.ts
git commit -m "feat: add API client and WebSocket hook for frontend"
```

---

### Task 11: Dashboard Page

**Files:**
- Create: `client/src/pages/Dashboard.tsx`
- Modify: `client/src/App.tsx` (import Dashboard)

**Step 1: Create Dashboard**

`client/src/pages/Dashboard.tsx`:
```tsx
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Status {
  opcua: { running: boolean; port: number };
  mqtt: { running: boolean; port: number; connectedClients: number };
  project: string | null;
}

interface ActivityEntry {
  timestamp: string;
  protocol: 'opcua' | 'mqtt';
  type: string;
  detail: string;
}

export default function Dashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [projects, setProjects] = useState<string[]>([]);

  const { connected } = useWebSocket({
    status: (msg) => setStatus(msg.data),
    activity: (msg) => setActivity((prev) => [msg.data, ...prev].slice(0, 200)),
  });

  const fetchStatus = useCallback(async () => {
    try {
      const s = await api.getStatus();
      setStatus(s);
    } catch (err) {
      console.error('Failed to fetch status', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    api.listProjects().then(setProjects).catch(console.error);
  }, [fetchStatus]);

  const handleToggle = async (protocol: 'opcua' | 'mqtt') => {
    setLoading((prev) => ({ ...prev, [protocol]: true }));
    try {
      if (protocol === 'opcua') {
        if (status?.opcua.running) await api.stopOpcua();
        else await api.startOpcua();
      } else {
        if (status?.mqtt.running) await api.stopMqtt();
        else await api.startMqtt();
      }
      await fetchStatus();
    } catch (err) {
      console.error(err);
    }
    setLoading((prev) => ({ ...prev, [protocol]: false }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className={`text-sm ${connected ? 'text-green-400' : 'text-red-400'}`}>
          {connected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
        </span>
      </div>

      {/* Server Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* OPC UA Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">OPC UA Server</h2>
            <span className={`inline-block w-3 h-3 rounded-full ${status?.opcua.running ? 'bg-green-500' : 'bg-gray-600'}`} />
          </div>
          <p className="text-sm text-gray-400 mb-1">Port: {status?.opcua.port ?? 4840}</p>
          <p className="text-sm text-gray-400 mb-3">Status: {status?.opcua.running ? 'Running' : 'Stopped'}</p>
          <button
            onClick={() => handleToggle('opcua')}
            disabled={loading.opcua}
            className={`px-4 py-2 rounded text-sm font-medium ${
              status?.opcua.running
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            } disabled:opacity-50`}
          >
            {loading.opcua ? '...' : status?.opcua.running ? 'Stop' : 'Start'}
          </button>
        </div>

        {/* MQTT Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">MQTT Broker</h2>
            <span className={`inline-block w-3 h-3 rounded-full ${status?.mqtt.running ? 'bg-green-500' : 'bg-gray-600'}`} />
          </div>
          <p className="text-sm text-gray-400 mb-1">Port: {status?.mqtt.port ?? 1883}</p>
          <p className="text-sm text-gray-400 mb-1">Connected Clients: {status?.mqtt.connectedClients ?? 0}</p>
          <p className="text-sm text-gray-400 mb-3">Status: {status?.mqtt.running ? 'Running' : 'Stopped'}</p>
          <button
            onClick={() => handleToggle('mqtt')}
            disabled={loading.mqtt}
            className={`px-4 py-2 rounded text-sm font-medium ${
              status?.mqtt.running
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            } disabled:opacity-50`}
          >
            {loading.mqtt ? '...' : status?.mqtt.running ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Active Project</h2>
        <p className="text-gray-400">{status?.project ?? 'default'}</p>
        {projects.length > 0 && (
          <div className="mt-2">
            <span className="text-sm text-gray-500">Saved projects: {projects.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
          {activity.length === 0 && (
            <p className="text-gray-500">No activity yet. Start a server to see events.</p>
          )}
          {activity.map((entry, i) => (
            <div key={i} className="flex gap-2 text-gray-300">
              <span className="text-gray-600 whitespace-nowrap">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className={entry.protocol === 'opcua' ? 'text-blue-400' : 'text-purple-400'}>
                [{entry.protocol.toUpperCase()}]
              </span>
              <span className="text-yellow-400">{entry.type}</span>
              <span className="truncate">{entry.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Update App.tsx to use the Dashboard component**

Replace the inline Dashboard function in `App.tsx` with the import:
```tsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
          <span className="font-bold text-lg mr-4">OPC/MQTT Harness</span>
          <NavLink to="/" className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>Dashboard</NavLink>
          <NavLink to="/opcua" className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>OPC UA</NavLink>
          <NavLink to="/mqtt" className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>MQTT</NavLink>
          <NavLink to="/activity" className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>Activity</NavLink>
        </nav>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/opcua" element={<div className="p-6">OPC UA Config — coming next</div>} />
          <Route path="/mqtt" element={<div className="p-6">MQTT Config — coming next</div>} />
          <Route path="/activity" element={<div className="p-6">Activity Monitor — coming next</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
```

**Step 3: Verify dev mode works**

```bash
npm run dev
# Open http://localhost:5173
# Should see Dashboard with start/stop buttons
```

**Step 4: Commit**

```bash
git add client/src/pages/Dashboard.tsx client/src/App.tsx
git commit -m "feat: add Dashboard page with server controls and activity log"
```

---

## Phase 5: Frontend — OPC UA Config

### Task 12: OPC UA Configuration Page

**Files:**
- Create: `client/src/pages/OpcuaConfig.tsx`
- Create: `client/src/components/TreeEditor.tsx`
- Create: `client/src/components/NodeProperties.tsx`
- Modify: `client/src/App.tsx` (import page)

**Step 1: Create TreeEditor component**

`client/src/components/TreeEditor.tsx`:
```tsx
import { useState } from 'react';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'object' | 'variable';
  dataType?: string;
  children?: TreeNode[];
  generation?: any;
  initialValue?: any;
}

interface TreeEditorProps {
  nodes: TreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (parentId: string | null, type: TreeNode['type']) => void;
  onRemove: (id: string) => void;
}

function TreeNodeItem({
  node,
  depth,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (parentId: string | null, type: TreeNode['type']) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const canHaveChildren = node.type !== 'variable';

  const iconMap = {
    folder: '📁',
    object: '📦',
    variable: '📊',
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-800 rounded text-sm ${
          isSelected ? 'bg-gray-800 text-blue-400' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {canHaveChildren && (
          <button
            className="text-gray-500 w-4 text-xs"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {hasChildren ? (expanded ? '▼' : '▶') : ' '}
          </button>
        )}
        {!canHaveChildren && <span className="w-4" />}
        <span>{iconMap[node.type]}</span>
        <span className="flex-1">{node.name}</span>
        {node.type === 'variable' && (
          <span className="text-xs text-gray-500">{node.dataType}</span>
        )}
      </div>
      {expanded && node.children?.map((child) => (
        <TreeNodeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

export default function TreeEditor({ nodes, selectedId, onSelect, onAdd, onRemove }: TreeEditorProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
        <h3 className="text-sm font-semibold">Address Space</h3>
        <div className="flex gap-1">
          <button onClick={() => onAdd(selectedId, 'folder')} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded">+ Folder</button>
          <button onClick={() => onAdd(selectedId, 'object')} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded">+ Object</button>
          <button onClick={() => onAdd(selectedId, 'variable')} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded">+ Variable</button>
          {selectedId && (
            <button onClick={() => onRemove(selectedId)} className="text-xs px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-red-300">Remove</button>
          )}
        </div>
      </div>
      <div className="py-1 max-h-[500px] overflow-y-auto">
        {nodes.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        ))}
        {nodes.length === 0 && (
          <p className="text-gray-500 text-sm p-4">No nodes. Add a folder to get started.</p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Create NodeProperties component**

`client/src/components/NodeProperties.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface NodeConfig {
  id: string;
  name: string;
  type: 'folder' | 'object' | 'variable';
  dataType?: string;
  initialValue?: any;
  generation?: {
    mode: string;
    nominal?: number;
    stdDev?: number;
    min?: number;
    max?: number;
    rateMs: number;
  };
}

interface NodePropertiesProps {
  node: NodeConfig | null;
  liveValue?: { value: any; timestamp: string };
  onUpdate: (node: NodeConfig) => void;
}

export default function NodeProperties({ node, liveValue, onUpdate }: NodePropertiesProps) {
  const [manualValue, setManualValue] = useState('');
  const [genRunning, setGenRunning] = useState(false);

  if (!node) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <p className="text-gray-500 text-sm">Select a node to view its properties.</p>
      </div>
    );
  }

  const isVariable = node.type === 'variable';

  const handleManualWrite = async () => {
    if (!manualValue) return;
    let value: any = manualValue;
    if (node.dataType === 'Double' || node.dataType === 'Int32') value = Number(value);
    if (node.dataType === 'Boolean') value = manualValue === 'true';
    await api.setOpcuaValue(node.id, value);
    setManualValue('');
  };

  const handleStartGen = async () => {
    if (!node.generation) return;
    await api.startOpcuaGeneration(node.id, node.generation);
    setGenRunning(true);
  };

  const handleStopGen = async () => {
    await api.stopOpcuaGeneration(node.id);
    setGenRunning(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="font-semibold">Node Properties</h3>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <span className="text-gray-500">ID:</span>
        <span className="font-mono">{node.id}</span>
        <span className="text-gray-500">Name:</span>
        <input
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
          value={node.name}
          onChange={(e) => onUpdate({ ...node, name: e.target.value })}
        />
        <span className="text-gray-500">Type:</span>
        <span>{node.type}</span>
        {isVariable && (
          <>
            <span className="text-gray-500">Data Type:</span>
            <select
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
              value={node.dataType ?? 'Double'}
              onChange={(e) => onUpdate({ ...node, dataType: e.target.value })}
            >
              <option>Double</option>
              <option>Int32</option>
              <option>String</option>
              <option>Boolean</option>
            </select>
          </>
        )}
      </div>

      {/* Live Value */}
      {isVariable && liveValue && (
        <div className="bg-gray-800 rounded p-2">
          <div className="text-xs text-gray-500">Live Value</div>
          <div className="text-lg font-mono text-green-400">
            {typeof liveValue.value === 'number' ? liveValue.value.toFixed(4) : String(liveValue.value)}
          </div>
          <div className="text-xs text-gray-600">{liveValue.timestamp}</div>
        </div>
      )}

      {/* Manual Value Entry */}
      {isVariable && (
        <div>
          <label className="text-sm text-gray-500 block mb-1">Manual Value</label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="Enter value..."
              onKeyDown={(e) => e.key === 'Enter' && handleManualWrite()}
            />
            <button
              onClick={handleManualWrite}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Write
            </button>
          </div>
        </div>
      )}

      {/* Generation Config */}
      {isVariable && (
        <div className="border-t border-gray-800 pt-3">
          <h4 className="text-sm font-semibold mb-2">Auto Generation</h4>
          <div className="space-y-2 text-sm">
            <div>
              <label className="text-gray-500 block">Mode</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                value={node.generation?.mode ?? 'normal'}
                onChange={(e) =>
                  onUpdate({
                    ...node,
                    generation: { ...node.generation, mode: e.target.value, rateMs: node.generation?.rateMs ?? 1000 },
                  })
                }
              >
                <option value="normal">Normal Distribution</option>
                <option value="uniform">Uniform Distribution</option>
                <option value="sine">Sine Wave</option>
                <option value="step">Step</option>
                <option value="drift">Drift</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-500 block">Nominal</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  value={node.generation?.nominal ?? 0}
                  onChange={(e) =>
                    onUpdate({
                      ...node,
                      generation: { ...node.generation, nominal: Number(e.target.value), mode: node.generation?.mode ?? 'normal', rateMs: node.generation?.rateMs ?? 1000 },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-gray-500 block">Std Dev</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  value={node.generation?.stdDev ?? 1}
                  onChange={(e) =>
                    onUpdate({
                      ...node,
                      generation: { ...node.generation, stdDev: Number(e.target.value), mode: node.generation?.mode ?? 'normal', rateMs: node.generation?.rateMs ?? 1000 },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-gray-500 block">Min</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  value={node.generation?.min ?? 0}
                  onChange={(e) =>
                    onUpdate({
                      ...node,
                      generation: { ...node.generation, min: Number(e.target.value), mode: node.generation?.mode ?? 'normal', rateMs: node.generation?.rateMs ?? 1000 },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-gray-500 block">Max</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  value={node.generation?.max ?? 100}
                  onChange={(e) =>
                    onUpdate({
                      ...node,
                      generation: { ...node.generation, max: Number(e.target.value), mode: node.generation?.mode ?? 'normal', rateMs: node.generation?.rateMs ?? 1000 },
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-gray-500 block">Rate (ms)</label>
              <input
                type="number"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                value={node.generation?.rateMs ?? 1000}
                onChange={(e) =>
                  onUpdate({
                    ...node,
                    generation: { ...node.generation, rateMs: Number(e.target.value), mode: node.generation?.mode ?? 'normal' },
                  })
                }
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleStartGen}
                disabled={genRunning}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm disabled:opacity-50"
              >
                Start
              </button>
              <button
                onClick={handleStopGen}
                disabled={!genRunning}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm disabled:opacity-50"
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create OpcuaConfig page**

`client/src/pages/OpcuaConfig.tsx`:
```tsx
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import TreeEditor from '@/components/TreeEditor';
import NodeProperties from '@/components/NodeProperties';
import { v4 as uuidv4 } from 'uuid';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'object' | 'variable';
  dataType?: string;
  initialValue?: any;
  children?: TreeNode[];
  generation?: any;
}

export default function OpcuaConfig() {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liveValues, setLiveValues] = useState<Record<string, { value: any; timestamp: string }>>({});

  useWebSocket({
    'opcua-values': (msg) => setLiveValues(msg.data),
  });

  useEffect(() => {
    api.getConfig().then((config) => {
      setNodes(config.opcua.nodes);
    }).catch(console.error);
  }, []);

  const findNode = useCallback((nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const selectedNode = selectedId ? findNode(nodes, selectedId) : null;

  const handleAdd = (parentId: string | null, type: TreeNode['type']) => {
    const newId = type + '-' + uuidv4().substring(0, 8);
    const newNode: TreeNode = {
      id: newId,
      name: `New ${type}`,
      type,
      ...(type === 'variable' ? { dataType: 'Double', initialValue: 0 } : {}),
      ...(type !== 'variable' ? { children: [] } : {}),
    };

    if (!parentId) {
      setNodes((prev) => [...prev, newNode]);
    } else {
      setNodes((prev) => addToTree(prev, parentId, newNode));
    }
    setSelectedId(newId);
  };

  const handleRemove = (id: string) => {
    setNodes((prev) => removeFromTree(prev, id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleUpdateNode = (updated: TreeNode) => {
    setNodes((prev) => updateInTree(prev, updated.id, updated));
  };

  const handleSave = async () => {
    const config = await api.getConfig();
    config.opcua.nodes = nodes;
    await api.updateConfig(config);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">OPC UA Configuration</h1>
        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium">
          Save Config
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TreeEditor
          nodes={nodes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
        <NodeProperties
          node={selectedNode}
          liveValue={selectedId ? liveValues[selectedId] : undefined}
          onUpdate={handleUpdateNode}
        />
      </div>

      {/* Live Values Overview */}
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="font-semibold mb-3">All Live Values</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(liveValues).map(([id, { value, timestamp }]) => (
            <div key={id} className="bg-gray-800 rounded p-2">
              <div className="text-xs text-gray-500 truncate">{id}</div>
              <div className="text-sm font-mono text-green-400">
                {typeof value === 'number' ? value.toFixed(4) : String(value)}
              </div>
            </div>
          ))}
          {Object.keys(liveValues).length === 0 && (
            <p className="text-gray-500 text-sm col-span-full">Start the OPC UA server to see live values.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Tree manipulation helpers
function addToTree(nodes: TreeNode[], parentId: string, newNode: TreeNode): TreeNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...(node.children ?? []), newNode] };
    }
    if (node.children) {
      return { ...node, children: addToTree(node.children, parentId, newNode) };
    }
    return node;
  });
}

function removeFromTree(nodes: TreeNode[], id: string): TreeNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: node.children ? removeFromTree(node.children, id) : undefined,
    }));
}

function updateInTree(nodes: TreeNode[], id: string, updated: TreeNode): TreeNode[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...updated, children: node.children };
    if (node.children) {
      return { ...node, children: updateInTree(node.children, id, updated) };
    }
    return node;
  });
}
```

**Step 4: Update App.tsx to import OpcuaConfig**

Add import and replace the placeholder route.

**Step 5: Commit**

```bash
git add client/src/components/ client/src/pages/OpcuaConfig.tsx client/src/App.tsx
git commit -m "feat: add OPC UA config page with tree editor and node properties"
```

---

## Phase 6: Frontend — MQTT Config

### Task 13: MQTT Configuration Page

**Files:**
- Create: `client/src/pages/MqttConfig.tsx`

**Step 1: Create MqttConfig page**

`client/src/pages/MqttConfig.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { v4 as uuidv4 } from 'uuid';

interface MqttField {
  key: string;
  type: 'number' | 'string' | 'boolean' | 'timestamp';
  generation?: any;
  staticValue?: any;
}

interface MqttTopic {
  id: string;
  topic: string;
  payloadSchema: MqttField[];
  qos: 0 | 1 | 2;
  publishOnChange: boolean;
  publishRateMs?: number;
}

interface MqttMessage {
  topic: string;
  payload: any;
  timestamp: string;
}

export default function MqttConfig() {
  const [topics, setTopics] = useState<MqttTopic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [manualTopic, setManualTopic] = useState('');
  const [manualPayload, setManualPayload] = useState('{}');

  useWebSocket({
    'mqtt-message': (msg) => {
      setMessages((prev) => [
        { ...msg.data, timestamp: new Date().toISOString() },
        ...prev,
      ].slice(0, 200));
    },
  });

  useEffect(() => {
    api.getConfig().then((config) => {
      setTopics(config.mqtt.topics);
    }).catch(console.error);
  }, []);

  const selectedTopic = topics.find((t) => t.id === selectedTopicId) ?? null;

  const handleAddTopic = () => {
    const newTopic: MqttTopic = {
      id: 'topic-' + uuidv4().substring(0, 8),
      topic: 'spc/new/topic',
      payloadSchema: [
        { key: 'value', type: 'number' },
        { key: 'timestamp', type: 'timestamp' },
      ],
      qos: 0,
      publishOnChange: false,
      publishRateMs: 1000,
    };
    setTopics((prev) => [...prev, newTopic]);
    setSelectedTopicId(newTopic.id);
  };

  const handleRemoveTopic = (id: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== id));
    if (selectedTopicId === id) setSelectedTopicId(null);
  };

  const handleUpdateTopic = (updated: MqttTopic) => {
    setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleAddField = () => {
    if (!selectedTopic) return;
    const updated = {
      ...selectedTopic,
      payloadSchema: [...selectedTopic.payloadSchema, { key: 'newField', type: 'number' as const }],
    };
    handleUpdateTopic(updated);
  };

  const handleRemoveField = (index: number) => {
    if (!selectedTopic) return;
    const schema = [...selectedTopic.payloadSchema];
    schema.splice(index, 1);
    handleUpdateTopic({ ...selectedTopic, payloadSchema: schema });
  };

  const handleUpdateField = (index: number, field: MqttField) => {
    if (!selectedTopic) return;
    const schema = [...selectedTopic.payloadSchema];
    schema[index] = field;
    handleUpdateTopic({ ...selectedTopic, payloadSchema: schema });
  };

  const handleManualPublish = async () => {
    try {
      const payload = JSON.parse(manualPayload);
      await api.publishMqtt(manualTopic, payload);
    } catch (err) {
      console.error('Invalid JSON or publish failed', err);
    }
  };

  const handleSave = async () => {
    const config = await api.getConfig();
    config.mqtt.topics = topics;
    await api.updateConfig(config);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">MQTT Configuration</h1>
        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium">
          Save Config
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Topic List */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
            <h3 className="text-sm font-semibold">Topics</h3>
            <button onClick={handleAddTopic} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded">+ Topic</button>
          </div>
          <div className="py-1">
            {topics.map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-800 text-sm ${
                  selectedTopicId === t.id ? 'bg-gray-800 text-purple-400' : ''
                }`}
                onClick={() => setSelectedTopicId(t.id)}
              >
                <span className="font-mono truncate">{t.topic}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveTopic(t.id); }}
                  className="text-red-400 hover:text-red-300 text-xs ml-2"
                >
                  ×
                </button>
              </div>
            ))}
            {topics.length === 0 && <p className="text-gray-500 text-sm p-3">No topics. Add one.</p>}
          </div>
        </div>

        {/* Topic Properties + Payload Schema */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
          {!selectedTopic && <p className="text-gray-500 text-sm">Select a topic to configure.</p>}
          {selectedTopic && (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="col-span-2">
                  <label className="text-gray-500 block">Topic Path</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 font-mono"
                    value={selectedTopic.topic}
                    onChange={(e) => handleUpdateTopic({ ...selectedTopic, topic: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-gray-500 block">QoS</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                    value={selectedTopic.qos}
                    onChange={(e) => handleUpdateTopic({ ...selectedTopic, qos: Number(e.target.value) as 0 | 1 | 2 })}
                  >
                    <option value={0}>0 - At most once</option>
                    <option value={1}>1 - At least once</option>
                    <option value={2}>2 - Exactly once</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-500 block">Publish Rate (ms)</label>
                  <input
                    type="number"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                    value={selectedTopic.publishRateMs ?? 1000}
                    onChange={(e) => handleUpdateTopic({ ...selectedTopic, publishRateMs: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Payload Schema */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">Payload Schema</h4>
                  <button onClick={handleAddField} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded">+ Field</button>
                </div>
                <div className="space-y-2">
                  {selectedTopic.payloadSchema.map((field, i) => (
                    <div key={i} className="flex gap-2 items-center text-sm">
                      <input
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 font-mono"
                        value={field.key}
                        placeholder="key"
                        onChange={(e) => handleUpdateField(i, { ...field, key: e.target.value })}
                      />
                      <select
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
                        value={field.type}
                        onChange={(e) => handleUpdateField(i, { ...field, type: e.target.value as MqttField['type'] })}
                      >
                        <option value="number">number</option>
                        <option value="string">string</option>
                        <option value="boolean">boolean</option>
                        <option value="timestamp">timestamp</option>
                      </select>
                      <button
                        onClick={() => handleRemoveField(i)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Manual Publish */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Manual Publish</h3>
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm font-mono"
            value={manualTopic}
            onChange={(e) => setManualTopic(e.target.value)}
            placeholder="Topic path..."
          />
          <button
            onClick={handleManualPublish}
            className="px-4 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium"
          >
            Publish
          </button>
        </div>
        <textarea
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm font-mono h-20"
          value={manualPayload}
          onChange={(e) => setManualPayload(e.target.value)}
          placeholder='{"key": "value"}'
        />
      </div>

      {/* Message Log */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Message Log</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
          {messages.length === 0 && (
            <p className="text-gray-500">No messages yet.</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className="flex gap-2 text-gray-300">
              <span className="text-gray-600 whitespace-nowrap">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-purple-400">{msg.topic}</span>
              <span className="truncate">{JSON.stringify(msg.payload)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Update App.tsx to import MqttConfig**

**Step 3: Commit**

```bash
git add client/src/pages/MqttConfig.tsx client/src/App.tsx
git commit -m "feat: add MQTT config page with topic editor and message log"
```

---

## Phase 7: Frontend — Activity Monitor

### Task 14: Activity Monitor Page

**Files:**
- Create: `client/src/pages/ActivityMonitor.tsx`
- Modify: `client/src/App.tsx`

**Step 1: Create Activity Monitor**

`client/src/pages/ActivityMonitor.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';

interface ActivityEntry {
  timestamp: string;
  protocol: 'opcua' | 'mqtt';
  type: string;
  detail: string;
}

export default function ActivityMonitor() {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'opcua' | 'mqtt'>('all');
  const [mqttClients, setMqttClients] = useState<Record<string, string[]>>({});

  useWebSocket({
    activity: (msg) => setActivity((prev) => [msg.data, ...prev].slice(0, 500)),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      api.getMqttClients().then(setMqttClients).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === 'all' ? activity : activity.filter((e) => e.protocol === filter);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Activity Monitor</h1>

      {/* Connected Clients */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Connected MQTT Clients</h3>
        {Object.keys(mqttClients).length === 0 && (
          <p className="text-gray-500 text-sm">No clients connected.</p>
        )}
        {Object.entries(mqttClients).map(([clientId, topics]) => (
          <div key={clientId} className="text-sm mb-1">
            <span className="font-mono text-purple-400">{clientId}</span>
            {topics.length > 0 && (
              <span className="text-gray-500 ml-2">subscribed to: {topics.join(', ')}</span>
            )}
          </div>
        ))}
      </div>

      {/* Activity Log */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Activity Log</h3>
          <div className="flex gap-1">
            {(['all', 'opcua', 'mqtt'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-xs ${
                  filter === f ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                {f === 'all' ? 'All' : f.toUpperCase()}
              </button>
            ))}
            <button
              onClick={() => setActivity([])}
              className="px-3 py-1 rounded text-xs bg-gray-800 hover:bg-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="space-y-1 max-h-[600px] overflow-y-auto font-mono text-xs">
          {filtered.length === 0 && (
            <p className="text-gray-500">No activity recorded.</p>
          )}
          {filtered.map((entry, i) => (
            <div key={i} className="flex gap-2 text-gray-300">
              <span className="text-gray-600 whitespace-nowrap">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className={entry.protocol === 'opcua' ? 'text-blue-400' : 'text-purple-400'}>
                [{entry.protocol.toUpperCase()}]
              </span>
              <span className="text-yellow-400 w-20">{entry.type}</span>
              <span className="truncate">{entry.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Update App.tsx to import ActivityMonitor, finalize all routes**

```tsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import OpcuaConfig from '@/pages/OpcuaConfig';
import MqttConfig from '@/pages/MqttConfig';
import ActivityMonitor from '@/pages/ActivityMonitor';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
          <span className="font-bold text-lg mr-4">OPC/MQTT Harness</span>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>Dashboard</NavLink>
          <NavLink to="/opcua" className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>OPC UA</NavLink>
          <NavLink to="/mqtt" className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>MQTT</NavLink>
          <NavLink to="/activity" className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>Activity</NavLink>
        </nav>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/opcua" element={<OpcuaConfig />} />
          <Route path="/mqtt" element={<MqttConfig />} />
          <Route path="/activity" element={<ActivityMonitor />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
```

**Step 3: Verify full app runs**

```bash
npm run dev
# Open http://localhost:5173 — navigate all four pages
```

**Step 4: Commit**

```bash
git add client/src/pages/ActivityMonitor.tsx client/src/App.tsx
git commit -m "feat: add Activity Monitor page and finalize routing"
```

---

## Phase 8: Integration Testing

### Task 15: End-to-End Smoke Test

**Step 1: Start the app**

```bash
npm run dev
```

**Step 2: Verify Dashboard**

- Open http://localhost:5173
- Click "Start" on OPC UA server — should turn green
- Click "Start" on MQTT broker — should turn green
- Activity log should show startup messages

**Step 3: Verify OPC UA Config**

- Navigate to OPC UA tab
- Default tree should show SPC > Machine1 > Temperature, Pressure
- Select Temperature node — should see live value updating
- Type a value in Manual Value, click Write — value should change
- Configure auto-generation (Normal, nominal=25, stdDev=0.5, rate=500ms)
- Click Start — values should update rapidly

**Step 4: Verify MQTT Config**

- Navigate to MQTT tab
- Should see default topic `spc/machine1/measurements`
- Type a topic and JSON payload in Manual Publish, click Publish
- Message log should show the published message

**Step 5: Verify Activity Monitor**

- Navigate to Activity tab
- Should see all OPC UA and MQTT events
- Filter buttons should work
- If an external MQTT client connects, it should appear in Connected Clients

**Step 6: Commit any fixes discovered during testing**

```bash
git add -A
git commit -m "fix: integration fixes from smoke testing"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | Tasks 1-3 | Project scaffold, Express server, shadcn/ui |
| 2 | Tasks 4-5 | OPC UA server wrapper, MQTT broker wrapper |
| 3 | Tasks 6-8 | Data generator, config store, WebSocket |
| 4 | Task 9 | Full API layer, all components wired together |
| 5 | Tasks 10-11 | Frontend API client, WebSocket hook, Dashboard |
| 6 | Task 12 | OPC UA config page with tree editor |
| 7 | Task 13 | MQTT config page with payload builder |
| 8 | Task 14-15 | Activity monitor, end-to-end testing |

Total: 15 tasks across 8 phases.
