import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { v4 as uuidv4 } from 'uuid';
import TopicTree from '@/components/TopicTree';

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

  const handleAddTopic = (parentPath: string) => {
    const newTopic: MqttTopic = {
      id: 'topic-' + uuidv4().substring(0, 8),
      topic: parentPath,
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

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const config = await api.getConfig();
      config.mqtt.topics = topics;
      await api.updateConfig(config);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Save failed', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">MQTT Configuration</h1>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors duration-150 ${
            saveStatus === 'saved' ? 'bg-emerald-600 text-white' :
            saveStatus === 'error' ? 'bg-red-600 text-white' :
            'bg-blue-600 hover:bg-blue-500 text-white'
          } disabled:opacity-50`}
        >
          {saveStatus === 'saving' ? 'Saving...' :
           saveStatus === 'saved' ? 'Saved!' :
           saveStatus === 'error' ? 'Save Failed' :
           'Save Config'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Topic Tree */}
        <TopicTree
          topics={topics}
          selectedTopicId={selectedTopicId}
          onSelect={setSelectedTopicId}
          onAddTopic={handleAddTopic}
          onRemoveTopic={handleRemoveTopic}
        />

        {/* Topic Properties + Payload Schema */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
          {!selectedTopic && <p className="text-slate-500 text-sm">Select a topic to configure.</p>}
          {selectedTopic && (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-slate-400 block mb-1">QoS</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none"
                    value={selectedTopic.qos}
                    onChange={(e) => handleUpdateTopic({ ...selectedTopic, qos: Number(e.target.value) as 0 | 1 | 2 })}
                  >
                    <option value={0}>0 - At most once</option>
                    <option value={1}>1 - At least once</option>
                    <option value={2}>2 - Exactly once</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Publish Rate (ms)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none"
                    value={selectedTopic.publishRateMs ?? 1000}
                    onChange={(e) => handleUpdateTopic({ ...selectedTopic, publishRateMs: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-200">Payload Schema</h4>
                  <button
                    onClick={handleAddField}
                    className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors duration-150"
                  >
                    + Field
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedTopic.payloadSchema.map((field, i) => (
                    <div key={i} className="flex gap-2 items-center text-sm">
                      <input
                        className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 font-mono text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none"
                        value={field.key}
                        placeholder="key"
                        onChange={(e) => handleUpdateField(i, { ...field, key: e.target.value })}
                      />
                      <select
                        className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none"
                        value={field.type}
                        onChange={(e) => handleUpdateField(i, { ...field, type: e.target.value as MqttField['type'] })}
                      >
                        <option value="number">number</option>
                        <option value="string">string</option>
                        <option value="boolean">boolean</option>
                        <option value="timestamp">timestamp</option>
                      </select>
                      <button
                        onClick={() => handleRemoveField(i)}
                        className="text-red-400 hover:text-red-300 text-xs transition-colors duration-150 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Manual Publish */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-200">Manual Publish</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setPublishMode('value')}
              className={`px-3 py-1 rounded text-xs transition-colors duration-150 ${
                publishMode === 'value' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Value
            </button>
            <button
              onClick={() => setPublishMode('json')}
              className={`px-3 py-1 rounded text-xs transition-colors duration-150 ${
                publishMode === 'json' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              JSON
            </button>
          </div>
        </div>
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none"
            value={manualTopic}
            onChange={(e) => setManualTopic(e.target.value)}
            placeholder="topic/path..."
          />
          {publishMode === 'value' && (
            <input
              className="w-40 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="42.5"
              onKeyDown={(e) => e.key === 'Enter' && handleManualPublish()}
            />
          )}
          <button
            onClick={handleManualPublish}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium text-white transition-colors duration-150"
          >
            Publish
          </button>
        </div>
        {publishMode === 'json' && (
          <textarea
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono h-20 text-slate-200 transition-colors duration-150 focus:border-blue-500 outline-none"
            value={manualPayload}
            onChange={(e) => setManualPayload(e.target.value)}
            placeholder='{"key": "value"}'
          />
        )}
        {publishMode === 'value' && (
          <p className="text-xs text-slate-500 mt-1">Enter a number, string, or boolean. Numbers auto-detected.</p>
        )}
      </div>

      {/* Message Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h3 className="font-semibold text-slate-200 mb-3">Message Log</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
          {messages.length === 0 && <p className="text-slate-500">No messages yet.</p>}
          {messages.map((msg, i) => (
            <div key={i} className="flex gap-2 text-slate-300">
              <span className="text-slate-600 whitespace-nowrap">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              <span className="text-blue-400">{msg.topic}</span>
              <span className="truncate text-slate-400">{JSON.stringify(msg.payload)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
