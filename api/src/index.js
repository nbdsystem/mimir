import { logger } from '@mimir/logger';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import * as BackgroundJob from './BackgroundJob/index.js';
import { GetPackageDetails } from './jobs/GetPackageDetails.js';

const { HOST = '0.0.0.0', PORT = '4000' } = process.env;

async function main() {
  const backgroundJob = BackgroundJob.get();
  const app = express();

  app.use((req, res, next) => {
    if (req.headers['x-request-id']) {
      req.id = req.headers['x-request-id'];
    } else {
      req.id = uuid();
    }

    res.setHeader('x-Request-Id', req.id);

    next();
  });
  app.use(morgan('dev'));
  app.use(helmet());
  app.use(cors());
  app.use(bodyParser.json());
  app.disable('x-powered-by');

  app.get(
    '/',
    handler(async (_req, res) => {
      res.send('Hello world');
    }),
  );

  // ---------------------------------------------------------------------------
  // Queue
  // ---------------------------------------------------------------------------

  app.get(
    '/api/queue',
    handler(async (req, res) => {
      const jobs = await backgroundJob.Job.all();
      res.json(jobs);
    }),
  );

  app.post(
    '/api/queue/clear',
    handler(async (req, res) => {
      await backgroundJob.clear();
      res.json({
        status: 'ok',
      });
    }),
  );

  app.get(
    '/api/queue/in-progress',
    handler(async (req, res) => {
      const jobs = await backgroundJob.jobs();
      res.json(jobs.inProgress);
    }),
  );

  app.get(
    '/api/queue/workers',
    handler(async (req, res) => {
      const workers = await backgroundJob.workers();
      res.json(
        workers.map((worker) => {
          return {
            id: worker.id,
            state: worker.state,
          };
        }),
      );
    }),
  );

  app.get(
    '/api/queue/failures',
    handler(async (req, res) => {
      const jobs = await backgroundJob.jobs();
      res.json(jobs.failed);
    }),
  );

  // ---------------------------------------------------------------------------
  // Jobs
  // ---------------------------------------------------------------------------

  const CreateJobUnion = z.discriminatedUnion('type', [
    z.object({
      type: z.literal('package'),
      name: z.string(),
    }),
  ]);

  app.post(
    '/api/jobs',
    handler(async (req, res) => {
      const { data, error } = CreateJobUnion.safeParse(req.body);
      if (error) {
        return res.json({
          type: 'error',
          details: error.format(),
        });
      }

      const id = await backgroundJob.enqueue(GetPackageDetailsJob, data.name);
      res.json({
        id,
      });
    }),
  );

  app.post(
    '/api/jobs/queue',
    handler(async (req, res) => {
      for (let i = 0; i < 100; i++) {
        await backgroundJob.enqueue(AddJob, 1, i);
      }
      res.send('OK');
    }),
  );

  // app.get(
  // '/api/jobs',
  // handler(async (req, res) => {
  // const packageJobs = await prisma.packageJob.findMany({
  // select: {
  // id: true,
  // name: true,
  // status: true,
  // message: true,
  // createdAt: true,
  // updatedAt: true,
  // },
  // where: {
  // NOT: {
  // status: {
  // equals: 0,
  // },
  // },
  // },
  // });

  // res.json([...packageJobs]);
  // }),
  // );

  // const CREATE_PACKAGE_JOB_SCHEMA = z.object({
  // name: z.string(),
  // });

  // const QUEUED = 2;
  // app.post(
  // '/api/jobs/packages',
  // handler(async (req, res) => {
  // const { data, error } = CREATE_PACKAGE_JOB_SCHEMA.safeParse(req.body);
  // if (error) {
  // res.json({
  // type: 'error',
  // details: error.format(),
  // });
  // return;
  // }

  // let jobs = await prisma.packageJob.findMany({
  // where: {
  // name: data.name,
  // status: QUEUED,
  // },
  // });
  // if (jobs.length !== 0) {
  // res.json({
  // type: 'error',
  // details: `A job for package \`${data.name}\` is already queued`,
  // });
  // return;
  // }

  // const job = await prisma.packageJob.create({
  // data: {
  // name: data.name,
  // status: QUEUED,
  // },
  // select: {
  // id: true,
  // name: true,
  // status: true,
  // createdAt: true,
  // updatedAt: true,
  // },
  // });

  // getPackageInfo(job);

  // return res.json(job);
  // }),
  // );

  // app.post(
  // '/api/jobs/repos',
  // handler(async (req, res) => {
  // throw new Error('unimplemented');
  // }),
  // );

  // app.get(
  // '/api/jobs/queue',
  // handler(async (req, res) => {
  // const packageJobs = await prisma.packageJob.findMany({
  // where: {
  // status: QUEUED,
  // },
  // select: {
  // id: true,
  // name: true,
  // status: true,
  // createdAt: true,
  // updatedAt: true,
  // },
  // });
  // res.json(packageJobs);
  // }),
  // );

  // app.delete(
  // '/api/jobs/queue',
  // handler(async (req, res) => {
  // const packageJobs = await prisma.packageJob.findMany({
  // where: {
  // status: QUEUED,
  // },
  // });
  // for (const job of packageJobs) {
  // await prisma.packageJob.delete({
  // where: {
  // id: job.id,
  // },
  // });
  // }
  // res.json({
  // status: 200,
  // message: 'Queue cleared',
  // });
  // }),
  // );

  // app.get(
  // '/api/jobs/:id',
  // handler(async (req, res) => {
  // throw new Error('unimplemented');
  // }),
  // );

  app.use((_req, res, _next) => {
    res.status(404).send('Not found');
  });

  // https://expressjs.com/en/guide/error-handling.html
  app.use((error, _req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    res.status(500).send('Internal server error');
    logger.error(error);
  });

  app.listen(PORT, HOST, () => {
    logger.info(`Listening on http://${HOST}:${PORT}`);
  });

  backgroundJob.start();
}

function handler(handlerFn) {
  return (req, res, next) => {
    Promise.resolve(handlerFn(req, res, next)).catch(next);
  };
}

// const pool = Pool.create(new URL('./worker.js', import.meta.url), {
// numWorkers: 2,
// supportedMethods: ['getPackageInfo'],
// });

// async function getPackageInfo(job) {
// try {
// const result = await pool.getPackageInfo(job.name);

// console.log(result);

// await prisma.packageJob.update({
// where: {
// id: job.id,
// },
// data: {
// status: 0,
// },
// });
// } catch (error) {
// logger.error(error);
// await prisma.packageJob.update({
// where: {
// id: job.id,
// },
// data: {
// status: 1,
// message: `${error.message}\n${error.stack}`,
// },
// });
// }
// }

main().catch((error) => {
  logger.error(error);
  process.exit(1);
});
