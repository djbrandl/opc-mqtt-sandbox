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
  /** Quick-publish a raw value to a topic (number, string, boolean, or JSON object) */
  publishMqttValue: (topic: string, value: any, qos?: number) =>
    request<any>(`/mqtt/value/${topic}`, { method: 'POST', body: JSON.stringify({ value, qos }) }),
  getMqttClients: () => request<any>('/mqtt/clients'),
  startMqttGeneration: (topicId: string, config: any) =>
    request<any>('/mqtt/generate/start', { method: 'POST', body: JSON.stringify({ topicId, config }) }),
  stopMqttGeneration: (topicId: string) =>
    request<any>('/mqtt/generate/stop', { method: 'POST', body: JSON.stringify({ topicId }) }),
};
