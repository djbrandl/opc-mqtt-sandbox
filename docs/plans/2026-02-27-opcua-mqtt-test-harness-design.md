# OPC UA / MQTT Test Harness Design

## Purpose

A self-contained test harness that simulates OPC UA and MQTT data sources for an SPC (Statistical Process Control) application. The app hosts an OPC UA server and an embedded MQTT broker, generates configurable measurement data, and provides a web UI for configuration and monitoring.

## Architecture

Single Node.js/TypeScript process running three embedded services:

```
┌─────────────────────────────────────────────────────┐
│                  Single Node.js Process              │
│                                                      │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Express API  │  │  node-opcua  │  │   Aedes    │ │
│  │  + WebSocket  │  │  OPC UA Srv  │  │  MQTT Brkr │ │
│  │  (port 3000)  │  │ (port 4840)  │  │ (port 1883)│ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                  │                │        │
│         └──────── Shared State Manager ─────┘        │
│                        │                             │
│              ┌─────────┴─────────┐                   │
│              │  Config Store     │                   │
│              │  (JSON files)     │                   │
│              └───────────────────┘                   │
└─────────────────────────────────────────────────────┘
         ▲                    ▲              ▲
         │                    │              │
    Browser UI          SPC App via     SPC App via
    (React SPA)         OPC UA client   MQTT subscribe
```

- **Express API + WebSocket** (port 3000) — serves React SPA, REST API for config, WebSocket for live updates
- **node-opcua server** (port 4840) — configurable OPC UA address space
- **Aedes MQTT broker** (port 1883) — embedded broker, accepts subscriptions and publishes data
- **Shared State Manager** — in-memory state synchronized across all components
- **Config Store** — JSON files on disk for saving/loading project configurations

OPC UA and MQTT operate independently — no cross-protocol value binding.

## Data Model

```
Project (JSON file)
├── name: string
├── opcua:
│   └── nodes: TreeNode[]
│       ├── id: string
│       ├── name: string
│       ├── type: "folder" | "object" | "variable"
│       ├── dataType: "Double" | "Int32" | "String" | "Boolean"
│       ├── children: TreeNode[]
│       └── generation:              // Optional auto-generation config
│           ├── mode: "normal" | "uniform" | "sine" | "step" | "drift"
│           ├── nominal: number
│           ├── stdDev: number
│           ├── min/max: number
│           └── rateMs: number
├── mqtt:
│   └── topics: TopicConfig[]
│       ├── topic: string
│       ├── payloadSchema: Field[]
│       │   ├── key: string
│       │   ├── type: "number" | "string" | "boolean" | "timestamp"
│       │   └── generation: GenerationConfig (same options as OPC UA)
│       ├── qos: 0 | 1 | 2
│       └── publishOnChange: boolean
└── metadata:
    ├── partIdPattern: string        // e.g., "PART-{seq:0000}"
    ├── machineId: string
    ├── operatorId: string
    └── customFields: { key: value }
```

### Data Generation Modes

Available for both OPC UA variables and MQTT payload fields:

- **Normal distribution** — bell curve around nominal with configurable std deviation
- **Uniform distribution** — random values between min and max
- **Sine wave** — oscillating values for cyclical patterns
- **Step** — discrete jumps between values at intervals
- **Drift** — gradual shift from nominal over time (simulates process drift)

Each generator runs independently on a configurable interval (rateMs).

## UI Design

React SPA with four views:

### 1. Dashboard (Home)
- Server status indicators (OPC UA running/stopped, MQTT running/stopped)
- Quick stats: connected clients, messages/sec
- Start/Stop buttons for each server
- Active project name, load/save controls

### 2. OPC UA Configuration
- Tree editor for building the OPC UA address space (folders, objects, variables)
- Node properties panel (name, data type, initial value)
- Per-variable generation config (mode, nominal, stdDev, rate)
- Manual value entry to push specific values on demand
- Live values panel showing current values in real-time

### 3. MQTT Configuration
- Topic list with add/remove/edit
- Payload schema builder per topic (define JSON fields, types, generation)
- Per-field generation config
- Manual publish to compose and send messages on demand
- Message log with live scrolling view

### 4. Activity Monitor
- Combined real-time log of OPC UA reads/writes and MQTT publishes
- Connected client list for both protocols
- Message rate graphs

## Tech Stack

| Component | Library | Purpose |
|-----------|---------|---------|
| Backend | Express + TypeScript | API server, serves SPA |
| Real-time | ws (WebSocket) | Push live values/logs to UI |
| OPC UA | node-opcua | OPC UA server implementation |
| MQTT Broker | Aedes | Embeddable MQTT broker |
| Frontend | React + TypeScript | SPA with Vite for dev/build |
| UI Components | shadcn/ui + Tailwind CSS | Component library |
| Tree Editor | react-arborist or custom | OPC UA node hierarchy editing |
| Config Store | Plain JSON files | No database needed |

## File Structure

```
OPC-MQTT-Server/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── server/
│   │   ├── index.ts           // Entry point, starts all services
│   │   ├── opcua-server.ts    // node-opcua wrapper
│   │   ├── mqtt-broker.ts     // Aedes wrapper
│   │   ├── api.ts             // Express REST routes
│   │   ├── websocket.ts       // WebSocket for live updates
│   │   ├── generator.ts       // Data generation engine
│   │   └── config-store.ts    // JSON file read/write
│   └── client/
│       ├── App.tsx
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── OpcuaConfig.tsx
│       │   ├── MqttConfig.tsx
│       │   └── ActivityMonitor.tsx
│       └── components/
│           ├── TreeEditor.tsx
│           ├── NodeProperties.tsx
│           ├── TopicList.tsx
│           ├── PayloadBuilder.tsx
│           ├── LiveValues.tsx
│           └── MessageLog.tsx
├── configs/                   // Saved project JSON files
└── docs/
    └── plans/
```

## Data Entry Modes

- **Manual entry** — type specific values and push them on demand for precise testing
- **Auto-generation** — configure parameters and let the system produce realistic data streams

Both modes available for both OPC UA variables and MQTT payload fields simultaneously.
