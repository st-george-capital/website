// ─── Peer groups for cross-sectional z-scores & sensitivity analysis ─────────
// Scores are relative; changing the basket changes levels. We expose multiple
// baskets so users can see rank stability vs peer definition.

import { DEFAULT_PEER_IDS } from './dictionary';

export const PEER_SETS: Record<string, { label: string; ids: string[] }> = {
  default: {
    label: 'Default (10)',
    ids: [...DEFAULT_PEER_IDS],
  },
  dm_only: {
    label: 'Developed markets (5)',
    ids: ['US', 'DE', 'JP', 'GB', 'KR'],
  },
  em_only: {
    label: 'Emerging (5)',
    ids: ['CN', 'IN', 'BR', 'MX', 'ID'],
  },
  expanded: {
    label: 'Expanded (18)',
    ids: [
      'US', 'CN', 'IN', 'DE', 'JP', 'KR', 'GB', 'BR', 'MX', 'ID',
      'FR', 'IT', 'CA', 'AU', 'SA', 'AR', 'TR', 'ZA',
    ],
  },
};

/** Union of all peer IDs we must fetch from World Bank */
export function allPeerCountryIds(): string[] {
  const s = new Set<string>();
  for (const p of Object.values(PEER_SETS)) p.ids.forEach(id => s.add(id));
  return [...s];
}
