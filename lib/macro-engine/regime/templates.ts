// lib/macro-engine/regime/templates.ts
import { prisma } from '../db';
import type { RegimeFitResult, RegimeTemplateRow } from './types';

/** Euclidean distance between two equal-length vectors. */
export function euclideanDist(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}

/**
 * Load all active canonical centroid templates from DB.
 * Returns empty array if no templates exist (first-run case).
 */
export async function loadActiveTemplates(): Promise<RegimeTemplateRow[]> {
  const rows = await prisma.regimeTemplate.findMany({
    where: { isActive: true },
    orderBy: { labelIndex: 'asc' },
  });
  return rows.map(r => ({
    id: r.id,
    fitDate: r.fitDate,
    regimeLabel: r.regimeLabel,
    labelIndex: r.labelIndex,
    centroidJson: r.centroidJson,
    isActive: r.isActive,
  }));
}

/**
 * Persist new canonical templates after first fit.
 * Deactivates all existing templates before writing new ones.
 * nameMap: { [labelIndex]: canonicalName }
 */
export async function saveTemplates(
  fitResult: RegimeFitResult,
  nameMap: Record<number, string>
): Promise<void> {
  // Deactivate all existing templates
  await prisma.regimeTemplate.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });
  // Insert new canonical templates
  await prisma.regimeTemplate.createMany({
    data: fitResult.centroids.map((centroid, idx) => ({
      fitDate: fitResult.fitDate,
      regimeLabel: nameMap[idx] ?? `regime-${idx}`,
      labelIndex: idx,
      centroidJson: JSON.stringify(centroid),
      isActive: true,
    })),
  });
}

/**
 * Match new centroid indices to canonical template label indices.
 * Uses greedy minimum-Euclidean-distance assignment (no duplicate assignments).
 * Returns permutation: permutation[newIdx] = canonicalLabelIndex
 *
 * When k_new > k_templates (e.g. k increased from 4→6), excess centroids that
 * cannot be matched to any template are assigned synthetic indices starting at
 * max(existing labelIndex) + 1, so they get valid labels instead of -1.
 *
 * Euclidean centroid matching is sufficient for template stabilization.
 */
export function matchToTemplates(
  newCentroids: number[][],
  templates: RegimeTemplateRow[]
): number[] {
  const k = newCentroids.length;
  const permutation: number[] = new Array(k).fill(-1);
  const used = new Set<number>();

  for (let ni = 0; ni < k; ni++) {
    let bestTemplateIdx = -1;
    let bestDist = Infinity;
    for (const template of templates) {
      if (used.has(template.labelIndex)) continue;
      const templateCentroid = JSON.parse(template.centroidJson) as number[];
      const dist = euclideanDist(newCentroids[ni], templateCentroid);
      if (dist < bestDist) {
        bestDist = dist;
        bestTemplateIdx = template.labelIndex;
      }
    }
    permutation[ni] = bestTemplateIdx;
    if (bestTemplateIdx !== -1) used.add(bestTemplateIdx);
  }

  // Assign synthetic indices to any unmatched centroids (k_new > k_templates)
  const maxExisting = templates.reduce((m, t) => Math.max(m, t.labelIndex), -1);
  let nextIdx = maxExisting + 1;
  for (let ni = 0; ni < k; ni++) {
    if (permutation[ni] === -1) {
      permutation[ni] = nextIdx++;
    }
  }

  return permutation;
}
