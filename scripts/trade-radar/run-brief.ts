try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {}

import { runTradeRadarBriefOnly } from '@/lib/trade-radar/pipeline';

runTradeRadarBriefOnly()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('trade-radar brief generation failed');
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  });
