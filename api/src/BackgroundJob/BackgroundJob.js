import { logger } from '@mimir/logger';
import { prisma } from '@mimir/prisma';
import * as jobs from '../jobs/index.js';
import * as redis from '../storage/redis.js';
import { Pool } from './Pool.js';

export const BackgroundJob = {
  create({ numWorkers = 1 } = {}) {
    const client = redis.get();
    const pool = Pool.create({
      numWorkers,
    });
    let intervalId = null;

    async function processQueue() {
      if (pool.available.size === 0) {
        logger.debug('No available workers');
        return;
      }

      const id = await client.lpop('queue');
      if (!id) {
        logger.debug('No jobs in queue');
        return;
      }

      const job = await prisma.job.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          name: true,
          args: true,
          state: true,
          createdAt: true,
        },
      });

      if (!job) {
        logger.error('Unable to find job with id: %s', id);
        return;
      }

      if (jobs[job.name] === undefined) {
        logger.error('Unable to find job runner for job named: %s', job.name);
        return;
      }

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          state: 'pending',
        },
      });

      pool
        .execute(job.name, jobs[job.name].file, job.args)
        .then(() => {
          return prisma.job.update({
            where: {
              id: job.id,
            },
            data: {
              state: 'completed',
              duration: Date.now() - job.createdAt,
            },
          });
        })
        .catch((error) => {
          logger.error(error);
          return prisma.job.update({
            where: {
              id: job.id,
            },
            data: {
              message: error.message,
              state: 'failed',
              duration: Date.now() - job.createdAt,
            },
          });
        });
    }

    const Worker = {
      async all() {
        return Array.from(pool.workers.values());
      },
    };

    return {
      // Collections
      Worker,

      // Actions
      async clear() {
        await client.flushall();
      },
      async enqueue(job, ...args) {
        const item = await prisma.job.create({
          data: {
            name: job.name,
            args,
            state: 'queued',
          },
        });

        await client.rpush('queue', item.id);

        return item.id;
      },
      async start() {
        // Assume that pending jobs are orphaned if we are starting the
        // background server
        const orphans = await prisma.job.findMany({
          where: {
            state: 'pending',
          },
          select: {
            id: true,
          },
        });

        // Requeue orphaned jobs
        await Promise.all(
          orphans.map(async (orphan) => {
            await prisma.job.update({
              where: {
                id: orphan.id,
              },
              data: {
                state: 'queued',
              },
            });
            await client.rpush('queue', orphan.id);
          }),
        );

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
