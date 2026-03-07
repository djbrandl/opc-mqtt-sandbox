import fs from 'fs/promises';
import path from 'path';
import { ProjectConfig } from './types.js';

export class ConfigStore {
  private configsDir: string;

  constructor() {
    this.configsDir = path.resolve(process.cwd(), 'configs');
  }

  async ensureDir(): Promise<void> {
    await fs.mkdir(this.configsDir, { recursive: true });
  }

  async save(config: ProjectConfig): Promise<void> {
    await this.ensureDir();
    const filename = this.sanitizeFilename(config.name) + '.json';
    const filepath = path.join(this.configsDir, filename);
    await fs.writeFile(filepath, JSON.stringify(config, null, 2), 'utf-8');
  }

  async load(name: string): Promise<ProjectConfig> {
    const filename = this.sanitizeFilename(name) + '.json';
    const filepath = path.join(this.configsDir, filename);
    const data = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(data) as ProjectConfig;
  }

  async list(): Promise<string[]> {
    await this.ensureDir();
    const files = await fs.readdir(this.configsDir);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
  }

  async delete(name: string): Promise<void> {
    const filename = this.sanitizeFilename(name) + '.json';
    const filepath = path.join(this.configsDir, filename);
    await fs.unlink(filepath);
  }

  getDefaultConfig(): ProjectConfig {
    return {
      name: 'default',
      opcua: {
        port: 4840,
        nodes: [
          {
            id: 'SPC',
            name: 'SPC',
            type: 'folder',
            children: [
              {
                id: 'SPC.Machine1',
                name: 'Machine1',
                type: 'object',
                children: [
                  {
                    id: 'SPC.Machine1.Temperature',
                    name: 'Temperature',
                    type: 'variable',
                    dataType: 'Double',
                    initialValue: 25.0,
                  },
                  {
                    id: 'SPC.Machine1.Pressure',
                    name: 'Pressure',
                    type: 'variable',
                    dataType: 'Double',
                    initialValue: 101.3,
                  },
                ],
              },
            ],
          },
        ],
      },
      mqtt: {
        port: 1883,
        topics: [
          {
            id: 'topic-1',
            topic: 'spc/machine1/measurements',
            payloadSchema: [
              { key: 'temperature', type: 'number' },
              { key: 'pressure', type: 'number' },
              { key: 'timestamp', type: 'timestamp' },
            ],
            qos: 0,
            publishOnChange: false,
            publishRateMs: 1000,
          },
        ],
      },
      metadata: {
        partIdPattern: 'PART-{seq:0000}',
        machineId: 'MACHINE-001',
        operatorId: 'OP-001',
        customFields: {},
      },
    };
  }

  private sanitizeFilename(name: string): string {
    return (name ?? 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  }
}
