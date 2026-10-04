'use client';

import { useState } from 'react';
import { CheckCircle2, Cpu, Download, ExternalLink, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MODEL_REGISTRY, RAM_OPTIONS, fitsLaptop, profileFor } from '@/lib/consigliere/models';
import { TOOL_GROUPS, type ConsigliereToolGroup } from '@/lib/consigliere/types';
import { ALL_GROUPS, type ConsigliereLaptop } from './use-consigliere-laptop';

const OTHER = '__other__';
const SELECT_CLASS =
  'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50';

function DownloadProgress({ laptop }: { laptop: ConsigliereLaptop }) {
  const { pull } = laptop;
  if (!pull) return null;
  const percent = pull.fraction == null ? null : Math.round(pull.fraction * 100);
  return (
    <div className="mt-3" aria-live="polite">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium text-slate-800">Downloading {pull.name}</span>
        <button type="button" onClick={laptop.cancelDownload} className="text-slate-500 hover:text-slate-900" aria-label="Cancel download">
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label={`Downloading ${pull.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
      >
        <div className="h-full rounded-full bg-[#0b1f3a] transition-all" style={{ width: `${percent ?? 0}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{percent == null ? pull.status : `${percent}% · ${pull.status}`}</p>
    </div>
  );
}

export function LaptopPanel({ laptop }: { laptop: ConsigliereLaptop }) {
  const { settings, update, connection, version, usableModels, hiddenModelCount, isInstalled, recommended, pull, pullError } = laptop;
  const connected = connection === 'connected';
  const [otherMode, setOtherMode] = useState(false);
  const [otherName, setOtherName] = useState('');

  const selected = settings.model;
  const profile = selected ? profileFor(selected) : undefined;
  const extraModels = usableModels.filter((m) => !profileFor(m.name));
  const ready = connected && Boolean(selected) && isInstalled(selected!) && !otherMode;

  const optionLabel = (name: string) => {
    const m = profileFor(name)!;
    const downloading = pull?.name === m.name;
    const parts = [
      m.label,
      downloading
        ? `downloading${pull.fraction === null ? '' : ` ${Math.round(pull.fraction * 100)}%`}`
        : isInstalled(m.name)
          ? 'installed'
          : `${m.downloadGB} GB`,
    ];
    if (m.name === recommended.name) parts.push('recommended');
    if (!fitsLaptop(m, settings.ramGB)) parts.push(`needs ${m.minRamGB} GB`);
    return parts.join(' · ');
  };

  const onModelChange = (value: string) => {
    if (value === OTHER) {
      setOtherMode(true);
      return;
    }
    setOtherMode(false);
    update({ model: value });
  };

  const downloadOther = async () => {
    if (await laptop.download(otherName.trim())) {
      setOtherMode(false);
      setOtherName('');
    }
  };

  const toggleGroup = (group: ConsigliereToolGroup) => {
    const groups = settings.groups.includes(group) ? settings.groups.filter((g) => g !== group) : [...settings.groups, group];
    update({ groups: ALL_GROUPS.filter((g) => groups.includes(g)) });
  };

  return (
    <aside aria-label="This laptop" className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Cpu className="h-4 w-4 text-slate-500" aria-hidden="true" />
            This laptop
          </h2>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              connected ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
            {connected ? `Ollama ${version ?? ''}`.trim() : connection === 'checking' ? 'Checking…' : 'Not connected'}
          </span>
        </div>

        <label htmlFor="consigliere-ram" className="mt-4 block text-xs font-medium text-slate-700">
          Memory (RAM)
        </label>
        <select
          id="consigliere-ram"
          value={settings.ramGB}
          onChange={(e) => update({ ramGB: Number(e.target.value) })}
          className={SELECT_CLASS}
          aria-describedby="consigliere-ram-help"
        >
          {RAM_OPTIONS.map((gb) => (
            <option key={gb} value={gb}>
              {gb} GB
            </option>
          ))}
        </select>
        <p id="consigliere-ram-help" className="mt-1 text-[11px] leading-5 text-slate-500">
          Mac: Apple menu → About This Mac. Sets the recommended model.
        </p>

        <div className="mt-4 flex items-center justify-between">
          <label htmlFor="consigliere-model" className="block text-xs font-medium text-slate-700">
            Model
          </label>
          {connected && (
            <button
              type="button"
              onClick={() => void laptop.connect()}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900"
              aria-label="Refresh installed models"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Refresh
            </button>
          )}
        </div>
        <select
          id="consigliere-model"
          value={otherMode ? OTHER : selected ?? ''}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={!connected || Boolean(pull)}
          className={SELECT_CLASS}
          aria-describedby="consigliere-model-help"
        >
          {!selected && <option value="">Choose a model…</option>}
          <optgroup label="Recommended for Consigliere">
            {MODEL_REGISTRY.map((m) => (
              <option key={m.name} value={m.name}>
                {optionLabel(m.name)}
              </option>
            ))}
          </optgroup>
          {extraModels.length > 0 && (
            <optgroup label="Also installed">
              {extraModels.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} · installed
                </option>
              ))}
            </optgroup>
          )}
          <option value={OTHER}>Another Ollama model…</option>
        </select>

        <div id="consigliere-model-help">
          {otherMode ? (
            <div className="mt-3">
              <label htmlFor="consigliere-other" className="block text-[11px] text-slate-500">
                Any local model with tool support, e.g. <span className="font-mono">granite4.1:3b</span>.{' '}
                <a
                  href="https://ollama.com/search?c=tools"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 underline hover:text-slate-800"
                >
                  Browse <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>{' '}
                (skip ones marked cloud).
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="consigliere-other"
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && otherName.trim()) void downloadOther();
                  }}
                  placeholder="name:tag"
                  spellCheck={false}
                  disabled={Boolean(pull)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs text-slate-900 outline-none focus:border-slate-400"
                />
                <Button type="button" size="sm" onClick={() => void downloadOther()} disabled={!otherName.trim() || Boolean(pull)}>
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Get
                </Button>
              </div>
            </div>
          ) : (
            <>
              {profile && <p className="mt-1.5 text-[11px] leading-5 text-slate-500">{profile.notes}</p>}
              {connected && selected && profile && !isInstalled(selected) && !pull && (
                <Button type="button" size="sm" className="mt-2 w-full" onClick={() => void laptop.download(selected)}>
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Download {profile.label} ({profile.downloadGB} GB)
                </Button>
              )}
            </>
          )}
          <DownloadProgress laptop={laptop} />
          {pullError && !pull && (
            <p role="alert" className="mt-2 text-xs leading-5 text-red-700">
              {pullError}
            </p>
          )}
          {ready && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Ready · runs free on this laptop
            </p>
          )}
          {connected && hiddenModelCount > 0 && (
            <p className="mt-1.5 text-[11px] text-slate-400">
              {hiddenModelCount} installed model{hiddenModelCount === 1 ? '' : 's'} hidden (cloud or no tool calling).
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <fieldset>
          <legend className="text-sm font-semibold text-slate-950">Data Consigliere can use</legend>
          <p className="mt-1 text-xs leading-5 text-slate-500">Fewer groups means a shorter prompt, which helps small models.</p>
          <div className="mt-3 space-y-2.5">
            {ALL_GROUPS.map((group) => (
              <label key={group} className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={settings.groups.includes(group)}
                  onChange={() => toggleGroup(group)}
                  className="mt-0.5 accent-[#0b1f3a]"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">{TOOL_GROUPS[group].label}</span>
                  <span className="block text-xs leading-5 text-slate-500">{TOOL_GROUPS[group].description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <details className="rounded-2xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold text-slate-950">Advanced</summary>
        <label className="mt-4 flex items-start gap-2.5">
          <input
            type="checkbox"
            checked={settings.think && laptop.canThink}
            disabled={!laptop.canThink}
            onChange={(e) => update({ think: e.target.checked })}
            className="mt-0.5 accent-[#0b1f3a]"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">Let the model think first</span>
            <span className="block text-xs leading-5 text-slate-500">
              {laptop.canThink ? 'Better on multi-step questions, noticeably slower.' : 'The selected model does not support thinking.'}
            </span>
          </span>
        </label>
        <label htmlFor="consigliere-host" className="mt-4 block text-xs font-medium text-slate-700">
          Ollama address
        </label>
        <input
          id="consigliere-host"
          value={settings.host}
          onChange={(e) => update({ host: e.target.value.trim() })}
          className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-slate-400"
          spellCheck={false}
        />
        <p className="mt-1.5 text-xs leading-5 text-slate-500">Leave as http://127.0.0.1:11434 unless Ollama runs elsewhere.</p>
        <p className="mt-3 text-xs text-slate-500">Context window: {laptop.numCtx.toLocaleString()} tokens</p>
      </details>
    </aside>
  );
}
