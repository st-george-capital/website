// ─── Plain-English “why this rank” from pillar + contribution structure ─────

import { PILLAR_LABELS, PILLAR_WEIGHTS, type Pillar } from './dictionary';
import type { CountryScore } from './scoring';
import { variableContributionsToCore as varContribToCore } from './contributions';
import type { VariableDef } from './dictionary';

export function buildWhyRankSentence(
  score: CountryScore,
  rank: number,
  peerSize: number,
  variableDefs: VariableDef[],
  countryDisplayName?: string
): string {
  const parts: string[] = [];
  const label = countryDisplayName?.trim() || score.country;
  parts.push(`${label} ranks #${rank} of ${peerSize} in this peer-relative framework.`);

  const corePillars: Pillar[] = ['productive_capacity', 'human_capital', 'macro_sustainability', 'institutional', 'innovation'];
  const pillarContrib = corePillars
    .map(p => ({
      p,
      label: PILLAR_LABELS[p],
      mass: (score.pillarScores[p]?.score ?? 0) * PILLAR_WEIGHTS[p],
    }))
    .sort((a, b) => b.mass - a.mass);

  const best = pillarContrib[0];
  const worst = pillarContrib[pillarContrib.length - 1];
  if (best && worst && best.p !== worst.p) {
    parts.push(
      `Strongest tilt is ${best.label.toLowerCase()} (weighted contribution to core), while ${worst.label.toLowerCase()} is the relative drag.`
    );
  }

  const vc = varContribToCore(score, variableDefs);
  const top = vc[0];
  const bottom = vc[vc.length - 1];
  if (top && bottom && top.id !== bottom.id) {
    parts.push(
      `Among variables, ${top.label} adds the most to the core score here; ${bottom.label} is the weakest link.`
    );
  }

  if (score.overlayScore !== null && score.overlayScore >= 60) {
    parts.push('Market monetization (overlay) is comparatively strong.');
  } else if (score.overlayScore !== null && score.overlayScore < 40) {
    parts.push('Market monetization (overlay) is comparatively limited versus peers.');
  }

  return parts.join(' ');
}
