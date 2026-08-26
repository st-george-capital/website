try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {}

import { runTradeRadarSignalsOnly } from '@/lib/trade-radar/pipeline';

runTradeRadarSignalsOnly()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('trade-radar signal build failed');
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  });
