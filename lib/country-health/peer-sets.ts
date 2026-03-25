// ─── Peer groups for cross-sectional z-scores & sensitivity analysis ─────────
// Scores are relative; changing the basket changes levels. We expose multiple
// baskets so users can see rank stability vs peer definition.

import { DEFAULT_PEER_IDS } from './dictionary';

export const PEER_SETS: Record<string, { label: string; ids: string[] }> = {
  default: {
    label: `All (${DEFAULT_PEER_IDS.length})`,
    ids: [...DEFAULT_PEER_IDS],
  },
  dm_only: {
    label: 'Developed markets (9)',
    ids: ['US', 'DE', 'JP', 'GB', 'KR', 'FR', 'CA', 'AU', 'NL', 'CH', 'SE', 'SG', 'IT'].slice(0, 9),
  },
  em_only: {
    label: 'Emerging (8)',
    ids: ['CN', 'IN', 'BR', 'MX', 'ID', 'TR', 'ZA', 'VN'],
  },
  g10_plus: {
    label: 'G10 + key EMs (13)',
    ids: ['US', 'CN', 'IN', 'DE', 'JP', 'KR', 'GB', 'BR', 'MX', 'FR', 'CA', 'AU', 'IT'],
  },
};

/** Union of all peer IDs we must fetch from World Bank */
export function allPeerCountryIds(): string[] {
  const s = new Set<string>();
  for (const p of Object.values(PEER_SETS)) p.ids.forEach(id => s.add(id));
  // Always include the full default basket
  DEFAULT_PEER_IDS.forEach(id => s.add(id));
  return [...s];
}
