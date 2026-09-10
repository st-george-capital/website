export const callProfit = (spot: number, strike: number, premium: number) =>
  Math.max(spot - strike, 0) - premium;
export function bondPrice(yieldPercent: number) {
  const y = yieldPercent / 100;
  return (
    Array.from({ length: 5 }, (_, i) => 50 / (1 + y) ** (i + 1)).reduce(
      (a, b) => a + b,
      0,
    ) +
    1000 / (1 + y) ** 5
  );
}
export const equityPrice = (waccPercent: number) =>
  ((120 * 1.03) / (waccPercent / 100 - 0.03) - 250) / 50;
export const currencyReturn = (currencyPercent: number) =>
  (1.04 * (1 + currencyPercent / 100) - 1) * 100;
export function executionCost(quantity: number) {
  let remaining = quantity,
    spend = 0;
  for (const [size, price] of [
    [100, 100.01],
    [200, 100.03],
    [300, 100.06],
  ]) {
    const fill = Math.min(remaining, size);
    spend += fill * price;
    remaining -= fill;
  }
  return {
    spend,
    vwap: spend / quantity,
    bps: (spend / quantity / 100 - 1) * 10000,
  };
}
