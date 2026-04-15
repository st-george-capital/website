import { prismaDirectUrl as prisma } from '../../lib/macro-engine/db';

async function main() {
  const tickers = ['TLT', 'GLD', 'IWM', 'HYG'];
  for (const ticker of tickers) {
    const count = await prisma.$queryRaw<{cnt: number}[]>`
      SELECT COUNT(*)::int AS cnt FROM ohlcv_daily WHERE ticker = ${ticker}
    `;
    const first = await prisma.$queryRaw<{date: Date}[]>`
      SELECT MIN(date) AS date FROM ohlcv_daily WHERE ticker = ${ticker}
    `;
    const last = await prisma.$queryRaw<{date: Date}[]>`
      SELECT MAX(date) AS date FROM ohlcv_daily WHERE ticker = ${ticker}
    `;
    console.log(`${ticker}: ${count[0].cnt} rows, ${first[0].date?.toISOString().slice(0,10) ?? 'none'} → ${last[0].date?.toISOString().slice(0,10) ?? 'none'}`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
