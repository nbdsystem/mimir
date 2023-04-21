import { logger } from '@mimir/logger';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';
import { BackgroundJob } from './BackgroundJob.js';
import { BusyBox } from './jobs/BusyBox.js';

export function setup() {
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
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }
  app.use(helmet());
  app.use(cors());
  app.use(bodyParser.json());
  app.disable('x-powered-by');

  app.get(
    '/',
    handler(async (req, res) => {
      res.send('Hello World');
    }),
  );

  // ---------------------------------------------------------------------------
  // Queue
  // ---------------------------------------------------------------------------
  app.get(
    '/queue/jobs',
    handler(async (req, res) => {
      const jobs = await BackgroundJob.Job.all().then((jobs) => {
        return jobs.map((job) => {
          return {
            id: job.id,
            name: job.name,
            args: job.args,
            state: job.state,
            createdAt: job.createdAt,
          };
        });
      });
      res.json(jobs);
    }),
  );

  app.get(
    '/queue/workers',
    handler(async (req, res) => {
      const workers = await BackgroundJob.Worker.all().then((workers) => {
        return workers.map((worker) => {
          return {
            id: worker.id,
            state: worker.state,
          };
        });
      });
      res.json(workers);
    }),
  );

  // ---------------------------------------------------------------------------
  // Jobs
  // ---------------------------------------------------------------------------
  app.post(
    '/jobs/busybox',
    handler(async (req, res) => {
      const id = await BackgroundJob.enqueue(BusyBox);
      res.json({
        id,
      });
    }),
  );

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

  return app;
}

function handler(handlerFn) {
  return (req, res, next) => {
    Promise.resolve(handlerFn(req, res, next)).catch(next);
  };
}
