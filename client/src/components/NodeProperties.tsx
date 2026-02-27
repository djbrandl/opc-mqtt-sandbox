import { useState } from 'react';
import { api } from '@/lib/api';

interface NodeConfig {
  id: string;
  name: string;
  type: 'folder' | 'object' | 'variable';
  dataType?: string;
  initialValue?: any;
  generation?: {
    mode: string;
    nominal?: number;
    stdDev?: number;
    min?: number;
    max?: number;
    rateMs: number;
  };
}

interface NodePropertiesProps {
  node: NodeConfig | null;
  liveValue?: { value: any; timestamp: string };
  onUpdate: (node: NodeConfig) => void;
}

export default function NodeProperties({ node, liveValue, onUpdate }: NodePropertiesProps) {
  const [manualValue, setManualValue] = useState('');
  const [genRunning, setGenRunning] = useState(false);

  if (!node) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <p className="text-gray-500 text-sm">Select a node to view its properties.</p>
      </div>
    );
  }

  const isVariable = node.type === 'variable';

  const handleManualWrite = async () => {
    if (!manualValue) return;
    let value: any = manualValue;
    if (node.dataType === 'Double' || node.dataType === 'Int32') value = Number(value);
    if (node.dataType === 'Boolean') value = manualValue === 'true';
    await api.setOpcuaValue(node.id, value);
    setManualValue('');
  };

  const handleStartGen = async () => {
    if (!node.generation) {
      const defaultGen = { mode: 'normal', nominal: 0, stdDev: 1, min: 0, max: 100, rateMs: 1000 };
      onUpdate({ ...node, generation: defaultGen });
      await api.startOpcuaGeneration(node.id, defaultGen);
    } else {
      await api.startOpcuaGeneration(node.id, node.generation);
    }
    setGenRunning(true);
  };

  const handleStopGen = async () => {
    await api.stopOpcuaGeneration(node.id);
    setGenRunning(false);
  };

  const updateGen = (partial: Record<string, any>) => {
    const gen = { mode: 'normal', nominal: 0, stdDev: 1, min: 0, max: 100, rateMs: 1000, ...node.generation, ...partial };
    onUpdate({ ...node, generation: gen });
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="font-semibold">Node Properties</h3>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <span className="text-gray-500">ID:</span>
        <span className="font-mono text-xs">{node.id}</span>
        <span className="text-gray-500">Name:</span>
        <input
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
          value={node.name}
          onChange={(e) => onUpdate({ ...node, name: e.target.value })}
        />
        <span className="text-gray-500">Type:</span>
        <span>{node.type}</span>
        {isVariable && (
          <>
            <span className="text-gray-500">Data Type:</span>
            <select
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
              value={node.dataType ?? 'Double'}
              onChange={(e) => onUpdate({ ...node, dataType: e.target.value })}
            >
              <option>Double</option>
              <option>Int32</option>
              <option>String</option>
              <option>Boolean</option>
            </select>
          </>
        )}
      </div>

      {isVariable && liveValue && (
        <div className="bg-gray-800 rounded p-2">
          <div className="text-xs text-gray-500">Live Value</div>
          <div className="text-lg font-mono text-green-400">
            {typeof liveValue.value === 'number' ? liveValue.value.toFixed(4) : String(liveValue.value ?? 'N/A')}
          </div>
          <div className="text-xs text-gray-600">{liveValue.timestamp}</div>
        </div>
      )}

      {isVariable && (
        <div>
          <label className="text-sm text-gray-500 block mb-1">Manual Value</label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="Enter value..."
              onKeyDown={(e) => e.key === 'Enter' && handleManualWrite()}
            />
            <button onClick={handleManualWrite} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
              Write
            </button>
          </div>
        </div>
      )}

      {isVariable && (
        <div className="border-t border-gray-800 pt-3">
          <h4 className="text-sm font-semibold mb-2">Auto Generation</h4>
          <div className="space-y-2 text-sm">
            <div>
              <label className="text-gray-500 block">Mode</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                value={node.generation?.mode ?? 'normal'}
                onChange={(e) => updateGen({ mode: e.target.value })}
              >
                <option value="normal">Normal Distribution</option>
                <option value="uniform">Uniform Distribution</option>
                <option value="sine">Sine Wave</option>
                <option value="step">Step</option>
                <option value="drift">Drift</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-500 block">Nominal</label>
                <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  value={node.generation?.nominal ?? 0} onChange={(e) => updateGen({ nominal: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-gray-500 block">Std Dev</label>
                <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  value={node.generation?.stdDev ?? 1} onChange={(e) => updateGen({ stdDev: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-gray-500 block">Min</label>
                <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  value={node.generation?.min ?? 0} onChange={(e) => updateGen({ min: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-gray-500 block">Max</label>
                <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  value={node.generation?.max ?? 100} onChange={(e) => updateGen({ max: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="text-gray-500 block">Rate (ms)</label>
              <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                value={node.generation?.rateMs ?? 1000} onChange={(e) => updateGen({ rateMs: Number(e.target.value) })} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleStartGen} disabled={genRunning}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm disabled:opacity-50">Start</button>
              <button onClick={handleStopGen} disabled={!genRunning}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm disabled:opacity-50">Stop</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
