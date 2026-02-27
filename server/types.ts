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
