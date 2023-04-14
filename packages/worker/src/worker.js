import { parentPort } from 'node:worker_threads';
import { logger } from '@mimir/logger';
import * as WorkerEvent from './events.js';

const handlersCache = new Map();

async function getHandler(filename) {
  if (handlersCache.has(filename)) {
    return handlersCache.get(filename);
  }

  const handler = await import(filename);
  handlersCache.set(filename, handler);
  return handler;
}

function wrapAsync(fn) {
  return function (...args) {
    fn(...args).catch((error) => {
      parentPort.postMessage({
        type: WorkerEvent.UNCAUGHT_ERROR,
        reason: error,
      });
    });
  };
}

parentPort.on(
  'message',
  wrapAsync(async (message) => {
    if (message.type === WorkerEvent.START) {
      logger.info('Start worker');
      getHandler(message.filename);
      return;
    }

    if (message.type === WorkerEvent.CALL) {
      const { filename, method, args } = message;
      logger.info(
        'Calling method %s with args %s from module %s',
        method,
        args,
        filename,
      );
      const handler = await getHandler(filename);
      if (!handler[method]) {
        parentPort.postMessage({
          type: WorkerEvent.ERROR,
          reason: `Method ${method} not found`,
        });
        return;
      }

      const value = await handler[method].apply(null, args);
      parentPort.postMessage({
        type: WorkerEvent.SUCCESS,
        value,
      });
    }
  }),
);
