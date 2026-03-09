import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import TreeEditor from '@/components/TreeEditor';
import NodeProperties from '@/components/NodeProperties';
import CopyButton from '@/components/CopyButton';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
	const [serverRunning, setServerRunning] = useState(false);
	const [port, setPort] = useState(4840);
	const [securityMode, setSecurityMode] = useState<'None' | 'Sign' | 'SignAndEncrypt'>('None');
	const [securityPolicy, setSecurityPolicy] = useState<'None' | 'Basic256Sha256'>('None');
	const [settingsOpen, setSettingsOpen] = useState(true);
	const [connectedClients, setConnectedClients] = useState(0);

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
		config.opcua.port = port;
		config.opcua.securityMode = securityMode;
		config.opcua.securityPolicy = securityPolicy;
		await api.updateConfig(config);
	};

	return (
		<div className="p-6">
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-bold text-slate-100">OPC UA Configuration</h1>
				<button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium text-white transition-colors duration-150">
					Save Config
				</button>
			</div>

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
						{serverRunning && (
							<div className="flex items-center gap-2 bg-slate-800 rounded px-3 py-1.5">
								<code className="text-sm font-mono text-emerald-400">opc.tcp://localhost:{port}</code>
								<CopyButton text={`opc.tcp://localhost:${port}`} />
							</div>
						)}

						<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<TreeEditor nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} onAdd={handleAdd} onRemove={handleRemove} />
				<NodeProperties node={selectedNode} liveValue={selectedId ? liveValues[selectedId] : undefined} onUpdate={handleUpdateNode} />
			</div>

			<div className="mt-6 bg-slate-900 border border-slate-800 rounded-lg p-4">
				<h3 className="font-semibold text-slate-200 mb-3">All Live Values</h3>
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
					{Object.entries(liveValues).map(([id, { value, timestamp: _timestamp }]) => (
						<div key={id} className="bg-slate-800 rounded p-2">
							<div className="text-xs text-slate-500 truncate">{id}</div>
							<div className="text-sm font-mono text-emerald-400">
								{typeof value === 'number' ? value.toFixed(4) : String(value ?? 'N/A')}
							</div>
						</div>
					))}
					{Object.keys(liveValues).length === 0 && (
						<p className="text-slate-500 text-sm col-span-full">Start the OPC UA server to see live values.</p>
					)}
				</div>
			</div>
		</div>
	);
}

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
