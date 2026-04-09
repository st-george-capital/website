/**
 * lib/macro-engine/features/factors/country-health.ts
 *
 * FEAT-05 factor adapter: country-health pillar scores.
 * Reuses scoreCountries() from lib/country-health/scoring.ts — no logic duplication.
 *
 * Strategy: Static/current approach for MVP — World Bank data updates annually,
 * so the same score is used for all historical dates within a given vintage year.
 * Scores are memoized at the module level to avoid re-fetching during batch builds.
 */

import { scoreCountries } from '../../../country-health/scoring';
import { fetchWorldBankRows, fetchPopulations } from '../../../country-health/world-bank';
import { allPeerCountryIds } from '../../../country-health/peer-sets';

// Module-level cache: countryCode → { score: number | null; vintage: string }
const scoreCache = new Map<string, { score: number | null; vintage: string }>();
let cachePopulated = false;

async function populateCache(): Promise<void> {
  if (cachePopulated) return;

  const [rawRows, populations] = await Promise.all([
    fetchWorldBankRows(),
    fetchPopulations(allPeerCountryIds()),
  ]);

  const scores = scoreCountries(rawRows, populations);
  // World Bank data lags 1 year — use prior calendar year as the vintage label
  const vintage = String(new Date().getFullYear() - 1);

  for (const cs of scores) {
    const normalized = cs.coreScore !== null ? cs.coreScore / 100 : null;
    scoreCache.set(cs.country, { score: normalized, vintage });
  }

  cachePopulated = true;
}

/**
 * Returns the current World Bank-derived country health score for a given ISO2 country code,
 * normalized to [0, 1] (coreScore / 100).
 *
 * Returns null value if the country is not found in the World Bank data.
 * sourceMaxDate is null because this is annual static data with no precise max date.
 * vintage indicates which World Bank year was used (e.g. "2023").
 */
export async function computeCountryHealthScore(
  countryCode: string
): Promise<{ value: number | null; sourceMaxDate: Date | null; vintage: string | null }> {
  await populateCache();

  const cached = scoreCache.get(countryCode);
  if (!cached) {
    const fallbackVintage = String(new Date().getFullYear() - 1);
    return { value: null, sourceMaxDate: null, vintage: fallbackVintage };
  }

  return { value: cached.score, sourceMaxDate: null, vintage: cached.vintage };
}
