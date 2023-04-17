import { parentPort, workerData } from 'node:worker_threads';
import { logger } from '@mimir/logger';

const { id } = workerData;

parentPort.on('message', async (message) => {
  if (message.type === 'COMMAND') {
    if (message.value === 'START') {
      logger.info('Starting worker: %s', id);

      parentPort.postMessage({
        type: 'state',
        value: 'idle',
      });
    }

    if (message.value === 'CALL') {
      logger.info(
        'Calling job: %s (%s) with %s',
        message.name,
        message.file,
        message.args,
      );

      const now = Date.now();

      try {
        parentPort.postMessage({
          type: 'state',
          value: 'pending',
        });

        const mod = await import(message.file);
        const result = await mod[message.name].run(...message.args, {
          workerId: id,
        });

        parentPort.postMessage({
          type: 'state',
          value: 'success',
          duration: Date.now() - now,
          result,
        });
      } catch (error) {
        parentPort.postMessage({
          type: 'state',
          value: 'error',
          error: `${error.message}\n${error.stack}`,
          duration: Date.now() - now,
        });
      } finally {
        parentPort.postMessage({
          type: 'state',
          value: 'idle',
        });
      }
    }
  }
});
