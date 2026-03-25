'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Loader2, Info, Globe, ChevronDown, ChevronRight,
  BarChart2, TrendingUp, TrendingDown, AlertTriangle,
} from 'lucide-react';
import type { Pillar } from '@/lib/country-health/dictionary';
import { PILLAR_LABELS } from '@/lib/country-health/dictionary';

// ─── Types (mirror the API shape) ────────────────────────────────────────────

interface CountryMeta { id: string; name: string; flag: string; region: string }
interface ScoredVariableUI {
  id: string; label: string; pillar: string;
  rawValue: number | null; unit: string; direction: string; kind: string;
  normalizedLevel: number | null; normalizedChange: number | null;
  finalScore: number | null; weight: number; contribution: number | null;
  dataYear: string | null; why: string; missing: boolean;
}
interface PillarConcentrationUI {
  hhi: number | null;
  top2Share: number | null;
  concentrated: boolean;
  topDrivers: string[];
}
interface PillarScoreUI {
  pillar: string;
  score: number | null;
  completeness: number;
  confidenceTier: string;
  lowConfidence: boolean;
  concentration: PillarConcentrationUI;
  variables: ScoredVariableUI[];
}
interface VariableCoreContributionUI {
  id: string;
  label: string;
  pillar: string;
  pillarLabel: string;
  rawValue: number | null;
  normalizedScore: number | null;
  weight: number;
  contributionToPillar: number | null;
  contributionToCore: number | null;
  unit: string;
}

interface CountryEntry {
  country: string;
  rank?: number;
  coreScore: number | null;
  overlayScore: number | null;
  completeness: number;
  confidenceScore?: number | null;
  confidenceLabel?: string;
  yearDispersion?: number | null;
  classification: string;
  classificationColor: string;
  meta: CountryMeta;
  pillarScores: Record<string, PillarScoreUI>;
  whyRank?: string;
  coreContributions?: {
    topPositive: VariableCoreContributionUI[];
    topNegative: VariableCoreContributionUI[];
    all: VariableCoreContributionUI[];
  };
  analysisRank?: number | null;
  analysisCoreScore?: number | null;
  /** When present, rank in the default 10-country leaderboard (vs extended analysis basket in `rank`) */
  defaultBasketRank?: number | null;
}

interface Payload {
  timestamp: string;
  countries: CountryEntry[];
  countriesAnalysis?: CountryEntry[];
  analysisPeerIds?: string[];
  methodology: Record<string, unknown>;
  robustness?: {
    sameYearVsLatest: {
      avgAbsRankMove: number;
      maxAbsRankMove: number;
      moves: { country: string; rankLatest: number; rankSameYear: number; delta: number }[];
      interpretation: string;
    };
    peerSensitivity: Record<string, { label: string; order: string[]; ranks: Record<string, number>; scores: Record<string, number | null> }>;
    notes: string[];
  };
  prunedRobustness?: Record<string, {
    label: string;
    spearmanRankVsFull: number | null;
    avgAbsRankMove: number;
    maxAbsRankMove: number;
    perCountryDeltas: { country: string; baseRank: number; variantRank: number; delta: number }[];
    interpretation: string;
  }>;
  altProductive?: Record<string, unknown>;
  altHuman?: Record<string, unknown>;
  altInnovation?: Record<string, unknown>;
  overlayPlus?: Record<string, unknown>;
  interpretationQuestion?: { question: string; view: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number | null): string {
  if (s === null) return 'text-gray-300';
  if (s >= 65) return 'text-emerald-600 font-bold';
  if (s >= 50) return 'text-emerald-500 font-semibold';
  if (s >= 40) return 'text-yellow-600 font-semibold';
  if (s >= 28) return 'text-orange-500';
  return 'text-red-500';
}

function scoreBg(s: number | null): string {
  if (s === null) return 'bg-gray-50';
  if (s >= 65) return 'bg-emerald-50';
  if (s >= 50) return 'bg-green-50';
  if (s >= 40) return 'bg-yellow-50';
  if (s >= 28) return 'bg-orange-50';
  return 'bg-red-50';
}

function barColor(s: number | null): string {
  if (s === null) return 'bg-gray-200';
  const pct = s / 100;
  if (pct >= 0.65) return 'bg-emerald-500';
  if (pct >= 0.50) return 'bg-green-400';
  if (pct >= 0.40) return 'bg-yellow-400';
  if (pct >= 0.28) return 'bg-orange-400';
  return 'bg-red-400';
}

function pillarBarColor(s: number | null): string {
  if (s === null) return 'bg-gray-200';
  const pct = s; // already 0-1
  if (pct >= 0.65) return 'bg-emerald-500';
  if (pct >= 0.50) return 'bg-green-400';
  if (pct >= 0.40) return 'bg-yellow-400';
  if (pct >= 0.28) return 'bg-orange-400';
  return 'bg-red-400';
}

function fmt(v: number | null, dec = 1): string {
  if (v === null) return '—';
  return v.toFixed(dec);
}

function fmtScore(s: number | null): string {
  if (s === null) return '—';
  return s.toFixed(1);
}

function directionIcon(dir: string, score: number | null) {
  if (score === null) return null;
  if (dir === 'up_good') {
    return score >= 0.5
      ? <TrendingUp size={11} className="text-emerald-500 inline ml-1" />
      : <TrendingDown size={11} className="text-red-400 inline ml-1" />;
  }
  return score >= 0.5
    ? <TrendingDown size={11} className="text-emerald-500 inline ml-1" />
    : <TrendingUp size={11} className="text-red-400 inline ml-1" />;
}

const CORE_PILLARS: Pillar[] = [
  'productive_capacity', 'human_capital', 'macro_sustainability', 'institutional', 'innovation',
];
const PILLAR_ICONS: Record<string, string> = {
  productive_capacity:  '⚙️',
  human_capital:        '🎓',
  macro_sustainability: '📊',
  institutional:        '🏛️',
  innovation:           '🔬',
  overlay:              '💹',
};

// ─── ScoreBar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score, max = 100, height = 'h-1.5' }: { score: number | null; max?: number; height?: string }) {
  const pct = score !== null ? Math.max(0, Math.min(100, (score / max) * 100)) : 0;
  const col = max === 100 ? barColor(score) : pillarBarColor(score);
  return (
    <div className={`w-full bg-gray-100 rounded-full ${height}`}>
      <div className={`${col} ${height} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Completeness Badge ───────────────────────────────────────────────────────

function CompletenessTag({ pct }: { pct: number }) {
  const label = `${Math.round(pct * 100)}%`;
  const cls = pct >= 0.8 ? 'text-emerald-600' : pct >= 0.5 ? 'text-yellow-600' : 'text-red-500';
  return <span className={`text-[10px] font-medium ${cls}`}>{label} data</span>;
}

// ─── Pillar Card ──────────────────────────────────────────────────────────────

function PillarCard({
  pillarKey, ps, expanded, onToggle,
}: {
  pillarKey: string;
  ps: PillarScoreUI;
  expanded: boolean;
  onToggle: () => void;
}) {
  const label = PILLAR_LABELS[pillarKey as Pillar] ?? pillarKey;
  const icon = PILLAR_ICONS[pillarKey] ?? '📌';
  const tier = ps.confidenceTier ?? 'normal';
  const suppressed = tier === 'suppressed';
  const score100 = suppressed ? null : (ps.score !== null ? ps.score * 100 : null);
  const conc = ps.concentration ?? { hhi: null, top2Share: null, concentrated: false, topDrivers: [] as string[] };

  const tierBadge = () => {
    const t = tier;
    if (t === 'normal') return null;
    const map: Record<string, string> = {
      suppressed: 'bg-red-100 text-red-700',
      low: 'bg-orange-100 text-orange-800',
      amber: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${map[t] ?? 'bg-gray-100 text-gray-600'}`}>
        {t === 'suppressed' ? 'no score' : t === 'low' ? 'weak data' : 'partial data'}
      </span>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="font-semibold text-sm text-gray-800">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <CompletenessTag pct={ps.completeness} />
          {tierBadge()}
          <span className={`text-base font-bold ${scoreColor(score100)}`}>
            {suppressed ? '—' : fmtScore(score100)}
          </span>
          {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        </div>
      </button>
      <div className="px-4 pb-1">
        <ScoreBar score={suppressed ? null : ps.score} max={1} />
      </div>
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          {conc.concentrated && conc.top2Share !== null && (
            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-2">
              Pillar driven by few variables: top-2 share {(conc.top2Share * 100).toFixed(0)}%
              {conc.topDrivers.length > 0 && ` (${conc.topDrivers.join(', ')})`}
              {conc.hhi !== null && ` · HHI ${conc.hhi.toFixed(2)}`}
            </p>
          )}
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="text-left pb-1.5 font-semibold">Variable</th>
                <th className="text-right pb-1.5 font-semibold">Raw Value</th>
                <th className="text-right pb-1.5 font-semibold">Year</th>
                <th className="text-right pb-1.5 font-semibold">Score</th>
                <th className="text-right pb-1.5 font-semibold">Wt</th>
                <th className="text-right pb-1.5 font-semibold">Contrib</th>
                <th className="text-left pb-1.5 pl-2 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody>
              {ps.variables.map(v => (
                <tr key={v.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 group">
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-1">
                      <span className={v.missing ? 'text-gray-400' : 'text-gray-700'}>{v.label}</span>
                      <span className="relative group/tip">
                        <Info size={10} className="text-gray-300 cursor-help hidden group-hover:inline" />
                        <span className="absolute left-5 top-0 z-20 w-52 bg-gray-800 text-white text-[10px] rounded p-2 opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none">
                          {v.why}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="py-1.5 text-right text-gray-600 tabular-nums">
                    {v.missing ? (
                      <span className="text-gray-300 italic">n/a</span>
                    ) : (
                      <>
                        {fmt(v.rawValue)}<span className="text-gray-300 text-[9px] ml-0.5">{v.unit.split(' ')[0]}</span>
                        {directionIcon(v.direction, v.finalScore)}
                      </>
                    )}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-gray-400">
                    {v.dataYear ?? <span className="text-gray-200">—</span>}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {v.finalScore !== null ? (
                      <span className={v.finalScore >= 0.5 ? 'text-emerald-600' : 'text-red-500'}>
                        {v.finalScore.toFixed(2)}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-gray-400">{v.weight}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {v.contribution !== null ? (
                      <span className={`font-medium ${v.contribution >= 0.5 ? 'text-emerald-600' : v.contribution >= 0.35 ? 'text-gray-600' : 'text-red-400'}`}>
                        {v.contribution.toFixed(2)}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-1.5 pl-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      v.kind === 'structural' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {v.kind}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[9px] text-gray-300 mt-2">Score = normalized z-score [0–1] · Wt = within-pillar weight · Contrib = Score × Wt / total available weight</p>
        </div>
      )}
    </div>
  );
}

// ─── Country Row in Rankings Table ───────────────────────────────────────────

function CountryRow({
  entry, rank, selected, onSelect,
}: {
  entry: CountryEntry; rank: number; selected: boolean; onSelect: () => void;
}) {
  const displayRank = entry.rank ?? rank;
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer transition-colors border-b border-gray-100 last:border-0 ${
        selected ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      <td className="py-2.5 px-3 text-xs text-gray-400 font-mono tabular-nums">#{displayRank}</td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{entry.meta.flag}</span>
          <div>
            <div className="text-sm font-semibold text-gray-800">{entry.meta.name}</div>
            <div className="text-[10px] text-gray-400">{entry.meta.region}</div>
          </div>
        </div>
      </td>
      <td className="py-2.5 pr-4 text-right">
        <div className={`text-base font-bold tabular-nums ${scoreColor(entry.coreScore)}`}>
          {fmtScore(entry.coreScore)}
        </div>
        <div className="w-16 ml-auto mt-0.5">
          <ScoreBar score={entry.coreScore} max={100} />
        </div>
      </td>
      {CORE_PILLARS.map(p => {
        const ps = entry.pillarScores[p];
        const s = ps?.score !== null && ps?.score !== undefined ? ps.score * 100 : null;
        return (
          <td key={p} className="py-2.5 px-2 text-right">
            <span className={`text-xs tabular-nums ${scoreColor(s)}`}>{fmtScore(s)}</span>
          </td>
        );
      })}
      <td className="py-2.5 pl-2 text-right">
        <span className={`text-xs tabular-nums ${scoreColor(entry.overlayScore)}`}>
          {fmtScore(entry.overlayScore)}
        </span>
      </td>
      <td className="py-2.5 pl-3">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${entry.classificationColor} ${
          entry.classificationColor.replace('bg-', 'text-').replace('-100', '-800')
        }`}>
          {entry.classification}
        </span>
      </td>
    </tr>
  );
}

// ─── Robustness (same-year vs latest, peer baskets) ────────────────────────────

function RobustnessPanel({ robustness }: { robustness: NonNullable<Payload['robustness']> }) {
  const [open, setOpen] = useState(false);
  const sy = robustness.sameYearVsLatest;
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <BarChart2 size={14} /> Robustness &amp; sensitivity
        </div>
        {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 text-xs text-gray-600 space-y-4">
          <div>
            <div className="font-semibold text-gray-800 mb-1">Same-year vs latest-available (default 10)</div>
            <p className="text-gray-500 mb-2">
              Avg. absolute rank move: <span className="font-mono font-semibold text-gray-800">{sy.avgAbsRankMove.toFixed(2)}</span>
              {' · '}Max: <span className="font-mono font-semibold text-gray-800">{sy.maxAbsRankMove}</span>
            </p>
            <p className="text-[11px] text-gray-500 italic mb-2">{sy.interpretation}</p>
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-2 py-1.5">Country</th>
                    <th className="text-right px-2 py-1.5">Rank latest</th>
                    <th className="text-right px-2 py-1.5">Rank same-year</th>
                    <th className="text-right px-2 py-1.5">|Δ|</th>
                  </tr>
                </thead>
                <tbody>
                  {sy.moves.slice(0, 10).map(m => (
                    <tr key={m.country} className="border-t border-gray-50">
                      <td className="px-2 py-1 font-medium text-gray-700">{m.country}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{m.rankLatest}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{m.rankSameYear}</td>
                      <td className="px-2 py-1 text-right tabular-nums font-semibold">{m.delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-800 mb-2">Peer-set sensitivity (core rank order)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(robustness.peerSensitivity).map(([key, ps]) => (
                <div key={key} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{ps.label}</div>
                  <div className="text-[11px] text-gray-700 font-mono leading-relaxed">
                    {ps.order.join(' → ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {robustness.notes?.length > 0 && (
            <ul className="list-disc pl-4 text-[11px] text-gray-400 space-y-1">
              {robustness.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Optional robustness payloads (?pruned=1 & …) ─────────────────────────────

function SensitivityModesPanel({
  prunedRobustness,
  altProductive,
  altHuman,
  altInnovation,
  overlayPlus,
  interpretationQuestion,
}: {
  prunedRobustness?: Payload['prunedRobustness'];
  altProductive?: Payload['altProductive'];
  altHuman?: Payload['altHuman'];
  altInnovation?: Payload['altInnovation'];
  overlayPlus?: Payload['overlayPlus'];
  interpretationQuestion?: Payload['interpretationQuestion'];
}) {
  const [open, setOpen] = useState(false);
  const hasAny =
    prunedRobustness ||
    altProductive ||
    altHuman ||
    altInnovation ||
    overlayPlus ||
    interpretationQuestion;
  if (!hasAny) return null;

  return (
    <div className="bg-white border border-indigo-200 rounded-xl overflow-hidden mt-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-indigo-50/40 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
          <BarChart2 size={14} /> Experimental sensitivity modes
        </div>
        {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-indigo-100 px-5 py-4 text-xs text-gray-700 space-y-6">
          {interpretationQuestion && (
            <div className="bg-indigo-50/80 border border-indigo-100 rounded-lg p-3">
              <div className="font-semibold text-indigo-900 mb-1">Interpretation</div>
              <p className="text-[11px] text-indigo-950 mb-2">{interpretationQuestion.question}</p>
              <p className="text-[11px] text-gray-600 leading-relaxed">{interpretationQuestion.view}</p>
            </div>
          )}
          {prunedRobustness && (
            <div>
              <div className="font-semibold text-gray-800 mb-2">Pruned pairs (vs full model)</div>
              <div className="space-y-3">
                {Object.entries(prunedRobustness).map(([key, v]) => (
                  <div key={key} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                    <div className="text-[10px] font-mono text-gray-400 mb-1">{key}</div>
                    <div className="text-[11px] font-medium text-gray-700 mb-1">{v.label}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <span>Spearman: {v.spearmanRankVsFull != null ? v.spearmanRankVsFull.toFixed(3) : '—'}</span>
                      <span>Avg |Δrank|: {v.avgAbsRankMove.toFixed(2)}</span>
                      <span>Max |Δrank|: {v.maxAbsRankMove}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2">{v.interpretation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {overlayPlus && (
            <div>
              <div className="font-semibold text-gray-800 mb-1">Overlay plus (financial depth + services exports)</div>
              <pre className="text-[10px] bg-gray-50 p-2 rounded overflow-x-auto text-gray-600 max-h-48">
                {JSON.stringify(overlayPlus, null, 2)}
              </pre>
            </div>
          )}
          {(altProductive || altHuman || altInnovation) && (
            <div>
              <div className="font-semibold text-gray-800 mb-2">Alt pillar definitions</div>
              {altProductive && (
                <details className="mb-2">
                  <summary className="cursor-pointer text-indigo-800 font-medium">Productive capacity</summary>
                  <pre className="text-[10px] bg-gray-50 p-2 rounded mt-1 overflow-x-auto max-h-64">{JSON.stringify(altProductive, null, 2)}</pre>
                </details>
              )}
              {altHuman && (
                <details className="mb-2">
                  <summary className="cursor-pointer text-indigo-800 font-medium">Human capital</summary>
                  <pre className="text-[10px] bg-gray-50 p-2 rounded mt-1 overflow-x-auto max-h-64">{JSON.stringify(altHuman, null, 2)}</pre>
                </details>
              )}
              {altInnovation && (
                <details>
                  <summary className="cursor-pointer text-indigo-800 font-medium">Innovation</summary>
                  <pre className="text-[10px] bg-gray-50 p-2 rounded mt-1 overflow-x-auto max-h-64">{JSON.stringify(altInnovation, null, 2)}</pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Methodology Panel ────────────────────────────────────────────────────────

function MethodologyPanel({ methodology }: { methodology: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Info size={14} /> Methodology
        </div>
        {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 text-xs text-gray-600 space-y-3">
          <div>
            <div className="font-semibold text-gray-700 mb-1">Normalization</div>
            <p>{String(methodology.normalization)}</p>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-1">Momentum Blend</div>
            <p>{String(methodology.momentumBlend)}</p>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-1">Pillar Aggregation</div>
            <p>{String(methodology.pillarAggregation)}</p>
          </div>
          {Boolean(methodology.pillarConfidenceThresholds) ? (
            <div>
              <div className="font-semibold text-gray-700 mb-1">Pillar data thresholds</div>
              <ul className="list-disc pl-4 space-y-0.5 text-gray-500">
                {Object.entries(methodology.pillarConfidenceThresholds as Record<string, string>).map(([k, v]) => (
                  <li key={k}><span className="text-gray-600">{k}:</span> {v}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {Boolean(methodology.sameYearMode) ? (
            <div>
              <div className="font-semibold text-gray-700 mb-1">Same-year alignment (robustness)</div>
              <p>{String(methodology.sameYearMode)}</p>
            </div>
          ) : null}
          {Boolean(methodology.manufacturing) ? (
            <div>
              <div className="font-semibold text-gray-700 mb-1">Industrial / tradables proxy</div>
              <p>{String(methodology.manufacturing)}</p>
            </div>
          ) : null}
          <div>
            <div className="font-semibold text-gray-700 mb-1">Core Pillar Weights</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
              {Object.entries(methodology.coreWeights as Record<string, string>).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-500">{PILLAR_LABELS[k as Pillar] ?? k}</span>
                  <span className="font-semibold text-gray-700">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-1">Data Source</div>
            <p className="text-gray-400">{String(methodology.dataSource)}</p>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <div className="font-semibold text-gray-700 mb-2">Country Archetypes</div>
            <div className="grid grid-cols-1 gap-1">
              {[
                { label: 'Frontier Compounder', desc: 'Strong across all pillars. High innovation + strong institutions.', color: 'bg-emerald-100 text-emerald-800' },
                { label: 'Innovation Leader', desc: 'R&D/IP/patent strength with solid institutional quality.', color: 'bg-blue-100 text-blue-800' },
                { label: 'Industrial Climber', desc: 'Strong productive base, rising innovation, institutional lag.', color: 'bg-indigo-100 text-indigo-800' },
                { label: 'State-Capacity Powerhouse', desc: 'Real economic strength, elevated intervention risk.', color: 'bg-amber-100 text-amber-800' },
                { label: 'Fragile Growth Story', desc: 'Decent growth, weak macro sustainability.', color: 'bg-orange-100 text-orange-800' },
                { label: 'Stable Mature Power', desc: 'Sound institutions, lower growth upside.', color: 'bg-purple-100 text-purple-800' },
                { label: 'Declining System', desc: 'Weakness across multiple pillars.', color: 'bg-red-100 text-red-800' },
              ].map(a => (
                <div key={a.label} className="flex items-start gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${a.color}`}>{a.label}</span>
                  <span className="text-gray-400 text-[10px] leading-tight mt-0.5">{a.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Country Detail Panel ─────────────────────────────────────────────────────

function CountryDetail({ entry }: { entry: CountryEntry }) {
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());

  const togglePillar = (p: string) => {
    setExpandedPillars(prev => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
        <div className="flex flex-wrap items-start gap-6">
          <div>
            <div className="text-3xl leading-none mb-1">{entry.meta.flag}</div>
            <div className="text-lg font-bold text-gray-900">{entry.meta.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{entry.meta.region}</div>
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1">Core Score</div>
              <div className={`text-2xl font-bold tabular-nums ${scoreColor(entry.coreScore)}`}>{fmtScore(entry.coreScore)}</div>
              <ScoreBar score={entry.coreScore} max={100} height="h-1" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1">Market Access</div>
              <div className={`text-2xl font-bold tabular-nums ${scoreColor(entry.overlayScore)}`}>{fmtScore(entry.overlayScore)}</div>
              <ScoreBar score={entry.overlayScore} max={100} height="h-1" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1">Evidence confidence</div>
              <div className={`text-2xl font-bold tabular-nums ${entry.confidenceScore != null && entry.confidenceScore >= 0.65 ? 'text-emerald-600' : entry.confidenceScore != null && entry.confidenceScore >= 0.45 ? 'text-yellow-600' : 'text-orange-500'}`}>
                {entry.confidenceScore != null ? `${(entry.confidenceScore * 100).toFixed(0)}%` : '—'}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">{entry.confidenceLabel ?? '—'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1">Year spread (core)</div>
              <div className="text-2xl font-bold tabular-nums text-gray-700">
                {entry.yearDispersion != null ? `${entry.yearDispersion.toFixed(1)} yrs` : '—'}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">σ of observation years</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1">Archetype</div>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${entry.classificationColor} ${
                entry.classificationColor.replace('bg-', 'text-').replace('-100', '-800')
              }`}>
                {entry.classification}
              </span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1">Data Coverage</div>
              <div className="text-sm font-semibold text-gray-700">{Math.round(entry.completeness * 100)}%</div>
              <div className="w-full bg-gray-100 h-1 rounded-full mt-1">
                <div className="bg-blue-400 h-1 rounded-full" style={{ width: `${entry.completeness * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Pillar spark bars */}
        <div className="mt-4 grid grid-cols-5 gap-2">
          {CORE_PILLARS.map(p => {
            const ps = entry.pillarScores[p];
            const suppressed = ps?.confidenceTier === 'suppressed';
            const s = suppressed ? null : (ps?.score !== null && ps?.score !== undefined ? ps.score * 100 : null);
            return (
              <div key={p} className="text-center">
                <div className={`text-xs font-bold tabular-nums mb-1 ${scoreColor(s)}`}>{suppressed ? '—' : fmtScore(s)}</div>
                <ScoreBar score={s} max={100} height="h-2" />
                <div className="text-[9px] text-gray-400 mt-1 leading-tight">
                  {PILLAR_LABELS[p].split(' ').map((w, i) => <span key={i}>{w}<br /></span>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {entry.whyRank && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-2">Why this rank</div>
          <p className="text-sm text-slate-800 leading-relaxed">{entry.whyRank}</p>
          {entry.defaultBasketRank != null && entry.rank != null && entry.defaultBasketRank !== entry.rank && (
            <p className="text-[11px] text-slate-500 mt-2">
              Default leaderboard (10 peers): #{entry.defaultBasketRank} · Extended analysis basket (13 peers): #{entry.rank}
            </p>
          )}
        </div>
      )}

      {entry.coreContributions && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <div className="text-sm font-semibold text-gray-800">Core score — variable contributions</div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Approximate share of each variable to the core score (pillar weight × within-pillar contribution). Overlay excluded.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-gray-100">
            <div className="p-4">
              <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Top positive drivers</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[9px] text-gray-400 uppercase">
                    <th className="text-left pb-1">Variable</th>
                    <th className="text-right pb-1">Raw</th>
                    <th className="text-right pb-1">Norm</th>
                    <th className="text-right pb-1">Wt</th>
                    <th className="text-right pb-1">Δ core</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.coreContributions.topPositive.map(row => (
                    <tr key={row.id} className="border-t border-gray-50">
                      <td className="py-1.5 pr-2">
                        <div className="text-gray-800">{row.label}</div>
                        <div className="text-[9px] text-gray-400">{row.pillarLabel}</div>
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-gray-600">{fmt(row.rawValue)}</td>
                      <td className="py-1.5 text-right tabular-nums text-emerald-600">{row.normalizedScore != null ? row.normalizedScore.toFixed(2) : '—'}</td>
                      <td className="py-1.5 text-right tabular-nums text-gray-400">{row.weight}</td>
                      <td className="py-1.5 text-right tabular-nums font-medium text-emerald-700">
                        {row.contributionToCore != null ? row.contributionToCore.toFixed(3) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4">
              <div className="text-[10px] font-semibold text-rose-700 uppercase tracking-wide mb-2">Weakest contributors</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[9px] text-gray-400 uppercase">
                    <th className="text-left pb-1">Variable</th>
                    <th className="text-right pb-1">Raw</th>
                    <th className="text-right pb-1">Norm</th>
                    <th className="text-right pb-1">Wt</th>
                    <th className="text-right pb-1">Δ core</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.coreContributions.topNegative.map(row => (
                    <tr key={row.id} className="border-t border-gray-50">
                      <td className="py-1.5 pr-2">
                        <div className="text-gray-800">{row.label}</div>
                        <div className="text-[9px] text-gray-400">{row.pillarLabel}</div>
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-gray-600">{fmt(row.rawValue)}</td>
                      <td className="py-1.5 text-right tabular-nums text-rose-500">{row.normalizedScore != null ? row.normalizedScore.toFixed(2) : '—'}</td>
                      <td className="py-1.5 text-right tabular-nums text-gray-400">{row.weight}</td>
                      <td className="py-1.5 text-right tabular-nums font-medium text-rose-700">
                        {row.contributionToCore != null ? row.contributionToCore.toFixed(3) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="px-4 pb-3 text-[9px] text-gray-400 mt-1">
            Δ core = contribution to overall core score (0–1 scale on variables); pillar weight is baked in.
          </p>
        </div>
      )}

      {/* Core pillars drilldown */}
      {CORE_PILLARS.map(p => {
        const ps = entry.pillarScores[p];
        if (!ps) return null;
        return (
          <PillarCard
            key={p}
            pillarKey={p}
            ps={ps}
            expanded={expandedPillars.has(p)}
            onToggle={() => togglePillar(p)}
          />
        );
      })}

      {/* Overlay panel */}
      {entry.pillarScores['overlay'] && (
        <PillarCard
          pillarKey="overlay"
          ps={entry.pillarScores['overlay']}
          expanded={expandedPillars.has('overlay')}
          onToggle={() => togglePillar('overlay')}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const SENSITIVITY_QUERY =
  '?pruned=1&alt_productive=1&alt_human=1&alt_innovation=1&overlay_plus=1';

export default function CountryHealthPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rankings' | 'detail'>('rankings');
  const [sensitivityLoaded, setSensitivityLoaded] = useState(false);

  const load = useCallback(async (opts?: { sensitivity?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const qs = opts?.sensitivity ? SENSITIVITY_QUERY : '';
      const res = await fetch(`/api/dashboard/country-health${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: Payload = await res.json();
      setData(json);
      setSensitivityLoaded(!!opts?.sensitivity);
      const detailList = json.countriesAnalysis ?? json.countries;
      setSelected(prev => {
        if (prev && detailList.some(c => c.country === prev)) return prev;
        const us = detailList.find(c => c.country === 'US');
        return us?.country ?? detailList[0]?.country ?? null;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const detailList = data?.countriesAnalysis ?? data?.countries ?? [];
  const selectedEntry = detailList.find(c => c.country === selected) ?? null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe size={20} className="text-gray-500" />
            <h1 className="text-xl font-bold text-gray-900">Country Macro Health</h1>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Core strength score across 5 pillars · Market Monetization Overlay · {CORE_PILLARS.length} pillars · World Bank Open Data
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {data && (
            <span className="text-[10px] text-gray-400">
              Updated {new Date(data.timestamp).toLocaleString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {!sensitivityLoaded && (
            <button
              type="button"
              onClick={() => load({ sensitivity: true })}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-indigo-700 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 disabled:opacity-40 transition-colors"
            >
              Load sensitivity modes
            </button>
          )}
          {sensitivityLoaded && (
            <span className="text-[10px] text-indigo-600">Sensitivity payloads loaded</span>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={32} className="animate-spin text-gray-300" />
          <p className="text-sm text-gray-400">Fetching World Bank data (18-country union for sensitivity)…</p>
          <p className="text-[10px] text-gray-300">~30 indicators × deep history — may take 25–40 seconds</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Main content */}
      {!loading && data && (
        <>
          {/* Tab switcher */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {(['rankings', 'detail'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs px-4 py-1.5 rounded-md font-medium transition-colors capitalize ${
                  activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'rankings' ? '🌍 Rankings' : `🔍 ${selectedEntry?.meta.flag ?? ''} Detail`}
              </button>
            ))}
          </div>

          {/* Rankings tab */}
          {activeTab === 'rankings' && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <BarChart2 size={14} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Country Rankings</span>
                <span className="text-[10px] text-gray-400 ml-1">10-country default basket · click a row to drill down</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-3 py-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide w-10">#</th>
                      <th className="text-left py-2 pr-3 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Country</th>
                      <th className="text-right py-2 pr-4 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Core</th>
                      {CORE_PILLARS.map(p => (
                        <th key={p} className="text-right py-2 px-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide whitespace-nowrap">
                          {PILLAR_ICONS[p]}
                        </th>
                      ))}
                      <th className="text-right py-2 pl-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Mkt</th>
                      <th className="text-left py-2 pl-3 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Type</th>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td colSpan={2} />
                      {[...CORE_PILLARS, 'overlay' as Pillar].map(p => (
                        <td key={p} className="text-right px-2 py-1 text-[9px] text-gray-300">
                          {p === 'overlay' ? 'Overlay' : PILLAR_LABELS[p].split(' ')[0]}
                        </td>
                      ))}
                      <td />
                      <td />
                    </tr>
                  </thead>
                  <tbody>
                    {data.countries.map((entry, i) => (
                      <CountryRow
                        key={entry.country}
                        entry={entry}
                        rank={i + 1}
                        selected={selected === entry.country}
                        onSelect={() => {
                          setSelected(entry.country);
                          setActiveTab('detail');
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Legend */}
              <div className="px-5 py-2 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1">
                <span className="text-[10px] text-gray-400">Pillar icons: {CORE_PILLARS.map(p => `${PILLAR_ICONS[p]} ${PILLAR_LABELS[p]}`).join(' · ')}</span>
                <span className="text-[10px] text-gray-400">Mkt = Market Monetization Overlay (separate from core score)</span>
              </div>
            </div>
          )}

          {/* Detail tab */}
          {activeTab === 'detail' && (
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
              {/* Country selector sidebar */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-fit">
                <div className="px-4 py-2.5 border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wide font-semibold">
                  Select country
                  <div className="text-[9px] font-normal normal-case text-gray-400 mt-0.5">
                    {data.countriesAnalysis ? '13-peer analysis basket (z-scores vs this set)' : 'Default basket'}
                  </div>
                </div>
                {[...detailList].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).map(entry => (
                  <button
                    key={entry.country}
                    onClick={() => setSelected(entry.country)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors ${
                      selected === entry.country ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-300 tabular-nums w-4">#{entry.rank ?? '—'}</span>
                      <span className="text-base leading-none">{entry.meta.flag}</span>
                      <span className={`text-xs font-medium ${selected === entry.country ? 'text-blue-700' : 'text-gray-700'}`}>
                        {entry.meta.name}
                      </span>
                    </div>
                    <span className={`text-xs font-bold tabular-nums ${scoreColor(entry.coreScore)}`}>
                      {fmtScore(entry.coreScore)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Detail panel */}
              <div>
                {selectedEntry ? (
                  <CountryDetail entry={selectedEntry} />
                ) : (
                  <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                    Select a country from the list
                  </div>
                )}
              </div>
            </div>
          )}

          {data.robustness && <RobustnessPanel robustness={data.robustness} />}

          <SensitivityModesPanel
            prunedRobustness={data.prunedRobustness}
            altProductive={data.altProductive}
            altHuman={data.altHuman}
            altInnovation={data.altInnovation}
            overlayPlus={data.overlayPlus}
            interpretationQuestion={data.interpretationQuestion}
          />

          <MethodologyPanel methodology={data.methodology} />

          {/* Disclaimer */}
          <p className="text-[10px] text-gray-300 text-center pb-2">
            Data: World Bank Open Data API · Annual series, typically 1–2 year publication lag · Scores are cross-sectional z-scores, not absolute measures · For informational use only
          </p>
        </>
      )}
    </div>
  );
}
