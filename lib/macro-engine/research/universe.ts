import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import type { UniverseEntry } from '../types';

const ExpressionKindSchema = z.enum(['etf', 'equity']);
const PairModeSchema = z.enum(['mean_reversion', 'trend_continuation']);

export const ResearchExpressionSchema = z.object({
  ticker: z.string().min(1),
  name: z.string().min(1),
  kind: ExpressionKindSchema,
  assetClass: z.string().min(1),
  region: z.string().nullable(),
  sector: z.string().nullable(),
  country: z.string().nullable(),
  benchmarkTicker: z.string().min(1),
  inceptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  exchange: z.string().min(1),
  currency: z.string().length(3),
  themeTags: z.array(z.string().min(1)).default([]),
});

export const PairDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  numerator: z.string().min(1),
  denominator: z.string().min(1),
  mode: PairModeSchema,
  lookbackDays: z.number().int().positive().default(63),
  entryZ: z.number().positive().default(1.25),
  cooldownDays: z.number().int().nonnegative().default(20),
});

const ResearchUniverseConfigSchema = z.object({
  expressions: z.array(ResearchExpressionSchema).min(1),
  pairs: z.array(PairDefinitionSchema).default([]),
});

export type ResearchExpression = z.infer<typeof ResearchExpressionSchema>;
export type PairDefinition = z.infer<typeof PairDefinitionSchema>;
export type ResearchUniverseConfig = z.infer<typeof ResearchUniverseConfigSchema>;

const configPath = path.join(process.cwd(), 'config', 'macro-engine', 'research-universe.json');

export function getResearchUniverseConfig(): ResearchUniverseConfig {
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const parsed = ResearchUniverseConfigSchema.parse(raw);
  validateNoDuplicateTickers(parsed.expressions);
  validatePairsReferenceExpressions(parsed);
  return parsed;
}

export function getResearchExpressions(): ResearchExpression[] {
  return getResearchUniverseConfig().expressions;
}

export function getResearchPairs(): PairDefinition[] {
  return getResearchUniverseConfig().pairs;
}

export function getResearchExpressionMap(): Map<string, ResearchExpression> {
  return new Map(getResearchExpressions().map((expr) => [expr.ticker, expr]));
}

export function toPriceIngestUniverse(expressions: ResearchExpression[]): UniverseEntry[] {
  return expressions.map((expr) => ({
    ticker: expr.ticker,
    name: expr.name,
    type: expr.kind,
    sector: expr.sector,
    country: expr.country && expr.country.length === 2 ? expr.country : null,
    inceptionDate: expr.inceptionDate,
    proxySeries: expr.ticker,
    currency: expr.currency,
    exchange: expr.exchange,
  }));
}

function validateNoDuplicateTickers(expressions: ResearchExpression[]): void {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const expr of expressions) {
    if (seen.has(expr.ticker)) dupes.add(expr.ticker);
    seen.add(expr.ticker);
  }
  if (dupes.size > 0) {
    throw new Error(`Duplicate research tickers: ${[...dupes].join(', ')}`);
  }
}

function validatePairsReferenceExpressions(config: ResearchUniverseConfig): void {
  const tickers = new Set(config.expressions.map((expr) => expr.ticker));
  const missing = new Set<string>();
  for (const pair of config.pairs) {
    if (!tickers.has(pair.numerator)) missing.add(pair.numerator);
    if (!tickers.has(pair.denominator)) missing.add(pair.denominator);
  }
  if (missing.size > 0) {
    throw new Error(`Research pairs reference missing tickers: ${[...missing].join(', ')}`);
  }
}
