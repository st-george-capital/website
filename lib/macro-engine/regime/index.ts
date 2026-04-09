// lib/macro-engine/regime/index.ts
// Orchestrates the full regime classification pipeline.
// Called by scripts/macro-engine/run-regime-fit.ts.
// Does NOT contain algorithm logic — delegates to cluster.ts, templates.ts, transitions.ts.

import { prisma } from '../db';
import { buildDailyFeatureVectors, fitClusters, autoNameRegime } from './cluster';
import { loadActiveTemplates, saveTemplates, matchToTemplates, euclideanDist } from './templates';
import { computeTransitionMatrix, buildTransitionRows } from './transitions';
import type { RegimeLabelRow } from './types';

export interface ClassifyResult {
  fitId: string;
  labelCount: number;
  regimeNames: string[];
  converged: boolean;
}

export async function classifyRegimes(
  startDate: Date,
  endDate: Date,
  k: number = 4
): Promise<ClassifyResult> {
  // Step 1: Aggregate feature vectors
  const vectors = await buildDailyFeatureVectors(startDate, endDate);
  console.log(`Fitting k=${k} clusters on ${vectors.length} daily vectors...`);

  // Step 2: Fit k-means
  const fitResult = fitClusters(vectors, k);
  if (!fitResult.converged) {
    console.warn(`Warning: k-means did not converge after ${fitResult.iterations} iterations`);
  }

  // Step 3–5: Template stabilization
  const existingTemplates = await loadActiveTemplates();
  let nameMap: Record<number, string>;

  if (existingTemplates.length === 0) {
    // First run: auto-name and save as canonical templates
    nameMap = Object.fromEntries(
      fitResult.centroids.map((centroid, idx) => [idx, autoNameRegime(centroid)])
    );
    await saveTemplates(fitResult, nameMap);
    console.log('First run: saved canonical templates -', Object.values(nameMap).join(', '));
  } else {
    // Re-fit: match new centroids to canonical templates
    const permutation = matchToTemplates(fitResult.centroids, existingTemplates);
    // Remap clusterAssignments: new label → canonical label index
    fitResult.clusterAssignments = fitResult.clusterAssignments.map(
      newIdx => permutation[newIdx]
    );
    nameMap = Object.fromEntries(
      existingTemplates.map(t => [t.labelIndex, t.regimeLabel])
    );
    console.log('Re-fit: stabilized labels using template matching');
  }

  // Step 6: Upsert RegimeLabel rows
  console.log(`Upserting ${vectors.length} regime labels...`);
  const labelRows: RegimeLabelRow[] = vectors.map((dv, i) => {
    const labelIndex = fitResult.clusterAssignments[i];
    const centroid = fitResult.centroids[labelIndex] ?? fitResult.centroids[0];
    const dist = euclideanDist(dv.vector, centroid);
    const confidence = 1 / (1 + dist);
    return {
      date: dv.date,
      regimeLabel: nameMap[labelIndex] ?? `regime-${labelIndex}`,
      labelIndex,
      confidence,
      fitId: fitResult.fitId,
    };
  });

  for (const row of labelRows) {
    await prisma.regimeLabel.upsert({
      where: { date: row.date },
      create: row,
      update: { regimeLabel: row.regimeLabel, labelIndex: row.labelIndex, confidence: row.confidence, fitId: row.fitId },
    });
  }

  // Step 7–8: Compute and upsert transition matrix
  const transMatrix = computeTransitionMatrix(fitResult.clusterAssignments, k);
  const transRows = buildTransitionRows(fitResult.fitId, nameMap, transMatrix, k);
  for (const row of transRows) {
    await prisma.regimeTransition.upsert({
      where: { fitId_fromLabel_toLabel: { fitId: row.fitId, fromLabel: row.fromLabel, toLabel: row.toLabel } },
      create: row,
      update: { prob1Day: row.prob1Day, prob63Day: row.prob63Day, prob126Day: row.prob126Day, prob252Day: row.prob252Day },
    });
  }

  return {
    fitId: fitResult.fitId,
    labelCount: labelRows.length,
    regimeNames: [...new Set(Object.values(nameMap))],
    converged: fitResult.converged,
  };
}
