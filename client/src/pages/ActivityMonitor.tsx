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
    api.getMqttClients().then(setMqttClients).catch(() => {});
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === 'all' ? activity : activity.filter((e) => e.protocol === filter);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Activity Monitor</h1>

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

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Activity Log</h3>
          <div className="flex gap-1">
            {(['all', 'opcua', 'mqtt'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-xs ${filter === f ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}
              >
                {f === 'all' ? 'All' : f.toUpperCase()}
              </button>
            ))}
            <button onClick={() => setActivity([])} className="px-3 py-1 rounded text-xs bg-gray-800 hover:bg-gray-700">Clear</button>
          </div>
        </div>
        <div className="space-y-1 max-h-[600px] overflow-y-auto font-mono text-xs">
          {filtered.length === 0 && <p className="text-gray-500">No activity recorded.</p>}
          {filtered.map((entry, i) => (
            <div key={i} className="flex gap-2 text-gray-300">
              <span className="text-gray-600 whitespace-nowrap">{new Date(entry.timestamp).toLocaleTimeString()}</span>
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
