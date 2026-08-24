// Shared rate-limit batching helper, extracted from app/api/dashboard/flows/route.ts
// so it isn't copy-pasted across the CVaR optimizer's data pipeline files.
//
// Runs a list of async functions strictly sequentially (never in parallel), waiting
// `staggerMs` between each call to stay under third-party API rate limits (Alpha Vantage
// free tier in particular). Each call is raced against `timeoutMs` so one hung request
// can't stall the whole batch. After 3 consecutive failures/timeouts, remaining calls in
// the batch are skipped (assumed rate-limited) rather than each one waiting out its own
// timeout.

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function sequential<T>(
  fns: Array<() => Promise<T | null>>,
  staggerMs = 550,
  timeoutMs = 8000
): Promise<Array<T | null>> {
  const results: Array<T | null> = [];
  let consecutiveFails = 0;
  for (const fn of fns) {
    if (consecutiveFails >= 3) {
      results.push(null);
      continue;
    }
    const result = await Promise.race([
      fn(),
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ]);
    results.push(result);
    consecutiveFails = result === null ? consecutiveFails + 1 : 0;
    await delay(staggerMs);
  }
  return results;
}
