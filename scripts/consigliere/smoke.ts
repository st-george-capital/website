/**
 * Runs every consigliere tool once against the real database and APIs (read-only).
 *   npx tsx --env-file=.env scripts/consigliere/smoke.ts            all tools
 *   npx tsx --env-file=.env scripts/consigliere/smoke.ts get_fred_series   one tool
 */
import { consigliereToolSpecs, runConsigliereTool } from '@/lib/consigliere/tools/registry';
import { smokeContext } from './smoke-context';

const CASES: Array<[string, Record<string, unknown>]> = [
  ['get_fund_portfolio', {}],
  ['list_sgc_tables', { table: 'transactions' }],
  ['query_sgc_table', { table: 'transactions', limit: 3, fields: ['ticker', 'type', 'quantity', 'price', 'date'] }],
  ['summarize_sgc_table', { table: 'holdings', metric: 'count', group_by: 'sector' }],
  ['get_macro_regime', {}],
  ['get_fred_series', { series_id: 'UNRATE', observations: 6 }],
  ['search_fred_series', { query: 'core pce', limit: 3 }],
  ['get_stock_quote', { ticker: 'MSFT' }],
  ['get_company_overview', { ticker: 'MSFT' }],
  ['get_news_sentiment', { ticker: 'MSFT', days: 7 }],
  ['get_earnings_history', { ticker: 'MSFT', quarters: 2 }],
  ['search_ticker', { query: 'Shopify' }],
  ['get_price_history', { ticker: 'SPY', period: '6m' }],
  ['run_dcf', { ticker: 'AAPL' }],
  [
    'draft_research_report',
    {
      ticker: 'GEV',
      assumptions_confirmed: true,
      recommendation: 'buy',
      peers: 'SIEGY, ETN, VRT',
      investment_thesis: ['Gas turbine backlog is sold out into 2028, so pricing power is underestimated.'],
      key_risks: [{ title: 'Offshore wind losses', impact: 'High' }],
      business_model: 'Power, Wind and Electrification segments selling equipment plus long-term services.',
    },
  ],
  ['list_my_dcf_models', { limit: 3 }],
  ['get_comps', { ticker: 'MSFT', peers: 'GOOGL, META' }],
  ['get_research_reports', { limit: 2 }],
  ['get_earnings_reactions', { ticker: 'MSFT', quarters: 4 }],
  ['get_options_positioning', { ticker: 'MSFT' }],
  ['get_insider_activity', { ticker: 'MSFT', limit: 3 }],
  ['get_earnings_estimates', { ticker: 'MSFT' }],
  ['get_earnings_call_summary', { ticker: 'MSFT' }],
  ['get_institutional_holdings', { ticker: 'MSFT' }],
  ['get_macro_outlook', {}],
  ['get_g10_rates', { country: 'JP' }],
  ['get_trade_signals', { limit: 3 }],
  ['get_latest_cvar_run', {}],
  ['get_sectors', { tickers: ['AAPL', 'XOM', 'SPY'] }],
  ['optimize_portfolio', { tickers: 'SPY, TLT, GLD', max_weight: '0.6' }],
  ['analyze_portfolio', { weights: { SPY: 0.6, TLT: 0.4 } }],
  ['compare_methods', { tickers: ['SPY', 'TLT', 'GLD'], start: '2019-01-01', methods: ['equal_weight', 'min_variance', 'hrp'] }],
];

async function main() {
  const only = process.argv[2];
  const specs = consigliereToolSpecs();
  const missing = specs.map((s) => s.function.name).filter((n) => !CASES.some(([c]) => c === n));
  if (missing.length) console.warn(`No smoke case for: ${missing.join(', ')}`);
  console.log(`${specs.length} tools, schema size ${JSON.stringify(specs).length} chars\n`);

  const ctx = await smokeContext();
  let failures = 0;
  for (const [name, args] of CASES) {
    if (only && name !== only) continue;
    const started = Date.now();
    const out = await runConsigliereTool(name, args, ctx);
    const ms = Date.now() - started;
    const body = JSON.stringify(out.ok ? out.result : out.error);
    console.log(`${out.ok ? 'PASS' : 'FAIL'} ${name} (${ms}ms, ${body.length} chars)`);
    console.log(`     ${body.slice(0, only ? 4000 : 220)}\n`);
    if (!out.ok) failures += 1;
    if (!only) await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  process.exit(failures);
}

main();
