export type ConsigliereToolGroup = 'sgc_data' | 'markets' | 'research' | 'macro' | 'portfolio';

export const TOOL_GROUPS: Record<ConsigliereToolGroup, { label: string; description: string }> = {
  sgc_data: { label: 'SGC database', description: 'Holdings, trades, pitches, research, calendar and other club records (read-only)' },
  markets: { label: 'Markets', description: 'Alpha Vantage quotes, fundamentals, news sentiment, earnings, price history' },
  research: {
    label: 'Valuation & stock research',
    description: 'DCF tool, comps, your saved models, research reports (start and edit drafts), earnings reactions, estimates, transcripts, insiders, options',
  },
  macro: { label: 'Macro', description: 'FRED, Macro Allocation Engine, G10 Rates Monitor and Trade Shift Radar' },
  portfolio: { label: 'Portfolio math', description: 'Risk reports, optimization, method backtests and the latest CVaR optimizer run' },
};

/** Tool results carrying this key make the chat show a Save card; the key is stripped before the model sees the result. */
export const SAVE_PROPOSAL_KEY = 'save_proposal';

export interface NewReportProposal {
  kind: 'research_report';
  title: string;
  summary: {
    company: string;
    ticker: string;
    intrinsic_value_per_share: number | null;
    bear_per_share: number | null;
    bull_per_share: number | null;
    current_price: number | null;
    upside_pct: number | null;
    wacc_pct?: number | null;
    assumptions_used?: Record<string, string>;
    recommendation: string;
    target_price: number;
    filled_from_tools: string[];
    drafted_from_notes: string[];
    left_empty: string[];
    warnings?: string[];
  };
  draft: unknown;
}

export interface ReportEditChange {
  section: string;
  action: 'add' | 'append' | 'replace' | 'set';
  preview: string;
  before?: string;
}

export interface ReportEditProposal {
  kind: 'report_edit';
  title: string;
  summary: { company: string; ticker: string; report_id: string; changes: ReportEditChange[]; warnings?: string[] };
  draft: unknown;
}

export type SaveProposal = NewReportProposal | ReportEditProposal;
export type SaveProposalKind = SaveProposal['kind'];

export function proposalFrom(result: unknown): SaveProposal | null {
  if (!result || typeof result !== 'object') return null;
  const p = (result as Record<string, unknown>)[SAVE_PROPOSAL_KEY] as SaveProposal | undefined;
  return p && (p.kind === 'research_report' || p.kind === 'report_edit') && p.draft ? p : null;
}

export function withoutProposal(result: unknown): unknown {
  if (!result || typeof result !== 'object' || !(SAVE_PROPOSAL_KEY in result)) return result;
  const { [SAVE_PROPOSAL_KEY]: _omit, ...rest } = result as Record<string, unknown>;
  return rest;
}

export interface ConsigliereToolSpec {
  group: ConsigliereToolGroup;
  type: 'function';
  function: { name: string; description: string; parameters: object };
}
