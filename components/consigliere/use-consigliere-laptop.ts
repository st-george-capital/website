'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { contextFor, profileFor, recommendedModel } from '@/lib/consigliere/models';
import {
  DEFAULT_OLLAMA_HOST,
  listLocalModels,
  localNetworkPermission,
  probeOllama,
  pullModel,
  type ConnectionResult,
  type LocalModel,
} from '@/lib/consigliere/ollama';
import type { ConsigliereToolGroup } from '@/lib/consigliere/types';

const STORAGE_KEY = 'sgc-consigliere-laptop-v1';
const MODEL_NAME = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)?(:[a-z0-9][a-z0-9._-]*)?$/i;
export const ALL_GROUPS: ConsigliereToolGroup[] = ['sgc_data', 'markets', 'research', 'macro', 'portfolio'];
// Settings saved before seenGroups existed only knew these, so anything newer starts switched on.
const ORIGINAL_GROUPS: string[] = ['sgc_data', 'markets', 'macro', 'portfolio'];

export interface LaptopSettings {
  host: string;
  ramGB: number;
  model: string | null;
  groups: ConsigliereToolGroup[];
  /** Groups that existed when the member last saved, so tool groups added later default to on. */
  seenGroups: ConsigliereToolGroup[];
  think: boolean;
}

export type ConnectionState = 'idle' | 'checking' | ConnectionResult['status'];

export interface PullState {
  name: string;
  fraction: number | null;
  status: string;
}

const DEFAULTS: LaptopSettings = { host: DEFAULT_OLLAMA_HOST, ramGB: 16, model: null, groups: ALL_GROUPS, seenGroups: ALL_GROUPS, think: false };

function loadSettings(): LaptopSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return DEFAULTS;
    const seen: string[] = Array.isArray(saved.seenGroups) ? saved.seenGroups : ORIGINAL_GROUPS;
    const kept: string[] = Array.isArray(saved.groups) ? saved.groups : ALL_GROUPS;
    return {
      host: typeof saved.host === 'string' && saved.host ? saved.host : DEFAULTS.host,
      ramGB: Number.isFinite(saved.ramGB) ? saved.ramGB : DEFAULTS.ramGB,
      model: typeof saved.model === 'string' ? saved.model : null,
      groups: ALL_GROUPS.filter((g) => kept.includes(g) || !seen.includes(g)),
      seenGroups: ALL_GROUPS,
      think: Boolean(saved.think),
    };
  } catch {
    return DEFAULTS;
  }
}

/** A model Consigliere can drive: runs locally and Ollama reports tool calling (or it is a vetted registry model). */
export function isUsable(model: LocalModel): boolean {
  if (model.remote) return false;
  return model.capabilities.length ? model.capabilities.includes('tools') : Boolean(profileFor(model.name));
}

function sameModel(a: string, b: string) {
  return a === b || a === `${b}:latest` || b === `${a}:latest`;
}

/** Per-laptop Consigliere state: Ollama connection, installed models, downloads and saved preferences. */
export function useConsigliereLaptop() {
  const [settings, setSettings] = useState<LaptopSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>('idle');
  const [version, setVersion] = useState<string | null>(null);
  const [models, setModels] = useState<LocalModel[]>([]);
  const [pull, setPull] = useState<PullState | null>(null);
  const [pullError, setPullError] = useState<string | null>(null);
  const pullAbort = useRef<AbortController | null>(null);

  const update = useCallback((patch: Partial<LaptopSettings>) => setSettings((prev) => ({ ...prev, ...patch })), []);

  useEffect(() => {
    setSettings(loadSettings());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [loaded, settings]);

  const refreshModels = useCallback(async (host: string) => {
    const list = await listLocalModels(host);
    setModels(list);
    return list;
  }, []);

  const connect = useCallback(async () => {
    setConnection('checking');
    const result = await probeOllama(settings.host);
    if (result.status !== 'connected') {
      setConnection(result.status);
      setVersion(null);
      return;
    }
    setVersion(result.version);
    try {
      await refreshModels(settings.host);
      setConnection('connected');
    } catch {
      setConnection('origin-blocked');
    }
  }, [refreshModels, settings.host]);

  // Reconnect silently only when it cannot trigger a permission prompt the member did not ask for.
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    void localNetworkPermission().then((permission) => {
      if (!cancelled && permission === 'granted') void connect();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Models can be pulled or removed from a terminal, so re-read the list whenever the member returns to the tab.
  useEffect(() => {
    if (connection !== 'connected') return;
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refreshModels(settings.host).catch(() => undefined);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [connection, refreshModels, settings.host]);

  const usableModels = useMemo(() => models.filter(isUsable), [models]);
  const hiddenModelCount = models.length - usableModels.length;
  const isInstalled = useCallback((name: string) => usableModels.some((m) => sameModel(m.name, name)), [usableModels]);
  const recommended = recommendedModel(settings.ramGB);

  // Auto-pick only when nothing usable is chosen. A registry model the member picked but has not
  // downloaded yet must stay selected so the Download button can appear.
  useEffect(() => {
    if (connection !== 'connected') return;
    if (settings.model && (isInstalled(settings.model) || profileFor(settings.model))) return;
    const preferred = isInstalled(recommended.name)
      ? recommended.name
      : usableModels.find((m) => (profileFor(m.name)?.minRamGB ?? 0) <= settings.ramGB)?.name ?? usableModels[0]?.name ?? null;
    if (preferred !== settings.model) update({ model: preferred });
  }, [connection, isInstalled, recommended.name, settings.model, settings.ramGB, update, usableModels]);

  /** Downloads a model into the member's Ollama and selects it. Resolves true when it is usable. */
  const download = useCallback(
    async (rawName: string): Promise<boolean> => {
      const name = rawName.trim().replace(/^ollama\s+(pull|run)\s+/i, '');
      setPullError(null);
      if (!MODEL_NAME.test(name)) {
        setPullError(`"${name}" is not an Ollama model name. Use the name from ollama.com, like granite4.1:3b.`);
        return false;
      }
      if (/(:|-)cloud\b/i.test(name)) {
        setPullError('Cloud models are not free and do not run on your laptop, so Consigliere only uses local models.');
        return false;
      }
      const controller = new AbortController();
      pullAbort.current = controller;
      setPull({ name, fraction: null, status: 'starting' });
      try {
        await pullModel(settings.host, name, (fraction, status) => setPull({ name, fraction, status }), controller.signal);
        const installed = (await refreshModels(settings.host)).find((m) => sameModel(m.name, name));
        if (installed && !isUsable(installed)) {
          setPullError(
            `${name} downloaded, but it cannot call tools, so Consigliere cannot use it. Free the space with "ollama rm ${installed.name}".`
          );
          return false;
        }
        update({ model: installed?.name ?? name });
        return true;
      } catch (err) {
        if (!controller.signal.aborted) {
          const message = err instanceof Error ? err.message : 'Download failed.';
          setPullError(/file does not exist|not found|manifest unknown/i.test(message) ? `Ollama has no model called "${name}".` : message);
        }
        return false;
      } finally {
        setPull(null);
        pullAbort.current = null;
      }
    },
    [refreshModels, settings.host, update]
  );

  const cancelDownload = useCallback(() => pullAbort.current?.abort(), []);

  const activeModel = settings.model && isInstalled(settings.model) ? settings.model : null;
  const activeInfo = activeModel ? usableModels.find((m) => sameModel(m.name, activeModel)) : undefined;

  return {
    settings,
    update,
    connection,
    version,
    connect,
    usableModels,
    hiddenModelCount,
    isInstalled,
    recommended,
    activeModel,
    canThink: Boolean(activeInfo?.capabilities.includes('thinking')),
    numCtx: activeModel ? contextFor(activeModel, settings.ramGB) : 8192,
    pull,
    pullError,
    download,
    cancelDownload,
  };
}

export type ConsigliereLaptop = ReturnType<typeof useConsigliereLaptop>;
