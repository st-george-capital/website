'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Loader2, Info, Globe, ChevronDown, ChevronRight,
  BarChart2, TrendingUp, TrendingDown, AlertTriangle,
} from 'lucide-react';
import type { Pillar } from '@/lib/country-health/dictionary';
import { PILLAR_LABELS, VARIABLES, PILLAR_WEIGHTS, COUNTRIES } from '@/lib/country-health/dictionary';
import { ARCHETYPE_DEFS, CLASSIFICATION_THRESHOLDS } from '@/lib/country-health/classification';

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
    };
    peerSensitivity: Record<string, { label: string; order: string[]; ranks: Record<string, number>; scores: Record<string, number | null> }>;
  };
  prunedRobustness?: Record<string, {
    label: string;
    spearmanRankVsFull: number | null;
    avgAbsRankMove: number;
    maxAbsRankMove: number;
    perCountryDeltas: { country: string; baseRank: number; variantRank: number; delta: number }[];
  }>;
  altProductive?: Record<string, unknown>;
  altHuman?: Record<string, unknown>;
  altInnovation?: Record<string, unknown>;
  overlayPlus?: Record<string, unknown>;
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
  overlayPlus
}: {
  prunedRobustness?: Payload['prunedRobustness'];
  altProductive?: Payload['altProductive'];
  altHuman?: Payload['altHuman'];
  altInnovation?: Payload['altInnovation'];
  overlayPlus?: Payload['overlayPlus'];
}) {
  const [open, setOpen] = useState(false);
  const hasAny =
    prunedRobustness ||
    altProductive ||
    altHuman ||
    altInnovation ||
    overlayPlus;
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

// ─── Instructions Tab ─────────────────────────────────────────────────────────

function InstructionsTab() {
  const totalCoreWeight = CORE_PILLARS.reduce((s, p) => s + PILLAR_WEIGHTS[p], 0);

  const SH = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200 uppercase tracking-wide">{children}</h2>
  );
  const SubH = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs font-semibold text-gray-800 mt-5 mb-1.5">{children}</h3>
  );
  const P = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs text-gray-600 leading-relaxed mb-2">{children}</p>
  );

  const PILLAR_DESCRIPTIONS: Record<string, string> = {
    productive_capacity: 'The economic engine. Measures whether the country actually produces things — industrial output, exports, investment, and energy costs. A high score here means the economy has real throughput, not just financial activity.',
    human_capital: 'The quality of the workforce. Education attainment, labor force participation, and health outcomes. Countries that invest in their people compound over decades; neglect here is hard to reverse.',
    macro_sustainability: 'The guardrails. Inflation, government debt, and the current account balance. Strong growth built on unsustainable debt or chronic deficits is fragile. This pillar penalizes economies running hot but hollow.',
    institutional: 'The rules of the game. Rule of law, control of corruption, and political stability. Institutional quality is the single biggest determinant of whether foreign capital stays — or flees at the first sign of stress.',
    innovation: 'The edge. R&D spending, patent output, and IP receipts. This separates economies that improve productivity over time from those stuck on the same rung of the value chain.',
  };

  const OVERLAY_DESCRIPTION = 'Scored separately from core — not blended in. Measures how accessible the economy is to foreign capital: FDI inflows (institutional-grade confidence signal), listed market depth (market cap / GDP), and cross-border portfolio flows. A country can have strong fundamentals but a shallow or restricted market — the overlay captures that.';

  const PILLAR_CAVEATS: Record<string, string> = {
    productive_capacity: 'Manufacturing value-added is normalized per capita, so large economies don\'t dominate. Export concentration is not captured — a commodity-heavy export mix looks the same as a diversified one.',
    human_capital: 'Tertiary enrollment has significant gaps for lower-income countries in the World Bank database. Pillar confidence will show as "partial data" for many emerging markets.',
    macro_sustainability: 'Inflation and debt scores use momentum (year-over-year change) alongside levels, so a country rapidly improving from a bad position can score higher than a stagnant one at a moderate level.',
    institutional: 'Political stability is given reduced weight (0.5) relative to corruption and rule of law because it is more volatile and subject to short-term noise. World Bank Governance Indicators are updated annually.',
    innovation: 'IP receipts have a known distortion: Luxembourg, Ireland, and the Netherlands receive large IP royalty flows due to tax treaty routing, not genuine local IP creation. Interpret their Innovation pillar score with this in mind. Patent data similarly favors countries with strong domestic filing cultures (US, Japan, Korea).',
  };

  const SCORE_GUIDE = [
    { range: '65–100', label: 'Above average', color: 'text-emerald-700', desc: 'Clear structural strength within this peer set.' },
    { range: '50–65',  label: 'Solid',          color: 'text-green-600',   desc: 'Above median — no major structural concerns.' },
    { range: '40–50',  label: 'Average',         color: 'text-yellow-700',  desc: 'In the middle of the pack. Watch for pillar-level gaps.' },
    { range: '28–40',  label: 'Weak',            color: 'text-orange-600',  desc: 'Below average. Multiple structural weaknesses.' },
    { range: '0–28',   label: 'Poor',            color: 'text-red-600',     desc: 'Significant systemic weakness across pillars.' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-10 max-w-5xl">

      {/* 1. What is this tool */}
      <section>
        <SH>What This Tool Is</SH>
        <P>
          The Country Macro Health Index scores <strong>{COUNTRIES.length} countries</strong> on their structural
          economic fundamentals — the conditions that drive long-duration capital allocation rather than
          short-term market moves. Think of it as a quantified first-pass screen: before sizing a
          country allocation, you want to know whether the fundamentals support it.
        </P>
        <P>
          All data comes from the <strong>World Bank Open Data API</strong> — public, auditable, and updated
          annually. No black-box indices, no proprietary data. The tradeoff: annual publication with a
          1–2 year lag. You are seeing structural trends, not current events.
        </P>
        <P>
          Every score is <strong>peer-relative</strong>. A score of 50 means average within this {COUNTRIES.length}-country
          peer set — not average globally. Adding or removing countries from the basket shifts all scores.
          The Rankings tab shows the default basket; the Detail tab uses a broader analysis basket for
          z-score comparisons.
        </P>
      </section>

      {/* 2. How to read your scores */}
      <section>
        <SH>How to Read Your Scores</SH>

        <SubH>Core Score (0–100)</SubH>
        <P>Weighted average of the 5 structural pillars × 100. This is the headline number.</P>
        <div className="overflow-x-auto border border-gray-200 rounded-xl mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-wide">
                <th className="px-3 py-2 text-left font-semibold">Score range</th>
                <th className="px-3 py-2 text-left font-semibold">Reading</th>
                <th className="px-3 py-2 text-left font-semibold">What it means</th>
              </tr>
            </thead>
            <tbody>
              {SCORE_GUIDE.map(g => (
                <tr key={g.range} className="border-t border-gray-50">
                  <td className={`px-3 py-2 font-mono font-semibold ${g.color}`}>{g.range}</td>
                  <td className={`px-3 py-2 font-medium ${g.color}`}>{g.label}</td>
                  <td className="px-3 py-2 text-gray-600">{g.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SubH>Market Monetization Overlay (0–100)</SubH>
        <P>
          Scored separately — not mixed into the core. Measures how accessible and deep the country&apos;s
          financial markets are: FDI inflows, market cap relative to GDP, and cross-border portfolio flows.
          A country can have excellent fundamentals but a shallow or restricted market (see: Vietnam,
          Saudi Arabia). Look for the combination of high core + high overlay for the strongest conviction.
        </P>

        <SubH>Evidence Confidence (%)</SubH>
        <P>
          How much we trust the score, based on three factors: data completeness (how many variables
          have actual values), year recency (how recent the underlying data is), and structural variable
          availability (hardest-to-source indicators). A 90 score with 40% confidence should be
          treated differently than one with 85% confidence.
        </P>

        <SubH>Year Spread</SubH>
        <P>
          Standard deviation of the observation years across core variables. A spread of 0 means all
          data is from the same year — internally consistent. A spread of 2+ years means the score
          is mixing data from different time periods, which can create distortions.
        </P>
      </section>

      {/* 3. The 5 pillars */}
      <section>
        <SH>The 5 Core Pillars</SH>
        <P>
          Each pillar is a weighted average of its variables (only available data contributes).
          Pillar scores are then combined into the core score using the weights below.
        </P>
        <div className="space-y-5 mt-3">
          {CORE_PILLARS.map(p => {
            const vars = VARIABLES.filter(v => v.pillar === p);
            const totalWt = vars.reduce((s, v) => s + v.weight, 0);
            const pctOfCore = (PILLAR_WEIGHTS[p] / totalCoreWeight * 100).toFixed(0);
            return (
              <div key={p} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{PILLAR_ICONS[p]}</span>
                      <span className="font-semibold text-sm text-gray-900">{PILLAR_LABELS[p]}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{pctOfCore}% of core</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{PILLAR_DESCRIPTIONS[p]}</p>
                    {PILLAR_CAVEATS[p] && (
                      <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2">
                        <strong>Note:</strong> {PILLAR_CAVEATS[p]}
                      </p>
                    )}
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-2">Variables in this pillar</div>
                  <div className="space-y-2">
                    {vars.map(v => (
                      <div key={v.id} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500 mt-0.5">
                          {v.weight}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-gray-800">{v.label}</span>
                            <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${v.direction === 'up_good' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {v.direction === 'up_good' ? '↑ higher = better' : '↓ lower = better'}
                            </span>
                            {v.useChange && (
                              <span className="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded">70% level + 30% trend</span>
                            )}
                            <span className="text-[9px] text-gray-400 font-mono">{(v.weight / totalWt * 100).toFixed(0)}% of pillar</span>
                          </div>
                          <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{v.why}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overlay */}
        <div className="border border-gray-200 rounded-xl overflow-hidden mt-5">
          <div className="px-4 py-3 bg-gray-50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{PILLAR_ICONS['overlay']}</span>
              <span className="font-semibold text-sm text-gray-900">{PILLAR_LABELS['overlay']}</span>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">separate from core</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{OVERLAY_DESCRIPTION}</p>
          </div>
          <div className="px-4 py-3">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-2">Overlay variables</div>
            <div className="space-y-2">
              {VARIABLES.filter(v => v.pillar === 'overlay').map(v => (
                <div key={v.id} className="flex items-start gap-3">
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-800">{v.label}</span>
                    <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{v.why}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Classification archetypes */}
      <section>
        <SH>How to Interpret Archetypes</SH>
        <P>
          Each country is assigned an archetype — a shortcut that combines core score with pillar
          patterns. These are not judgments; they are pattern labels. The same archetype can contain
          high-opportunity and high-risk countries depending on the specific profile.
        </P>
        <div className="space-y-3">
          {ARCHETYPE_DEFS.map(a => (
            <div key={a.label} className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl">
              <span className={`text-[10px] px-2 py-1 rounded-full font-semibold whitespace-nowrap flex-shrink-0 mt-0.5 ${a.color} ${a.textColor}`}>
                {a.label}
              </span>
              <div>
                <p className="text-xs text-gray-700 leading-relaxed">{a.description}</p>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">Triggers when: {a.criteria}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. What this doesn't capture */}
      <section>
        <SH>Key Limitations</SH>
        <div className="space-y-3">
          {[
            {
              title: 'Data lag',
              body: `World Bank data is published 1–2 years after the reference year. The index reflects structural conditions as of roughly ${new Date().getFullYear() - 2}–${new Date().getFullYear() - 1}, not today's macro environment.`,
            },
            {
              title: 'Peer-relative scoring',
              body: `A score of 50 is average within this ${COUNTRIES.length}-country set. It has no meaning outside this basket. If you add or remove countries, all scores shift.`,
            },
            {
              title: 'What it does not capture',
              body: 'Geopolitical risk, sanctions exposure, currency regime and convertibility, market microstructure (liquidity, settlement), political transition risk, and sector-level dynamics.',
            },
            {
              title: 'IP Receipts distortion',
              body: 'Luxembourg, Ireland, and the Netherlands receive outsized IP royalty flows due to tax treaty routing — their Innovation pillar scores will appear elevated relative to genuine domestic IP creation.',
            },
            {
              title: 'Portfolio inflows volatility',
              body: 'A single exceptional year of inflows or outflows can materially swing a country\'s overlay score. Year-over-year smoothing would improve this; treat single-year extremes with skepticism.',
            },
            {
              title: 'Not investment advice',
              body: 'Backward-looking, based on published data, peer-relative, and subject to all the caveats above. Use as one input in a broader research process.',
            },
          ].map(item => (
            <div key={item.title} className="border border-gray-100 rounded-xl p-3">
              <div className="text-xs font-semibold text-gray-800 mb-0.5">{item.title}</div>
              <p className="text-xs text-gray-600 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Methodology Panel ────────────────────────────────────────────────────────

// ─── Methodology Tab ──────────────────────────────────────────────────────────

function MethodologyTab() {
  const coreVars = VARIABLES.filter(v => v.pillar !== 'overlay');
  const overlayVars = VARIABLES.filter(v => v.pillar === 'overlay');
  const perCapitaIds = ['patent_applications', 'ip_receipts', 'listed_companies', 'portfolio_inflows', 'manufacturing_va_per_capita'];
  const momentumVars = VARIABLES.filter(v => v.useChange);
  const downGoodVars = VARIABLES.filter(v => v.direction === 'down_good');
  const totalCoreWeight = CORE_PILLARS.reduce((s, p) => s + PILLAR_WEIGHTS[p], 0);

  const SH = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200 uppercase tracking-wide">{children}</h2>
  );
  const SubH = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs font-semibold text-gray-800 mt-5 mb-1.5">{children}</h3>
  );
  const P = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs text-gray-600 leading-relaxed mb-2">{children}</p>
  );
  const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th className={`px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 ${right ? 'text-right' : 'text-left'}`}>{children}</th>
  );
  const TD = ({ children, right, mono }: { children: React.ReactNode; right?: boolean; mono?: boolean }) => (
    <td className={`px-3 py-2 text-xs text-gray-600 border-t border-gray-50 ${right ? 'text-right' : ''} ${mono ? 'font-mono tabular-nums' : ''}`}>{children}</td>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-10 max-w-5xl">

      {/* 1. Overview */}
      <section>
        <SH>Overview</SH>
        <P>
          The Country Macro Health Index benchmarks <strong>{COUNTRIES.length} countries</strong> across{' '}
          <strong>{CORE_PILLARS.length} core pillars</strong> ({coreVars.length} indicators) plus a Market
          Monetization Overlay ({overlayVars.length} indicators). All input data is retrieved from the{' '}
          <strong>World Bank Open Data API</strong> — no proprietary sources, no normalization against external indices.
        </P>
        <P>
          Scores are <strong>cross-sectional and relative</strong>: a country&apos;s score reflects its standing
          within the peer set, not an absolute measure of economic strength. The peer set spans{' '}
          {[...new Set(COUNTRIES.map(c => c.region))].join(', ')}.
        </P>
      </section>

      {/* 2. Country Universe */}
      <section>
        <SH>Country Universe — {COUNTRIES.length} countries</SH>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full">
            <thead><tr><TH>Country</TH><TH>ISO2</TH><TH>Region</TH></tr></thead>
            <tbody>
              {COUNTRIES.map(c => (
                <tr key={c.id}>
                  <TD><span className="mr-1.5">{c.flag}</span>{c.name}</TD>
                  <TD mono>{c.id}</TD>
                  <TD>{c.region}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Pillar Architecture */}
      <section>
        <SH>Pillar Architecture</SH>
        <P>
          The core score is a weighted average of {CORE_PILLARS.length} pillars. The Market Monetization
          Overlay is scored separately and does not contribute to the core score.
        </P>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full">
            <thead><tr><TH>Pillar</TH><TH right>Core Weight</TH><TH right>Variables</TH></tr></thead>
            <tbody>
              {CORE_PILLARS.map(p => (
                <tr key={p}>
                  <TD><span className="mr-1.5">{PILLAR_ICONS[p]}</span>{PILLAR_LABELS[p]}</TD>
                  <TD right mono>{(PILLAR_WEIGHTS[p] / totalCoreWeight * 100).toFixed(0)}%</TD>
                  <TD right>{VARIABLES.filter(v => v.pillar === p).length}</TD>
                </tr>
              ))}
              <tr>
                <TD><span className="mr-1.5">{PILLAR_ICONS['overlay']}</span>{PILLAR_LABELS['overlay']}</TD>
                <TD right><span className="text-gray-400 italic text-[10px]">not in core</span></TD>
                <TD right>{overlayVars.length}</TD>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Variable Directory */}
      <section>
        <SH>Variable Directory</SH>
        <P>
          Each variable maps to a specific World Bank indicator code. Within-pillar weights are integers;
          contribution = weight / sum of available weights (missing variables excluded from denominator).
        </P>
        {([...CORE_PILLARS, 'overlay' as Pillar]).map(p => {
          const vars = VARIABLES.filter(v => v.pillar === p);
          const totalWt = vars.reduce((s, v) => s + v.weight, 0);
          return (
            <div key={p} className="mb-6">
              <SubH>
                {PILLAR_ICONS[p]} {PILLAR_LABELS[p]}
                {p !== 'overlay' && (
                  <span className="ml-2 font-normal text-gray-400">
                    — {(PILLAR_WEIGHTS[p] / totalCoreWeight * 100).toFixed(0)}% of core score
                  </span>
                )}
              </SubH>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full">
                  <thead>
                    <tr>
                      <TH>Variable</TH>
                      <TH>WB Code</TH>
                      <TH>Unit (displayed)</TH>
                      <TH>Direction</TH>
                      <TH right>Wt</TH>
                      <TH right>Wt%</TH>
                      <TH>Scoring</TH>
                      <TH>Rationale</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {vars.map(v => (
                      <tr key={v.id}>
                        <TD><span className="font-medium text-gray-800">{v.label}</span></TD>
                        <TD mono><span className="text-blue-600">{v.code}</span></TD>
                        <td className="px-3 py-2 text-xs text-gray-600 border-t border-gray-50">
                          {v.unit}
                          {perCapitaIds.includes(v.id) && (
                            <span className="ml-1 text-[9px] text-amber-600 bg-amber-50 px-1 rounded">÷ pop</span>
                          )}
                        </td>
                        <TD>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${v.direction === 'up_good' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {v.direction === 'up_good' ? '↑ higher = better' : '↓ lower = better'}
                          </span>
                        </TD>
                        <TD right mono>{v.weight}</TD>
                        <TD right mono>{(v.weight / totalWt * 100).toFixed(0)}%</TD>
                        <TD>
                          {v.useChange
                            ? <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">70% level + 30% Δ</span>
                            : <span className="text-[10px] text-gray-400">level only</span>}
                        </TD>
                        <TD>{v.why}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>

      {/* 5. Scoring Pipeline */}
      <section>
        <SH>Scoring Pipeline</SH>

        <SubH>Step 1 — Per-capita normalization</SubH>
        <P>
          Absolute-count variables are divided by population before scoring so large countries do not
          dominate on volume: {perCapitaIds.map(id => VARIABLES.find(v => v.id === id)?.label).filter(Boolean).join(', ')}.
          Population sourced from World Bank SP.POP.TOTL.
        </P>

        <SubH>Step 2 — Direction adjustment</SubH>
        <P>
          Variables where lower is better are negated before scoring so high always means good.
          Down-good variables: {downGoodVars.map(v => v.label).join(', ')}.
          Raw values in the UI are original un-negated figures.
        </P>

        <SubH>Step 3 — Cross-sectional z-score normalization</SubH>
        <P>
          For each variable, scores are z-scored across all {COUNTRIES.length} countries simultaneously.
          Z-scores are clamped to [−3, +3] to prevent outliers from collapsing the distribution, then
          scaled to [0, 1]. Countries missing a variable are excluded from that variable&apos;s mean and std.
        </P>

        <SubH>Step 4 — Momentum blend</SubH>
        <P>
          {momentumVars.length > 0
            ? <>For {momentumVars.length} variable{momentumVars.length !== 1 ? 's' : ''} where trend matters,
              the final score blends normalized level (70%) with normalized year-over-year change (30%):
              {' '}{momentumVars.map(v => v.label).join(', ')}.
              Variables already expressed as rates (GDP growth %, CPI %) use level-only scoring to avoid
              computing a second derivative.</>
            : 'All variables use level-only scoring.'}
        </P>

        <SubH>Step 5 — Pillar aggregation</SubH>
        <P>
          Each pillar score is the weighted average of its variables using only available data.
          Missing variables reduce completeness but do not block scoring.
          A pillar with less than 40% weight coverage is flagged as low confidence.
        </P>

        <SubH>Step 6 — Core score</SubH>
        <P>
          Weighted average of the {CORE_PILLARS.length} pillar scores × 100, scaled to [0–100].
          Pillars with no data are excluded from the denominator.
          The Market Monetization Overlay is computed separately and not blended into core.
        </P>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-xs text-gray-600 leading-loose">
          raw values → per-capita normalization (4 variables)<br/>
          → direction adjustment (negate down_good)<br/>
          → cross-sectional z-score → clamp [−3,+3] → scale [0,1]<br/>
          {momentumVars.length > 0 && <>→ momentum blend: 0.70 × level + 0.30 × Δ (where applicable)<br/></>}
          → weighted average within pillar<br/>
          → weighted average across pillars × 100 = core score [0–100]
        </div>
      </section>

      {/* 6. Classification */}
      <section>
        <SH>Classification Archetypes</SH>
        <P>
          Each country is assigned an archetype based on core score and pillar performance.
          Thresholds are on the 0–100 scale: <strong>High ≥ {CLASSIFICATION_THRESHOLDS.HIGH}</strong>,{' '}
          <strong>Medium ≥ {CLASSIFICATION_THRESHOLDS.MED}</strong>. Rules are evaluated in order; the first match applies.
        </P>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full">
            <thead><tr><TH>Archetype</TH><TH>Trigger criteria</TH><TH>Investment interpretation</TH></tr></thead>
            <tbody>
              {ARCHETYPE_DEFS.map(a => (
                <tr key={a.label}>
                  <td className="px-3 py-2 border-t border-gray-50">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${a.color} ${a.textColor}`}>
                      {a.label}
                    </span>
                  </td>
                  <TD mono>{a.criteria}</TD>
                  <TD>{a.description}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. Data Source & Limitations */}
      <section>
        <SH>Data Source &amp; Limitations</SH>

        <SubH>World Bank Open Data API</SubH>
        <P>
          All {VARIABLES.length} indicators are fetched from api.worldbank.org/v2 (no auth required).
          Data is cached for 1 hour. Annual series; publication typically lags the reference year by 1–2 years.
        </P>

        <SubH>Peer-relative scoring</SubH>
        <P>
          Normalization is cross-sectional. Every score is relative to the current {COUNTRIES.length}-country
          peer set. A score of 50 means average within this group — not average globally.
          Adding or removing countries shifts all scores.
        </P>

        <SubH>Data gaps</SubH>
        <P>
          R&amp;D expenditure and tertiary enrollment have significant coverage gaps for lower-income countries.
          Pillars with less than 40% weight covered are flagged as low confidence.
        </P>

        <SubH>Not investment advice</SubH>
        <P>
          Backward-looking, based on published data. Does not capture geopolitical risk, sanctions, currency
          risk, or market microstructure. For informational use only.
        </P>
      </section>
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
  const [activeTab, setActiveTab] = useState<'rankings' | 'detail' | 'methodology' | 'instructions'>('rankings');
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
          <p className="text-sm text-gray-400">Fetching World Bank data ({COUNTRIES.length}-country universe…)</p>
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
            {(['rankings', 'detail', 'methodology', 'instructions'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs px-4 py-1.5 rounded-md font-medium transition-colors capitalize ${
                  activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'rankings' ? '🌍 Rankings'
                  : tab === 'detail' ? `🔍 ${selectedEntry?.meta.flag ?? ''} Detail`
                  : tab === 'methodology' ? '📄 Methodology'
                  : '📖 Instructions'}
              </button>
            ))}
          </div>

          {/* Rankings tab */}
          {activeTab === 'rankings' && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <BarChart2 size={14} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Country Rankings</span>
                <span className="text-[10px] text-gray-400 ml-1">{COUNTRIES.length} countries · click a row to drill down</span>
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

          {/* Methodology tab */}
          {activeTab === 'methodology' && <MethodologyTab />}

          {/* Instructions tab */}
          {activeTab === 'instructions' && <InstructionsTab />}

          {data.robustness && <RobustnessPanel robustness={data.robustness} />}

          <SensitivityModesPanel
            prunedRobustness={data.prunedRobustness}
            altProductive={data.altProductive}
            altHuman={data.altHuman}
            altInnovation={data.altInnovation}
            overlayPlus={data.overlayPlus}
          />

          {/* Disclaimer */}
          <p className="text-[10px] text-gray-300 text-center pb-2">
            Data: World Bank Open Data API · Annual series, typically 1–2 year publication lag · Scores are cross-sectional z-scores, not absolute measures · For informational use only
          </p>
        </>
      )}
    </div>
  );
}
