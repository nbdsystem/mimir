import { logger } from '@mimir/logger';
import { v4 as uuid } from 'uuid';
import * as redis from '../storage/redis.js';
import { Pool } from './Pool.js';

export const BackgroundJob = {
  create({ numWorkers } = {}) {
    const client = redis.get();
    const pool = Pool.create({
      numWorkers,
    });
    const jobs = new Map();
    let intervalId = null;

    async function processQueue() {
      if (pool.available.size === 0) {
        logger.debug('No available workers');
        return;
      }

      const entry = await client.lpop('queue');
      if (!entry) {
        logger.debug('No jobs in queue');
        return;
      }

      const { id, name, file, args } = JSON.parse(entry);
      if (!jobs.has(id)) {
        jobs.set(id, {
          id,
          name,
          file,
          args,
          state: 'queued',
        });
      }
      jobs.get(id).state = 'pending';
      pool.execute(name, file, args).then(
        () => {
          jobs.delete(id);
        },
        (error) => {
          jobs.get(id).state = 'failed';
          jobs.get(id).error = error;
        },
      );
    }

    const Job = {
      async all() {
        return Array.from(jobs.values());
      },
    };
    const Worker = {
      async all() {
        return Array.from(pool.workers.values());
      },
    };

    return {
      // Collections
      Job,
      Worker,

      // Actions
      async clear() {
        await client.flushall();
      },
      async enqueue(job, ...args) {
        const id = uuid();
        const entry = JSON.stringify({
          id,
          name: job.name,
          file: job.file,
          args,
        });

        await client.rpush('queue', entry);

        jobs.set(id, {
          id,
          name: job.name,
          args: job.args,
          state: 'queued',
          createdAt: Date.now(),
        });

        return id;
      },
      start() {
        intervalId = setInterval(() => {
          processQueue();
        }, 1000);
      },
      stop() {
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      },
    };
  },
};
