/**
 * Models Consigliere offers, smallest first. Every entry must run locally for free and be a
 * tool-calling model published on ollama.com/library; edit this list to change what members are offered.
 * Members can still pick any other installed local model that Ollama reports as tool-capable.
 */
export interface ModelProfile {
  name: string;
  label: string;
  downloadGB: number;
  /** Smallest laptop memory this is recommended for. */
  minRamGB: number;
  numCtx: number;
  notes: string;
}

export const MODEL_REGISTRY: ModelProfile[] = [
  {
    name: 'qwen3.5:2b',
    label: 'Qwen 3.5 2B',
    downloadGB: 2.7,
    minRamGB: 8,
    numCtx: 8192,
    notes: 'Fastest. For 8 GB laptops; best with one tool group switched on at a time.',
  },
  {
    name: 'qwen3.5:4b',
    label: 'Qwen 3.5 4B',
    downloadGB: 3.3,
    minRamGB: 16,
    numCtx: 16384,
    notes: 'Default. Reliable tool calling on 16 GB laptops.',
  },
  {
    name: 'qwen3.5:9b',
    label: 'Qwen 3.5 9B',
    downloadGB: 6.6,
    minRamGB: 24,
    numCtx: 16384,
    notes: 'Better at combining several tool results into one answer.',
  },
  {
    name: 'gemma4:12b',
    label: 'Gemma 4 12B',
    downloadGB: 7.7,
    minRamGB: 24,
    numCtx: 16384,
    notes: 'Alternative family with strong writing; similar speed to Qwen 9B.',
  },
  {
    name: 'gemma4:26b',
    label: 'Gemma 4 26B (MoE)',
    downloadGB: 17,
    minRamGB: 32,
    numCtx: 16384,
    notes: 'Mixture-of-experts with about 4B active parameters: quick for its size.',
  },
  {
    name: 'qwen3.5:27b',
    label: 'Qwen 3.5 27B',
    downloadGB: 17,
    minRamGB: 48,
    numCtx: 16384,
    notes: 'Highest quality here; needs a high-memory laptop.',
  },
  // DeepSeek is deliberately absent: its laptop-sized models (deepseek-r1 1.5b–32b) have no
  // tool-calling template in Ollama, and the tool-capable DeepSeek models are paid cloud-only.
];

export const RAM_OPTIONS = [8, 16, 18, 24, 32, 36, 48, 64, 96, 128];

export function profileFor(name: string): ModelProfile | undefined {
  return MODEL_REGISTRY.find((m) => m.name === name || `${m.name}:latest` === name);
}

/** Largest registry model whose memory floor fits this laptop. */
export function recommendedModel(ramGB: number): ModelProfile {
  const fits = MODEL_REGISTRY.filter((m) => m.minRamGB <= ramGB && m.name.startsWith('qwen'));
  return fits[fits.length - 1] ?? MODEL_REGISTRY[0];
}

export function fitsLaptop(model: ModelProfile, ramGB: number): boolean {
  return model.minRamGB <= ramGB;
}

/** Context length to request: the registry value, or a size-based default for unlisted models. */
export function contextFor(name: string, ramGB: number): number {
  return profileFor(name)?.numCtx ?? (ramGB < 16 ? 8192 : 16384);
}
