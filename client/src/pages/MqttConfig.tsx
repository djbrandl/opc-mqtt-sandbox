import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { v4 as uuidv4 } from 'uuid';

interface MqttField {
  key: string;
  type: 'number' | 'string' | 'boolean' | 'timestamp';
  generation?: any;
  staticValue?: any;
}

interface MqttTopic {
  id: string;
  topic: string;
  payloadSchema: MqttField[];
  qos: 0 | 1 | 2;
  publishOnChange: boolean;
  publishRateMs?: number;
}

interface MqttMessage {
  topic: string;
  payload: any;
  timestamp: string;
}

export default function MqttConfig() {
  const [topics, setTopics] = useState<MqttTopic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [manualTopic, setManualTopic] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [publishMode, setPublishMode] = useState<'value' | 'json'>('value');
  const [manualPayload, setManualPayload] = useState('{}');

  useWebSocket({
    'mqtt-message': (msg) => {
      setMessages((prev) => [
        { ...msg.data, timestamp: new Date().toISOString() },
        ...prev,
      ].slice(0, 200));
    },
  });

  useEffect(() => {
    api.getConfig().then((config) => {
      setTopics(config.mqtt.topics);
    }).catch(console.error);
  }, []);

  const selectedTopic = topics.find((t) => t.id === selectedTopicId) ?? null;

  const handleAddTopic = () => {
    const newTopic: MqttTopic = {
      id: 'topic-' + uuidv4().substring(0, 8),
      topic: 'spc/new/topic',
      payloadSchema: [
        { key: 'value', type: 'number' },
        { key: 'timestamp', type: 'timestamp' },
      ],
      qos: 0,
      publishOnChange: false,
      publishRateMs: 1000,
    };
    setTopics((prev) => [...prev, newTopic]);
    setSelectedTopicId(newTopic.id);
  };

  const handleRemoveTopic = (id: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== id));
    if (selectedTopicId === id) setSelectedTopicId(null);
  };

  const handleUpdateTopic = (updated: MqttTopic) => {
    setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleAddField = () => {
    if (!selectedTopic) return;
    const updated = {
      ...selectedTopic,
      payloadSchema: [...selectedTopic.payloadSchema, { key: 'newField', type: 'number' as const }],
    };
    handleUpdateTopic(updated);
  };

  const handleRemoveField = (index: number) => {
    if (!selectedTopic) return;
    const schema = [...selectedTopic.payloadSchema];
    schema.splice(index, 1);
    handleUpdateTopic({ ...selectedTopic, payloadSchema: schema });
  };

  const handleUpdateField = (index: number, field: MqttField) => {
    if (!selectedTopic) return;
    const schema = [...selectedTopic.payloadSchema];
    schema[index] = field;
    handleUpdateTopic({ ...selectedTopic, payloadSchema: schema });
  };

  const handleManualPublish = async () => {
    const topic = manualTopic || 'test/topic';
    try {
      if (publishMode === 'value') {
        // Auto-detect type: number, boolean, or string
        let parsed: any = manualValue;
        if (manualValue === 'true') parsed = true;
        else if (manualValue === 'false') parsed = false;
        else if (manualValue !== '' && !isNaN(Number(manualValue))) parsed = Number(manualValue);
        await api.publishMqttValue(topic, parsed);
      } else {
        const payload = JSON.parse(manualPayload);
        await api.publishMqtt(topic, payload);
      }
    } catch (err) {
      console.error('Publish failed', err);
    }
  };

  const handleSave = async () => {
    const config = await api.getConfig();
    config.mqtt.topics = topics;
    await api.updateConfig(config);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">MQTT Configuration</h1>
        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium">
          Save Config
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Topic List */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
            <h3 className="text-sm font-semibold">Topics</h3>
            <button onClick={handleAddTopic} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded">+ Topic</button>
          </div>
          <div className="py-1">
            {topics.map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-800 text-sm ${
                  selectedTopicId === t.id ? 'bg-gray-800 text-purple-400' : ''
                }`}
                onClick={() => setSelectedTopicId(t.id)}
              >
                <span className="font-mono truncate">{t.topic}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveTopic(t.id); }}
                  className="text-red-400 hover:text-red-300 text-xs ml-2"
                >
                  x
                </button>
              </div>
            ))}
            {topics.length === 0 && <p className="text-gray-500 text-sm p-3">No topics. Add one.</p>}
          </div>
        </div>

        {/* Topic Properties + Payload Schema */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
          {!selectedTopic && <p className="text-gray-500 text-sm">Select a topic to configure.</p>}
          {selectedTopic && (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="col-span-2">
                  <label className="text-gray-500 block">Topic Path</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 font-mono"
                    value={selectedTopic.topic}
                    onChange={(e) => handleUpdateTopic({ ...selectedTopic, topic: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-gray-500 block">QoS</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                    value={selectedTopic.qos}
                    onChange={(e) => handleUpdateTopic({ ...selectedTopic, qos: Number(e.target.value) as 0 | 1 | 2 })}
                  >
                    <option value={0}>0 - At most once</option>
                    <option value={1}>1 - At least once</option>
                    <option value={2}>2 - Exactly once</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-500 block">Publish Rate (ms)</label>
                  <input
                    type="number"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
                    value={selectedTopic.publishRateMs ?? 1000}
                    onChange={(e) => handleUpdateTopic({ ...selectedTopic, publishRateMs: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">Payload Schema</h4>
                  <button onClick={handleAddField} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded">+ Field</button>
                </div>
                <div className="space-y-2">
                  {selectedTopic.payloadSchema.map((field, i) => (
                    <div key={i} className="flex gap-2 items-center text-sm">
                      <input
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 font-mono"
                        value={field.key}
                        placeholder="key"
                        onChange={(e) => handleUpdateField(i, { ...field, key: e.target.value })}
                      />
                      <select
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
                        value={field.type}
                        onChange={(e) => handleUpdateField(i, { ...field, type: e.target.value as MqttField['type'] })}
                      >
                        <option value="number">number</option>
                        <option value="string">string</option>
                        <option value="boolean">boolean</option>
                        <option value="timestamp">timestamp</option>
                      </select>
                      <button onClick={() => handleRemoveField(i)} className="text-red-400 hover:text-red-300 text-xs">x</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Manual Publish */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Manual Publish</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setPublishMode('value')}
              className={`px-3 py-1 rounded text-xs ${publishMode === 'value' ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              Value
            </button>
            <button
              onClick={() => setPublishMode('json')}
              className={`px-3 py-1 rounded text-xs ${publishMode === 'json' ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              JSON
            </button>
          </div>
        </div>
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm font-mono"
            value={manualTopic}
            onChange={(e) => setManualTopic(e.target.value)}
            placeholder="topic/path..."
          />
          {publishMode === 'value' && (
            <input
              className="w-40 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm font-mono"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="42.5"
              onKeyDown={(e) => e.key === 'Enter' && handleManualPublish()}
            />
          )}
          <button onClick={handleManualPublish} className="px-4 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium">
            Publish
          </button>
        </div>
        {publishMode === 'json' && (
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm font-mono h-20"
            value={manualPayload}
            onChange={(e) => setManualPayload(e.target.value)}
            placeholder='{"key": "value"}'
          />
        )}
        {publishMode === 'value' && (
          <p className="text-xs text-gray-500 mt-1">Enter a number, string, or boolean. Numbers auto-detected.</p>
        )}
      </div>

      {/* Message Log */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Message Log</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
          {messages.length === 0 && <p className="text-gray-500">No messages yet.</p>}
          {messages.map((msg, i) => (
            <div key={i} className="flex gap-2 text-gray-300">
              <span className="text-gray-600 whitespace-nowrap">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              <span className="text-purple-400">{msg.topic}</span>
              <span className="truncate">{JSON.stringify(msg.payload)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
