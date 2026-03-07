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
        <h1 className="text-2xl font-bold text-slate-100">OPC UA Configuration</h1>
        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium text-white transition-colors duration-150">
          Save Config
        </button>
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
