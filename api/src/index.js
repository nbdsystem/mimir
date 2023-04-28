import { logger } from '@mimir/logger';
import config from 'config';
import { BackgroundJob } from './BackgroundJob.js';
import { setup } from './server.js';

const HOST = config.get('HOST');
const PORT = config.get('PORT');

async function main() {
  const app = setup();

  app.listen(PORT, HOST, () => {
    logger.info(`Listening on http://${HOST}:${PORT}`);
  });

  await BackgroundJob.start();
}

main().catch((error) => {
  BackgroundJob.stop();
  logger.error(error);
  process.exit(1);
});
