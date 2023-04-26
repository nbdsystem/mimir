import { logger } from '@mimir/logger';
import { prisma } from '@mimir/prisma';
import slugify from '@sindresorhus/slugify';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { BackgroundJob } from './BackgroundJob.js';
import { GetPackage } from './jobs/GetPackage.js';

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
  // Packages
  // ---------------------------------------------------------------------------
  const CREATE_PACKAGE_SCHEMA = z.object({
    name: z.string(),
  });

  app.post(
    '/packages',
    handler(async (req, res) => {
      const result = CREATE_PACKAGE_SCHEMA.safeParse(req.body);
      if (result.error) {
        const formatted = result.error.format();
        return res.json({
          errors: Object.entries(formatted).map(([field, value]) => {
            return {
              field,
              errors: value._errors,
            };
          }),
        });
      }

      let pkg = await prisma.package.findUnique({
        where: {
          name: result.data.name,
        },
      });
      if (pkg) {
        return res.status(400).json({
          message: 'Resource already exists',
        });
      }

      pkg = await prisma.package.create({
        data: {
          name: result.data.name,
          slug: slugify(result.data.name),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await BackgroundJob.enqueue(GetPackage, pkg.name);

      res.json(pkg);
    }),
  );

  app.delete(
    '/packages/:id',
    handler(async (req, res) => {
      const pkg = await prisma.package.findUnique({
        where: {
          id: req.params.id,
        },
      });
      if (pkg) {
        await prisma.package.delete({
          where: {
            id: pkg.id,
          },
        });
        return res.json({ message: 'Package successfully deleted' });
      }

      res.status(400).json({ message: 'Package not found' });
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
