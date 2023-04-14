import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { logger } from '@mimir/logger';
import { v4 as uuid } from 'uuid';

const defaultNumWorkers = os.availableParallelism() - 1;

const TaskInfo = Symbol('TaskInfo');

class Pool {
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

class Scheduler {
  static create({ numWorkers } = {}) {
    return new Scheduler({ numWorkers });
  }

  constructor({ numWorkers }) {
    this.jobs = new Map();
    this.pool = Pool.create({ numWorkers });
  }

  schedule(name, file, args) {
    return this.pool.execute(name, file, args);
  }

  get available() {
    return this.pool.available.size > 0;
  }
}

export const BackgroundJob = {
  create(redis) {
    const scheduler = Scheduler.create({
      numWorkers: 2,
    });
    const inProgress = new Map();
    const failed = new Set();
    let intervalId = null;

    async function processQueue() {
      if (scheduler.available) {
        const entry = await redis.lpop('queue');
        if (entry) {
          const { id, name, file, args } = JSON.parse(entry);
          inProgress.set(id, {
            id,
            name,
            file,
            args,
          });
          scheduler.schedule(name, file, args).then(
            () => {
              inProgress.delete(id);
            },
            (error) => {
              inProgress.delete(id);
              failed.add({
                id,
                name,
                file,
                args,
                error,
              });
            },
          );
        } else {
          logger.debug('No jobs available');
        }
      } else {
        logger.debug('No workers available');
      }
    }

    const Job = {
      async all() {
        const queued = await redis.lrange('queue', 0, -1).then((values) => {
          return values.map((value) => {
            return JSON.parse(value);
          });
        });

        return {
          queued,
          failed: Array.from(failed),
          inProgress: Array.from(inProgress.values()),
        };
      },
    };

    const Worker = {
      async all() {
        return Array.from(scheduler.pool.workers.values());
      },
    };

    return {
      Job,
      Worker,

      async clear() {
        await redis.flushall();
      },

      async restart(workerId) {
        // TODO
      },

      start() {
        intervalId = setInterval(() => {
          processQueue();
        }, 100);
      },

      stop() {
        clearInterval(intervalId);
      },
      async enqueue(job, ...args) {
        const id = uuid();
        const entry = JSON.stringify({
          id,
          name: job.name,
          file: job.file,
          args,
        });
        await redis.rpush('queue', entry);
        return id;
      },
    };
  },
};
