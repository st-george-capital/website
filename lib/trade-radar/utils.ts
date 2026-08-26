import { createHash } from 'crypto';
import { format, getISOWeek, startOfWeek, subMonths, subWeeks } from 'date-fns';

export function normalizeName(input: string | null | undefined): string {
  return (input ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(ltd|limited|inc|corp|corporation|llc|co|company|gmbh|sa|plc)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function safeString(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

export function safeNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const num = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(num) ? num : null;
}

export function safeDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function pickFirst(row: Record<string, unknown>, candidates: string[]): unknown {
  for (const key of candidates) {
    if (key in row && row[key] != null && row[key] !== '') return row[key];
    const match = Object.keys(row).find((rowKey) => rowKey.toLowerCase() === key.toLowerCase());
    if (match && row[match] != null && row[match] !== '') return row[match];
  }
  return null;
}

export function startOfTradeWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function formatWeekLabel(date: Date): string {
  return `${format(date, 'yyyy')}-W${String(getISOWeek(date)).padStart(2, '0')}`;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function mad(values: number[]): number | null {
  const med = median(values);
  if (med == null) return null;
  const deviations = values.map((value) => Math.abs(value - med));
  return median(deviations);
}

export function robustZ(current: number | null, history: number[]): number | null {
  if (current == null || history.length < 5) return null;
  const med = median(history);
  const m = mad(history);
  if (med == null || m == null || m === 0) return null;
  return 0.6745 * (current - med) / m;
}

export function percentDelta(current: number | null, baseline: number | null): number | null {
  if (current == null || baseline == null || baseline === 0) return null;
  return (current - baseline) / Math.abs(baseline);
}

export function computeHhi(counts: number[]): number | null {
  const total = counts.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return null;
  return counts.reduce((sum, value) => {
    const share = value / total;
    return sum + share * share;
  }, 0);
}

export function average(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!filtered.length) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

export function hashKey(parts: Array<string | number | null | undefined>): string {
  return createHash('sha1').update(parts.map((part) => part ?? '').join('||')).digest('hex');
}

export function coverageStatus(score: number | null): string {
  if (score == null) return 'unknown';
  if (score >= 0.8) return 'healthy';
  if (score >= 0.6) return 'watch';
  return 'unstable';
}

export function signalBucket(score: number): string {
  if (score >= 80) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 50) return 'medium';
  return 'watch';
}

export function seasonFromDate(date: Date): 'winter' | 'summer' | 'fall' {
  const month = date.getUTCMonth() + 1;
  if (month >= 9) return 'fall';
  if (month >= 5) return 'summer';
  return 'winter';
}

export function formatCurrency(value: number | null): string {
  if (value == null) return 'n/a';
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function rollingWindowDates() {
  const now = new Date();
  return {
    incrementalStart: subWeeks(now, 8),
    signalStart: subWeeks(now, 60),
    storageStart: subMonths(now, 36),
    end: now,
  };
}
