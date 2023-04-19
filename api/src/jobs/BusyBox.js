import { logger } from '@mimir/logger';
import { Job } from './Job.js';

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const BusyBox = Job({
  name: 'BusyBox',
  file: import.meta.url,
  async run() {
    logger.info('BusyBox...');
    await sleep(10_000);

    logger.info('BusyBox...');
    await sleep(10_000);

    logger.info('BusyBox...');
    await sleep(10_000);
  },
});
