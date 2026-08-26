try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {}

import { verifyTradeRadarData } from '@/lib/trade-radar/pipeline';

const includeSelfTest = process.argv.slice(2).includes('--self-test');

verifyTradeRadarData({ includeSelfTest })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  })
  .catch((error) => {
    console.error('trade-radar verification failed');
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  });
