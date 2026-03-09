# Connection Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add port configuration, security settings, endpoint URLs with copy buttons, and connected client visibility to the Dashboard, OPC UA, and MQTT pages.

**Architecture:** Extend existing types with security/auth fields, update server wrappers to accept them, surface new config in the API status response, and build UI panels on each page. A shared `CopyButton` component handles clipboard copy across all pages.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, node-opcua, Aedes MQTT, Lucide icons

---

### Task 1: Extend Type Definitions

**Files:**
- Modify: `server/types.ts`

**Step 1: Add security/auth fields to types**

Add `securityMode` and `securityPolicy` to `ProjectConfig.opcua`, add `auth` to `ProjectConfig.mqtt`, and expand `ServerStatus` with security info and client details.

```typescript
// In ProjectConfig, replace the opcua block (lines 39-42):
opcua: {
  port: number;
  nodes: OpcuaNodeConfig[];
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy: 'None' | 'Basic256Sha256';
};

// In ProjectConfig, replace the mqtt block (lines 43-46):
mqtt: {
  port: number;
  topics: MqttTopicConfig[];
  auth?: { username: string; password: string } | null;
};

// Replace ServerStatus (lines 55-58):
export interface ServerStatus {
  opcua: {
    running: boolean;
    port: number;
    connectedClients: number;
    securityMode: string;
    securityPolicy: string;
  };
  mqtt: {
    running: boolean;
    port: number;
    connectedClients: number;
    authEnabled: boolean;
  };
}
```

**Step 2: Commit**

```bash
git add server/types.ts
git commit -m "feat: add security and auth fields to types"
```

---

### Task 2: Update OPC UA Server for Security

**Files:**
- Modify: `server/opcua-server.ts`

**Step 1: Accept security config in constructor and start**

Update constructor to accept security options and pass them to `OPCUAServer`. Import `MessageSecurityMode` and `SecurityPolicy` from `node-opcua`.

At the top, add to the import (line 1-10):
```typescript
import {
  OPCUAServer,
  AddressSpace,
  UAVariable,
  DataType,
  Variant,
  StatusCodes,
  AccessLevelFlag,
  coerceNodeId,
  MessageSecurityMode,
  SecurityPolicy,
} from 'node-opcua';
```

Add private fields after `private _running` (line 23):
```typescript
private _securityMode: MessageSecurityMode = MessageSecurityMode.None;
private _securityPolicy: SecurityPolicy = SecurityPolicy.None;
```

Add public getters after the `running` getter (line 27):
```typescript
get securityMode(): string {
  return MessageSecurityMode[this._securityMode];
}

get securityPolicy(): string {
  return SecurityPolicy[this._securityPolicy];
}
```

**Step 2: Add a method to configure security before start**

After the constructor (line 32):
```typescript
configure(options: { port?: number; securityMode?: string; securityPolicy?: string }): void {
  if (options.port) this.port = options.port;
  if (options.securityMode) {
    this._securityMode = MessageSecurityMode[options.securityMode as keyof typeof MessageSecurityMode] ?? MessageSecurityMode.None;
  }
  if (options.securityPolicy) {
    this._securityPolicy = SecurityPolicy[options.securityPolicy as keyof typeof SecurityPolicy] ?? SecurityPolicy.None;
  }
}
```

**Step 3: Pass security to OPCUAServer constructor**

In the `start` method (lines 37-45), update the `OPCUAServer` options to include security:
```typescript
this.server = new OPCUAServer({
  port: this.port,
  resourcePath: '/UA/Sandbox',
  securityModes: [this._securityMode],
  securityPolicies: [this._securityPolicy],
  buildInfo: {
    productName: 'OPC/MQTT Sandbox',
    buildNumber: '1.0.0',
    buildDate: new Date(),
  },
});
```

**Step 4: Add connected session count**

After `getNodeIds()` (line 188):
```typescript
getConnectedSessionCount(): number {
  if (!this.server) return 0;
  return this.server.currentSessionCount ?? 0;
}
```

**Step 5: Commit**

```bash
git add server/opcua-server.ts
git commit -m "feat: add security mode and session tracking to OPC UA server"
```

---

### Task 3: Update MQTT Broker for Authentication

**Files:**
- Modify: `server/mqtt-broker.ts`

**Step 1: Add auth config to broker**

Add private fields after `clientSubscriptions` (line 15):
```typescript
private _authEnabled = false;
private _username = '';
private _password = '';
```

Add public getter after the `connectedClients` getter (line 23):
```typescript
get authEnabled(): boolean {
  return this._authEnabled;
}
```

**Step 2: Add configure method**

After the constructor (line 28):
```typescript
configure(options: { port?: number; auth?: { username: string; password: string } | null }): void {
  if (options.port) this.port = options.port;
  if (options.auth) {
    this._authEnabled = true;
    this._username = options.auth.username;
    this._password = options.auth.password;
  } else {
    this._authEnabled = false;
    this._username = '';
    this._password = '';
  }
}
```

**Step 3: Wire auth into Aedes broker creation**

In the `start` method (line 34), add the `authenticate` handler to the Aedes config when auth is enabled. Replace the broker creation:

```typescript
const brokerOpts: any = {
  id: 'opc-mqtt-sandbox',
  concurrency: 100,
  connectTimeout: 30_000,
};

if (this._authEnabled) {
  brokerOpts.authenticate = (
    _client: Client,
    username: Readonly<string> | undefined,
    password: Readonly<Buffer> | undefined,
    callback: (error: Error | null, success: boolean | null) => void
  ) => {
    const valid = username === this._username && password?.toString() === this._password;
    callback(null, valid);
  };
}

this.broker = Aedes.createBroker(brokerOpts);
```

**Step 4: Commit**

```bash
git add server/mqtt-broker.ts
git commit -m "feat: add authentication support to MQTT broker"
```

---

### Task 4: Update API Routes

**Files:**
- Modify: `server/api.ts`

**Step 1: Expand status endpoint (lines 23-36)**

Replace the `/status` handler to include security info:

```typescript
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    opcua: {
      running: ctx.opcua.running,
      port: ctx.currentConfig?.opcua.port ?? 4840,
      connectedClients: ctx.opcua.getConnectedSessionCount(),
      securityMode: ctx.currentConfig?.opcua.securityMode ?? 'None',
      securityPolicy: ctx.currentConfig?.opcua.securityPolicy ?? 'None',
    },
    mqtt: {
      running: ctx.mqtt.running,
      port: ctx.currentConfig?.mqtt.port ?? 1883,
      connectedClients: ctx.mqtt.connectedClients,
      authEnabled: ctx.mqtt.authEnabled,
    },
    project: ctx.currentConfig?.name ?? null,
  });
});
```

**Step 2: Update OPC UA start to configure before starting (lines 98-108)**

Replace the `/opcua/start` handler:

```typescript
router.post('/opcua/start', async (_req: Request, res: Response) => {
  try {
    if (!ctx.currentConfig) {
      ctx.currentConfig = ctx.configStore.getDefaultConfig();
    }
    ctx.opcua.configure({
      port: ctx.currentConfig.opcua.port,
      securityMode: ctx.currentConfig.opcua.securityMode,
      securityPolicy: ctx.currentConfig.opcua.securityPolicy,
    });
    await ctx.opcua.start(ctx.currentConfig.opcua.nodes);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to start OPC UA server' });
  }
});
```

**Step 3: Update MQTT start to configure before starting (lines 168-175)**

Replace the `/mqtt/start` handler:

```typescript
router.post('/mqtt/start', async (_req: Request, res: Response) => {
  try {
    if (!ctx.currentConfig) {
      ctx.currentConfig = ctx.configStore.getDefaultConfig();
    }
    ctx.mqtt.configure({
      port: ctx.currentConfig.mqtt.port,
      auth: ctx.currentConfig.mqtt.auth,
    });
    await ctx.mqtt.start();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to start MQTT broker' });
  }
});
```

**Step 4: Commit**

```bash
git add server/api.ts
git commit -m "feat: pass security/auth config through API start endpoints"
```

---

### Task 5: Update Default Config

**Files:**
- Modify: `server/config-store.ts`

**Step 1: Add security defaults to getDefaultConfig() (lines 44-104)**

In the `opcua` block of `getDefaultConfig()`, after `port: 4840,` add:
```typescript
securityMode: 'None' as const,
securityPolicy: 'None' as const,
```

In the `mqtt` block, after `port: 1883,` add:
```typescript
auth: null,
```

**Step 2: Commit**

```bash
git add server/config-store.ts
git commit -m "feat: add security/auth defaults to config store"
```

---

### Task 6: Update Client API

**Files:**
- Modify: `client/src/lib/api.ts`

**Step 1: Add startOpcua and startMqtt to accept config**

Replace the two start methods (lines 32-33 and 49-50):

```typescript
// OPC UA - update startOpcua to accept optional config
startOpcua: (config?: { port?: number; securityMode?: string; securityPolicy?: string }) =>
  request<any>('/opcua/start', { method: 'POST', body: JSON.stringify(config ?? {}) }),

// MQTT - update startMqtt to accept optional config
startMqtt: (config?: { port?: number; auth?: { username: string; password: string } | null }) =>
  request<any>('/mqtt/start', { method: 'POST', body: JSON.stringify(config ?? {}) }),
```

**Step 2: Commit**

```bash
git add client/src/lib/api.ts
git commit -m "feat: update API client with config-aware start methods"
```

---

### Task 7: Create CopyButton Component

**Files:**
- Create: `client/src/components/CopyButton.tsx`

**Step 1: Build the component**

```tsx
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export default function CopyButton({ text, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors duration-150 cursor-pointer ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied && <span className="text-xs text-emerald-400">Copied!</span>}
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/CopyButton.tsx
git commit -m "feat: add CopyButton component"
```

---

### Task 8: Update Dashboard Page

**Files:**
- Modify: `client/src/pages/Dashboard.tsx`

**Step 1: Update Status interface (lines 5-9)**

```typescript
interface Status {
  opcua: {
    running: boolean;
    port: number;
    connectedClients: number;
    securityMode: string;
    securityPolicy: string;
  };
  mqtt: {
    running: boolean;
    port: number;
    connectedClients: number;
    authEnabled: boolean;
  };
  project: string | null;
}
```

**Step 2: Add port editing state and config saving**

After the existing state declarations (line 22), add:
```typescript
const [opcuaPort, setOpcuaPort] = useState(4840);
const [mqttPort, setMqttPort] = useState(1883);
```

After `fetchStatus` (line 36), add a helper to persist port changes:
```typescript
const updatePort = useCallback(async (protocol: 'opcua' | 'mqtt', port: number) => {
  try {
    const config = await api.getConfig();
    if (protocol === 'opcua') config.opcua.port = port;
    else config.mqtt.port = port;
    await api.updateConfig(config);
  } catch (err) {
    console.error('Failed to update port', err);
  }
}, []);
```

In the existing `useEffect` (line 38-41), after `fetchStatus()` add:
```typescript
api.getConfig().then((config) => {
  setOpcuaPort(config.opcua.port);
  setMqttPort(config.mqtt.port);
}).catch(console.error);
```

**Step 3: Enhance OPC UA card (lines 73-93)**

Replace the OPC UA card entirely. Add CopyButton import at top. The card should include:
- Endpoint URL with copy button (visible when running)
- Port input (disabled when running)
- Security mode badge
- Connected clients count
- Start/Stop button

```tsx
import CopyButton from '@/components/CopyButton';
```

OPC UA card replacement:
```tsx
<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-lg font-semibold text-slate-200">OPC UA Server</h2>
    <span className={`inline-block w-2.5 h-2.5 rounded-full transition-colors duration-300 ${status?.opcua.running ? 'bg-emerald-400' : 'bg-slate-600'}`} />
  </div>

  {/* Endpoint URL */}
  {status?.opcua.running && (
    <div className="flex items-center gap-2 mb-2 bg-slate-800 rounded px-3 py-1.5">
      <code className="text-sm font-mono text-emerald-400">opc.tcp://localhost:{status.opcua.port}</code>
      <CopyButton text={`opc.tcp://localhost:${status.opcua.port}`} />
    </div>
  )}

  {/* Port */}
  <div className="mb-2">
    <label htmlFor="opcua-port" className="text-xs text-slate-500 block mb-1">Port</label>
    <input
      id="opcua-port"
      type="number"
      min={1024}
      max={65535}
      value={opcuaPort}
      onChange={(e) => setOpcuaPort(Number(e.target.value))}
      onBlur={() => updatePort('opcua', opcuaPort)}
      disabled={status?.opcua.running}
      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none disabled:opacity-60"
    />
  </div>

  {/* Info row */}
  <div className="flex items-center gap-3 text-sm text-slate-400 mb-3">
    <span>Security: <span className="text-slate-300">{status?.opcua.securityMode ?? 'None'}</span></span>
    <span>Clients: <span className="text-slate-300">{status?.opcua.connectedClients ?? 0}</span></span>
  </div>

  <button
    onClick={() => handleToggle('opcua')}
    disabled={loading.opcua}
    className={`px-4 py-2 rounded text-sm font-medium transition-colors duration-150 cursor-pointer ${
      status?.opcua.running
        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
    } disabled:opacity-50`}
  >
    {loading.opcua ? '...' : status?.opcua.running ? 'Stop' : 'Start'}
  </button>
</div>
```

**Step 4: Enhance MQTT card (lines 95-117)**

Replace the MQTT card. Similar structure: endpoint URL, port input, auth badge, client count.

```tsx
<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-lg font-semibold text-slate-200">MQTT Broker</h2>
    <span className={`inline-block w-2.5 h-2.5 rounded-full transition-colors duration-300 ${status?.mqtt.running ? 'bg-emerald-400' : 'bg-slate-600'}`} />
  </div>

  {/* Endpoint URL */}
  {status?.mqtt.running && (
    <div className="flex items-center gap-2 mb-2 bg-slate-800 rounded px-3 py-1.5">
      <code className="text-sm font-mono text-emerald-400">mqtt://localhost:{status.mqtt.port}</code>
      <CopyButton text={`mqtt://localhost:${status.mqtt.port}`} />
    </div>
  )}

  {/* Port */}
  <div className="mb-2">
    <label htmlFor="mqtt-port" className="text-xs text-slate-500 block mb-1">Port</label>
    <input
      id="mqtt-port"
      type="number"
      min={1024}
      max={65535}
      value={mqttPort}
      onChange={(e) => setMqttPort(Number(e.target.value))}
      onBlur={() => updatePort('mqtt', mqttPort)}
      disabled={status?.mqtt.running}
      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none disabled:opacity-60"
    />
  </div>

  {/* Info row */}
  <div className="flex items-center gap-3 text-sm text-slate-400 mb-3">
    <span>Auth: <span className="text-slate-300">{status?.mqtt.authEnabled ? 'Enabled' : 'None'}</span></span>
    <span>Clients: <span className="text-slate-300">{status?.mqtt.connectedClients ?? 0}</span></span>
  </div>

  <button
    onClick={() => handleToggle('mqtt')}
    disabled={loading.mqtt}
    className={`px-4 py-2 rounded text-sm font-medium transition-colors duration-150 cursor-pointer ${
      status?.mqtt.running
        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
    } disabled:opacity-50`}
  >
    {loading.mqtt ? '...' : status?.mqtt.running ? 'Stop' : 'Start'}
  </button>
</div>
```

**Step 5: Commit**

```bash
git add client/src/pages/Dashboard.tsx
git commit -m "feat: add connection info, port config, and security badges to Dashboard"
```

---

### Task 9: Update OPC UA Page — Server Settings Panel

**Files:**
- Modify: `client/src/pages/OpcuaConfig.tsx`

**Step 1: Add state for server settings**

Import CopyButton and add state. After existing imports (line 6):
```typescript
import CopyButton from '@/components/CopyButton';
import { ChevronDown, ChevronRight } from 'lucide-react';
```

After `liveValues` state (line 21), add:
```typescript
const [serverRunning, setServerRunning] = useState(false);
const [port, setPort] = useState(4840);
const [securityMode, setSecurityMode] = useState<'None' | 'Sign' | 'SignAndEncrypt'>('None');
const [securityPolicy, setSecurityPolicy] = useState<'None' | 'Basic256Sha256'>('None');
const [settingsOpen, setSettingsOpen] = useState(true);
const [connectedClients, setConnectedClients] = useState(0);
```

**Step 2: Load server settings from config and status**

Update the existing `useEffect` (lines 27-31) to also load settings:
```typescript
useEffect(() => {
  api.getConfig().then((config) => {
    setNodes(config.opcua.nodes);
    setPort(config.opcua.port ?? 4840);
    setSecurityMode(config.opcua.securityMode ?? 'None');
    setSecurityPolicy(config.opcua.securityPolicy ?? 'None');
  }).catch(console.error);
  api.getStatus().then((s) => {
    setServerRunning(s.opcua.running);
    setConnectedClients(s.opcua.connectedClients ?? 0);
  }).catch(console.error);
}, []);
```

Add a WebSocket handler for status updates. Update the `useWebSocket` call (lines 23-25):
```typescript
useWebSocket({
  'opcua-values': (msg) => setLiveValues(msg.data),
  activity: (msg) => {
    if (msg.data.protocol === 'opcua' && (msg.data.type === 'connect' || msg.data.type === 'disconnect')) {
      api.getStatus().then((s) => {
        setServerRunning(s.opcua.running);
        setConnectedClients(s.opcua.connectedClients ?? 0);
      }).catch(console.error);
    }
  },
});
```

**Step 3: Add save handler that includes settings**

Replace `handleSave` (lines 73-77):
```typescript
const handleSave = async () => {
  const config = await api.getConfig();
  config.opcua.nodes = nodes;
  config.opcua.port = port;
  config.opcua.securityMode = securityMode;
  config.opcua.securityPolicy = securityPolicy;
  await api.updateConfig(config);
};
```

**Step 4: Add Server Settings panel**

Insert the Server Settings panel between the header and the grid. After the header `div` (line 86), before the grid (line 88):

```tsx
{/* Server Settings */}
<div className="mb-4 bg-slate-900 border border-slate-800 rounded-lg">
  <button
    onClick={() => setSettingsOpen(!settingsOpen)}
    className="w-full flex items-center justify-between p-4 cursor-pointer"
  >
    <h2 className="text-sm font-semibold text-slate-200">Server Settings</h2>
    {settingsOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
  </button>
  {settingsOpen && (
    <div className="px-4 pb-4 space-y-3">
      {/* Endpoint URL */}
      {serverRunning && (
        <div className="flex items-center gap-2 bg-slate-800 rounded px-3 py-1.5">
          <code className="text-sm font-mono text-emerald-400">opc.tcp://localhost:{port}</code>
          <CopyButton text={`opc.tcp://localhost:${port}`} />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {/* Port */}
        <div>
          <label htmlFor="opcua-port" className="text-slate-400 block mb-1">Port</label>
          <input
            id="opcua-port"
            type="number"
            min={1024}
            max={65535}
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            disabled={serverRunning}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none disabled:opacity-60"
          />
        </div>

        {/* Security Mode */}
        <div>
          <label htmlFor="opcua-security-mode" className="text-slate-400 block mb-1">Security Mode</label>
          <select
            id="opcua-security-mode"
            value={securityMode}
            onChange={(e) => setSecurityMode(e.target.value as typeof securityMode)}
            disabled={serverRunning}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none disabled:opacity-60"
          >
            <option value="None">None</option>
            <option value="Sign">Sign</option>
            <option value="SignAndEncrypt">Sign & Encrypt</option>
          </select>
        </div>

        {/* Security Policy */}
        {securityMode !== 'None' && (
          <div>
            <label htmlFor="opcua-security-policy" className="text-slate-400 block mb-1">Security Policy</label>
            <select
              id="opcua-security-policy"
              value={securityPolicy}
              onChange={(e) => setSecurityPolicy(e.target.value as typeof securityPolicy)}
              disabled={serverRunning}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none disabled:opacity-60"
            >
              <option value="None">None</option>
              <option value="Basic256Sha256">Basic256Sha256</option>
            </select>
          </div>
        )}

        {/* Connected Clients */}
        <div>
          <span className="text-slate-400 block mb-1">Connected Clients</span>
          <span className="text-slate-200 text-lg font-mono">{connectedClients}</span>
        </div>
      </div>

      {serverRunning && (
        <p className="text-xs text-slate-500">Stop the server to change settings.</p>
      )}
    </div>
  )}
</div>
```

**Step 5: Commit**

```bash
git add client/src/pages/OpcuaConfig.tsx
git commit -m "feat: add Server Settings panel to OPC UA page"
```

---

### Task 10: Update MQTT Page — Broker Settings Panel

**Files:**
- Modify: `client/src/pages/MqttConfig.tsx`

**Step 1: Add state for broker settings**

Import CopyButton and chevron icons. After existing imports (line 5):
```typescript
import CopyButton from '@/components/CopyButton';
import { ChevronDown, ChevronRight } from 'lucide-react';
```

After `manualPayload` state (line 36), add:
```typescript
const [brokerRunning, setBrokerRunning] = useState(false);
const [port, setPort] = useState(1883);
const [authEnabled, setAuthEnabled] = useState(false);
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');
const [settingsOpen, setSettingsOpen] = useState(true);
const [clients, setClients] = useState<Record<string, string[]>>({});
```

**Step 2: Load broker settings from config and status**

Update the existing `useEffect` (lines 47-51):
```typescript
useEffect(() => {
  api.getConfig().then((config) => {
    setTopics(config.mqtt.topics);
    setPort(config.mqtt.port ?? 1883);
    if (config.mqtt.auth) {
      setAuthEnabled(true);
      setUsername(config.mqtt.auth.username);
      setPassword(config.mqtt.auth.password);
    }
  }).catch(console.error);
  api.getStatus().then((s) => {
    setBrokerRunning(s.mqtt.running);
  }).catch(console.error);
}, []);
```

Update the `useWebSocket` call (lines 38-45) to also track status:
```typescript
useWebSocket({
  'mqtt-message': (msg) => {
    setMessages((prev) => [
      { ...msg.data, timestamp: new Date().toISOString() },
      ...prev,
    ].slice(0, 200));
  },
  activity: (msg) => {
    if (msg.data.protocol === 'mqtt' && (msg.data.type === 'connect' || msg.data.type === 'disconnect')) {
      api.getStatus().then((s) => setBrokerRunning(s.mqtt.running)).catch(console.error);
      api.getMqttClients().then(setClients).catch(console.error);
    }
  },
});
```

**Step 3: Update handleSave to include broker settings**

Replace `handleSave` (lines 123-136):
```typescript
const handleSave = async () => {
  setSaveStatus('saving');
  try {
    const config = await api.getConfig();
    config.mqtt.topics = topics;
    config.mqtt.port = port;
    config.mqtt.auth = authEnabled ? { username, password } : null;
    await api.updateConfig(config);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  } catch (err) {
    console.error('Save failed', err);
    setSaveStatus('error');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }
};
```

**Step 4: Add Broker Settings panel**

Insert between the header and the grid. After the header `div` (line 156), before the grid (line 158):

```tsx
{/* Broker Settings */}
<div className="bg-slate-900 border border-slate-800 rounded-lg">
  <button
    onClick={() => setSettingsOpen(!settingsOpen)}
    className="w-full flex items-center justify-between p-4 cursor-pointer"
  >
    <h2 className="text-sm font-semibold text-slate-200">Broker Settings</h2>
    {settingsOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
  </button>
  {settingsOpen && (
    <div className="px-4 pb-4 space-y-3">
      {/* Endpoint URL */}
      {brokerRunning && (
        <div className="flex items-center gap-2 bg-slate-800 rounded px-3 py-1.5">
          <code className="text-sm font-mono text-emerald-400">mqtt://localhost:{port}</code>
          <CopyButton text={`mqtt://localhost:${port}`} />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {/* Port */}
        <div>
          <label htmlFor="mqtt-port" className="text-slate-400 block mb-1">Port</label>
          <input
            id="mqtt-port"
            type="number"
            min={1024}
            max={65535}
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            disabled={brokerRunning}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none disabled:opacity-60"
          />
        </div>

        {/* Auth Toggle */}
        <div>
          <span className="text-slate-400 block mb-1">Authentication</span>
          <button
            onClick={() => setAuthEnabled(!authEnabled)}
            disabled={brokerRunning}
            className={`px-3 py-1.5 rounded text-sm transition-colors duration-150 cursor-pointer ${
              authEnabled ? 'bg-blue-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-400'
            } disabled:opacity-60`}
          >
            {authEnabled ? 'Enabled' : 'None'}
          </button>
        </div>

        {/* Username */}
        {authEnabled && (
          <div>
            <label htmlFor="mqtt-username" className="text-slate-400 block mb-1">Username</label>
            <input
              id="mqtt-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={brokerRunning}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none disabled:opacity-60"
            />
          </div>
        )}

        {/* Password */}
        {authEnabled && (
          <div>
            <label htmlFor="mqtt-password" className="text-slate-400 block mb-1">Password</label>
            <input
              id="mqtt-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={brokerRunning}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none disabled:opacity-60"
            />
          </div>
        )}
      </div>

      {/* Connected Clients */}
      {brokerRunning && Object.keys(clients).length > 0 && (
        <div>
          <span className="text-slate-400 text-sm block mb-1">Connected Clients</span>
          <div className="space-y-1">
            {Object.entries(clients).map(([clientId, subs]) => (
              <div key={clientId} className="bg-slate-800 rounded px-3 py-1.5 text-xs">
                <span className="text-slate-200 font-mono">{clientId}</span>
                {subs.length > 0 && (
                  <span className="text-slate-500 ml-2">subscribed: {subs.join(', ')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {brokerRunning && (
        <p className="text-xs text-slate-500">Stop the broker to change settings.</p>
      )}
    </div>
  )}
</div>
```

**Step 5: Commit**

```bash
git add client/src/pages/MqttConfig.tsx
git commit -m "feat: add Broker Settings panel to MQTT page"
```

---

### Task 11: Verify and Update Branding References

**Files:**
- Modify: `server/opcua-server.ts` (already done in Task 2 — resourcePath + productName)

**Step 1: Verify all "Test Harness" references are gone**

Search codebase for "Test Harness" or "test-harness" and update any remaining references to "Sandbox" or "opc-mqtt-sandbox".

**Step 2: Commit if any changes**

```bash
git add -A
git commit -m "chore: update remaining branding references to Sandbox"
```

---

### Task 12: Manual Verification

**No files changed. Verification only.**

**Step 1: Start the dev server**

```bash
npx tsx start-dev.ts
```

**Step 2: Verify Dashboard**

Open http://localhost:9433. Check:
- OPC UA card shows port input, start button
- MQTT card shows port input, start button
- Start OPC UA — endpoint URL appears with copy button, security badge shows "None"
- Start MQTT — endpoint URL appears with copy button, auth badge shows "None"
- Click copy button — verify clipboard has correct URL

**Step 3: Verify OPC UA page**

Navigate to /opcua. Check:
- Server Settings panel visible with port, security mode, security policy
- Fields disabled when server is running
- Endpoint URL with copy button appears when running
- Connected clients count shown

**Step 4: Verify MQTT page**

Navigate to /mqtt. Check:
- Broker Settings panel visible with port, auth toggle
- Toggle auth — username/password fields appear
- Fields disabled when broker is running
- Endpoint URL with copy button appears when running
- Connected clients list shown when clients connect

**Step 5: Typecheck**

```bash
npm run typecheck
```

Ensure no TypeScript errors.
