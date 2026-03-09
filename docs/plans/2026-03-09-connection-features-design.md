# OPC/MQTT Sandbox — Connection Features Design

## Goal

Add all fields required to establish connections on the Dashboard, OPC UA, and MQTT pages. The sandbox is designed for external clients to connect in for integration testing — these features make that easy by surfacing endpoint URLs, port configuration, security settings, and connected client visibility.

## Design System

Existing dark slate palette is retained (`bg-slate-950`, `text-slate-100`, `border-slate-800`). No design system changes needed.

- Status indicators: pulsing green dot (running), gray (stopped)
- Forms: controlled inputs with labels, disabled when server running (`opacity-60`)
- Feedback: loading spinners on async operations, inline validation errors
- Icons: Lucide (already in use)

## Dashboard Page — Connection Summary Cards

Enhance existing server status cards:

| Field | OPC UA Card | MQTT Card |
|-------|-------------|-----------|
| Status dot | Green/gray (exists) | Green/gray (exists) |
| Endpoint URL | `opc.tcp://localhost:{port}` + copy button | `mqtt://localhost:{port}` + copy button |
| Port config | Editable number input (disabled when running) | Editable number input (disabled when running) |
| Security | Security mode badge (None/Sign/SignAndEncrypt) | Auth status badge (None/Basic) |
| Connected clients | Client count | Client count (exists) |
| Start/Stop | Toggle button (exists) | Toggle button (exists) |

## OPC UA Page — Server Settings Panel

Collapsible panel above the address space tree:

- **Port** — number input, range 1024–65535, disabled when running
- **Security Mode** — dropdown: None, Sign, SignAndEncrypt
- **Security Policy** — dropdown: None, Basic256Sha256 (visible when mode != None)
- **Endpoint URL** — read-only with copy button (visible when running)
- **Connected Clients** — list of connected client sessions with timestamps

## MQTT Page — Broker Settings Panel

Collapsible panel above the topic tree:

- **Port** — number input, range 1024–65535, disabled when running
- **Authentication** — toggle: None / Username & Password
- **Username / Password** — inputs (visible when auth enabled, disabled when running)
- **Endpoint URL** — read-only with copy button (visible when running)
- **Connected Clients** — expandable list showing client ID + subscribed topics

## Shared UX Patterns

- **Copy button**: Lucide clipboard icon, brief "Copied!" tooltip on click (1.5s)
- **Port input**: Validates 1024–65535, inline error below field
- **Disabled when running**: Inputs become read-only with `opacity-60`, tooltip: "Stop server to change"
- **Collapsible panels**: Chevron toggle, open/closed state per session (React state, not persisted)
- **Loading feedback**: Button shows spinner during start/stop (existing pattern)

## Server-Side Changes

### OPC UA Security
- Accept `securityMode` and `securityPolicy` in start config
- Pass to `node-opcua` server initialization
- Return security info in `/api/status`

### MQTT Authentication
- Accept `username` and `password` in start config
- Configure Aedes `authenticate` handler when credentials provided
- Return auth status in `/api/status`

### Connected Clients
- OPC UA: expose session list via new endpoint or WebSocket broadcast
- MQTT: already tracked via `clientSubscriptions` map, already has `GET /mqtt/clients`

### Status Endpoint Updates
- Add `securityMode`, `securityPolicy` to OPC UA status
- Add `authEnabled` to MQTT status
- Add `connectedClients` list to OPC UA status (currently only MQTT has this)

## Config Persistence

Port, security mode, security policy, and MQTT auth settings are persisted in the project config (via `config-store`). Credentials are stored in the project JSON alongside other config — acceptable for a local sandbox tool.

## Type Changes (`server/types.ts`)

```typescript
// Add to OPC UA config
securityMode?: 'None' | 'Sign' | 'SignAndEncrypt';
securityPolicy?: 'None' | 'Basic256Sha256';

// Add to MQTT config
auth?: { username: string; password: string } | null;

// Add to ServerStatus
opcua: {
  // ...existing
  securityMode: string;
  securityPolicy: string;
  connectedClients: number;
  clients?: Array<{ sessionId: string; connectedAt: string }>;
};
mqtt: {
  // ...existing
  authEnabled: boolean;
};
```
