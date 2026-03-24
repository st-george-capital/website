// ─── Country classification labels ───────────────────────────────────────────
//
// Once scored, every country is placed into one of six archetype buckets.
// These capture the qualitative investment interpretation of the numbers.

import type { Pillar } from './dictionary';
import type { PillarScore } from './scoring';

export interface ClassificationResult {
  label: string;
  color: string;       // Tailwind bg color class
  textColor: string;   // Tailwind text color class
  description: string;
}

// Thresholds are on the 0–100 scale (after ×100)
const HIGH = 55;
const MED  = 42;

export function classify(
  coreScore: number | null,
  overlayScore: number | null,
  pillarScores: Record<Pillar, PillarScore>
): ClassificationResult {
  if (coreScore === null) {
    return {
      label: 'Insufficient Data',
      color: 'bg-gray-100',
      textColor: 'text-gray-600',
      description: 'Not enough data to classify.',
    };
  }

  const innovScore = (pillarScores['innovation']?.score ?? 0) * 100;
  const instScore  = (pillarScores['institutional']?.score ?? 0) * 100;
  const macroScore = (pillarScores['macro_sustainability']?.score ?? 0) * 100;
  const prodScore  = (pillarScores['productive_capacity']?.score ?? 0) * 100;

  const overlayHigh = overlayScore !== null && overlayScore >= HIGH;
  const overlayLow  = overlayScore !== null && overlayScore < MED;

  // Frontier Compounder: strong across the board — especially innovation + institutions
  if (coreScore >= HIGH && innovScore >= HIGH && instScore >= HIGH) {
    return {
      label: 'Frontier Compounder',
      color: 'bg-emerald-100',
      textColor: 'text-emerald-800',
      description: 'Strong across all pillars. High innovation, strong institutions, accessible markets.',
    };
  }

  // Innovation Leader: driven by tech/IP strength + institutions but may lack scale
  if (innovScore >= HIGH && instScore >= MED && coreScore >= MED) {
    return {
      label: 'Innovation Leader',
      color: 'bg-blue-100',
      textColor: 'text-blue-800',
      description: 'Leading in R&D, patents, and IP. Institutional quality supports long-duration investment.',
    };
  }

  // Industrial Climber: strong productive capacity + rising innovation, weaker institutions
  if (prodScore >= HIGH && innovScore >= MED && instScore < HIGH) {
    return {
      label: 'Industrial Climber',
      color: 'bg-indigo-100',
      textColor: 'text-indigo-800',
      description: 'Strong industrial and productive base. Innovation rising but institutions lag.',
    };
  }

  // State-Capacity Powerhouse: strong capacity + innovation, but high institutional risk
  if ((prodScore >= HIGH || innovScore >= HIGH) && instScore < MED) {
    return {
      label: 'State-Capacity Powerhouse',
      color: 'bg-amber-100',
      textColor: 'text-amber-800',
      description: 'Real economic and innovative strength, but elevated intervention risk limits investor trust.',
    };
  }

  // Fragile Growth: high growth but weak macro sustainability
  if (prodScore >= MED && macroScore < MED) {
    return {
      label: 'Fragile Growth Story',
      color: 'bg-orange-100',
      textColor: 'text-orange-800',
      description: 'Decent growth momentum, but weak macro sustainability raises crisis vulnerability.',
    };
  }

  // Stable Mature Power: strong institutions + macro, slower growth
  if (instScore >= HIGH && macroScore >= MED && prodScore < MED) {
    return {
      label: 'Stable Mature Power',
      color: 'bg-purple-100',
      textColor: 'text-purple-800',
      description: 'Sound institutions and macro, but lower growth and innovation upside.',
    };
  }

  // Catch-all for medium performers
  if (coreScore >= MED) {
    return {
      label: 'Developing Compounder',
      color: 'bg-teal-100',
      textColor: 'text-teal-800',
      description: 'Solid foundation with room to improve across multiple pillars.',
    };
  }

  return {
    label: 'Declining System',
    color: 'bg-red-100',
    textColor: 'text-red-800',
    description: 'Weakness across multiple pillars constrains growth and investment.',
  };
}
