import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import CopyButton from '@/components/CopyButton';

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
	const [opcuaPort, setOpcuaPort] = useState(4840);
	const [mqttPort, setMqttPort] = useState(1883);

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

	useEffect(() => {
		fetchStatus();
		api.listProjects().then(setProjects).catch(console.error);
		api.getConfig().then((config) => {
			setOpcuaPort(config.opcua.port);
			setMqttPort(config.mqtt.port);
		}).catch(console.error);
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

					{status?.opcua.running && (
						<div className="flex items-center gap-2 mb-2 bg-slate-800 rounded px-3 py-1.5">
							<code className="text-sm font-mono text-emerald-400">opc.tcp://localhost:{status.opcua.port}</code>
							<CopyButton text={`opc.tcp://localhost:${status.opcua.port}`} />
						</div>
					)}

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

				{/* MQTT Card */}
				<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-lg font-semibold text-slate-200">MQTT Broker</h2>
						<span className={`inline-block w-2.5 h-2.5 rounded-full transition-colors duration-300 ${status?.mqtt.running ? 'bg-emerald-400' : 'bg-slate-600'}`} />
					</div>

					{status?.mqtt.running && (
						<div className="flex items-center gap-2 mb-2 bg-slate-800 rounded px-3 py-1.5">
							<code className="text-sm font-mono text-emerald-400">mqtt://localhost:{status.mqtt.port}</code>
							<CopyButton text={`mqtt://localhost:${status.mqtt.port}`} />
						</div>
					)}

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
