import { GenerationConfig } from './types.js';

export interface GeneratorInstance {
  id: string;
  config: GenerationConfig;
  interval: ReturnType<typeof setInterval> | null;
  currentValue: number;
  tick: number;
}

type ValueCallback = (id: string, value: number) => void;

export class DataGenerator {
  private generators = new Map<string, GeneratorInstance>();
  private callback: ValueCallback;

  constructor(callback: ValueCallback) {
    this.callback = callback;
  }

  start(id: string, config: GenerationConfig): void {
    this.stop(id);

    const instance: GeneratorInstance = {
      id,
      config,
      interval: null,
      currentValue: config.nominal ?? 0,
      tick: 0,
    };

    instance.interval = setInterval(() => {
      instance.tick++;
      instance.currentValue = this.generate(instance);
      this.callback(id, instance.currentValue);
    }, config.rateMs);

    this.generators.set(id, instance);
  }

  stop(id: string): void {
    const instance = this.generators.get(id);
    if (instance?.interval) {
      clearInterval(instance.interval);
    }
    this.generators.delete(id);
  }

  stopAll(): void {
    for (const [id] of this.generators) {
      this.stop(id);
    }
  }

  isRunning(id: string): boolean {
    return this.generators.has(id);
  }

  private generate(instance: GeneratorInstance): number {
    const { config, tick } = instance;

    switch (config.mode) {
      case 'normal': {
        const nominal = config.nominal ?? 0;
        const stdDev = config.stdDev ?? 1;
        return nominal + this.boxMullerRandom() * stdDev;
      }

      case 'uniform': {
        const min = config.min ?? 0;
        const max = config.max ?? 100;
        return min + Math.random() * (max - min);
      }

      case 'sine': {
        const nominal = config.nominal ?? 0;
        const amplitude = (config.max ?? 10) - nominal;
        const period = 100;
        return nominal + amplitude * Math.sin((2 * Math.PI * tick) / period);
      }

      case 'step': {
        const steps = config.stepValues ?? [0, 1];
        return steps[tick % steps.length];
      }

      case 'drift': {
        const nominal = config.nominal ?? 0;
        const stdDev = config.stdDev ?? 0.1;
        const driftRate = 0.01;
        const noise = this.boxMullerRandom() * stdDev;
        return nominal + (tick * driftRate) + noise;
      }

      default:
        return config.nominal ?? 0;
    }
  }

  private boxMullerRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}
