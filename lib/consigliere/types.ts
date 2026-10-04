export type ConsigliereToolGroup = 'sgc_data' | 'markets' | 'macro' | 'portfolio';

export const TOOL_GROUPS: Record<ConsigliereToolGroup, { label: string; description: string }> = {
  sgc_data: { label: 'SGC database', description: 'Holdings, trades, pitches, research, calendar and other club records (read-only)' },
  markets: { label: 'Markets', description: 'Alpha Vantage quotes, fundamentals, news sentiment, earnings, price history' },
  macro: { label: 'Macro', description: 'FRED series and the Macro Allocation Engine regime and signals' },
  portfolio: { label: 'Portfolio math', description: 'Risk reports, optimization and method backtests' },
};

export interface ConsigliereToolSpec {
  group: ConsigliereToolGroup;
  type: 'function';
  function: { name: string; description: string; parameters: object };
}
