import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { logger } from '@mimir/logger';
import { v4 as uuid } from 'uuid';

const defaultNumWorkers = os.availableParallelism() - 1;

const TaskInfo = Symbol('TaskInfo');

export class Pool {
  static create({ numWorkers = defaultNumWorkers } = {}) {
    return new Pool({ numWorkers });
  }

  constructor({ numWorkers }) {
    this.workers = new Map();
    this.available = new Set();
    this.working = new Set();

    for (let i = 0; i < numWorkers; i++) {
      const id = uuid();
      const worker = new Worker(new URL('./worker.js', import.meta.url), {
        name: id,
        workerData: {
          id,
        },
      });
      const data = {
        id,
        worker,
        state: 'starting',
        [TaskInfo]: null,
      };

      worker.on('message', (message) => {
        if (message.type === 'state') {
          data.state = message.value;

          if (message.value === 'idle') {
            logger.info('Worker (%s) state:%s', id, message.value);
            this.available.add(id);
          }

          if (message.value === 'working') {
            logger.info('Worker (%s) state:%s', id, message.value);
            this.available.remove(id);
            this.working.add(id);
          }

          if (message.value === 'success') {
            logger.info(
              'Worker (%s) state:%s duration:%s',
              id,
              message.value,
              message.duration,
            );

            this.working.delete(id);
            data[TaskInfo].resolve();
            data[TaskInfo] = null;
          }

          if (message.value === 'error') {
            logger.info('Worker (%s) state:%s', id, message.value);

            this.working.delete(id);
            data[TaskInfo].reject(message.error);
            data[TaskInfo] = null;

            logger.error(message.error);
          }
        }
      });

      worker.postMessage({
        type: 'COMMAND',
        value: 'START',
      });

      this.workers.set(id, data);
    }
  }

  execute(name, file, args) {
    if (this.available.size === 0) {
      throw new Error('No workers available');
    }

    return new Promise((resolve, reject) => {
      const workerId = this.available.values().next().value;
      const entry = this.workers.get(workerId);

      entry[TaskInfo] = {
        resolve,
        reject,
      };

      this.working.add(workerId);
      this.available.delete(workerId);
      entry.worker.postMessage({
        type: 'COMMAND',
        value: 'CALL',
        name,
        file,
        args,
      });
    });
  }
}
