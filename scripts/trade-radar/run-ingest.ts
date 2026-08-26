try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {}

import { runTradeRadarIngest } from '@/lib/trade-radar/pipeline';

const args = process.argv.slice(2);
const fullRefresh = args.includes('--full-refresh');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const rowLimit = limitArg ? Number(limitArg.split('=')[1]) : null;

runTradeRadarIngest({
  fullRefresh,
  rowLimit: Number.isFinite(rowLimit) ? rowLimit : null,
})
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('trade-radar ingest failed');
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  });
