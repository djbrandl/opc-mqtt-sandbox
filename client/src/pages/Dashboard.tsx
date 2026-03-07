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
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <span className={`text-sm flex items-center gap-2 ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
          <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Server Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* OPC UA Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-200">OPC UA Server</h2>
            <span className={`inline-block w-2.5 h-2.5 rounded-full transition-colors duration-300 ${status?.opcua.running ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          </div>
          <p className="text-sm text-slate-400 mb-1">Port: {status?.opcua.port ?? 4840}</p>
          <p className="text-sm text-slate-400 mb-3">
            Status: <span className={status?.opcua.running ? 'text-emerald-400' : 'text-slate-500'}>{status?.opcua.running ? 'Running' : 'Stopped'}</span>
          </p>
          <button
            onClick={() => handleToggle('opcua')}
            disabled={loading.opcua}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors duration-150 ${
              status?.opcua.running
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            } disabled:opacity-50`}
          >
            {loading.opcua ? '...' : status?.opcua.running ? 'Stop' : 'Start'}
          </button>
        </div>

        {/* MQTT Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-200">MQTT Broker</h2>
            <span className={`inline-block w-2.5 h-2.5 rounded-full transition-colors duration-300 ${status?.mqtt.running ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          </div>
          <p className="text-sm text-slate-400 mb-1">Port: {status?.mqtt.port ?? 1883}</p>
          <p className="text-sm text-slate-400 mb-1">Connected Clients: {status?.mqtt.connectedClients ?? 0}</p>
          <p className="text-sm text-slate-400 mb-3">
            Status: <span className={status?.mqtt.running ? 'text-emerald-400' : 'text-slate-500'}>{status?.mqtt.running ? 'Running' : 'Stopped'}</span>
          </p>
          <button
            onClick={() => handleToggle('mqtt')}
            disabled={loading.mqtt}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors duration-150 ${
              status?.mqtt.running
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            } disabled:opacity-50`}
          >
            {loading.mqtt ? '...' : status?.mqtt.running ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-slate-200 mb-2">Active Project</h2>
        <p className="text-slate-300">{status?.project ?? 'default'}</p>
        {projects.length > 0 && (
          <div className="mt-2">
            <span className="text-sm text-slate-500">Saved projects: {projects.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Recent Activity</h2>
        <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
          {activity.length === 0 && (
            <p className="text-slate-500">No activity yet. Start a server to see events.</p>
          )}
          {activity.map((entry, i) => (
            <div key={i} className="flex gap-2 text-slate-300">
              <span className="text-slate-600 whitespace-nowrap">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className={entry.protocol === 'opcua' ? 'text-blue-400' : 'text-purple-400'}>
                [{entry.protocol.toUpperCase()}]
              </span>
              <span className="text-amber-400">{entry.type}</span>
              <span className="truncate text-slate-400">{entry.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
