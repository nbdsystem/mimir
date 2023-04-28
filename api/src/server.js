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
  app.get(
    '/packages',
    handler(async (req, res) => {
      const packages = await prisma.package.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      res.json(packages);
    }),
  );

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

  app.post(
    '/packages/refresh',
    handler(async (req, res) => {
      const packages = await prisma.package.findMany({
        select: {
          name: true,
        },
      });

      for (const pkg of packages) {
        await BackgroundJob.enqueue(GetPackage, pkg.name);
      }

      res.json({ status: 'ok' });
    }),
  );

  app.post(
    '/packages/:id/refresh',
    handler(async (req, res) => {
      const pkg = await prisma.package.findUnique({
        where: {
          id: req.params.id,
        },
      });
      if (pkg) {
        await BackgroundJob.enqueue(GetPackage, pkg.name);
        res.json({ status: 'ok' });
        return;
      }

      res.status(404).send('Not found');
    }),
  );

  // ---------------------------------------------------------------------------
  // Queue
  // ---------------------------------------------------------------------------
  app.get(
    '/queue/jobs/queued',
    handler(async (req, res) => {
      const jobs = await prisma.job.findMany({
        where: {
          state: 'queued',
        },
        select: {
          id: true,
          name: true,
          args: true,
          state: true,
          message: true,
          duration: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json(jobs);
    }),
  );

  app.get(
    '/queue/jobs/pending',
    handler(async (req, res) => {
      const jobs = await prisma.job.findMany({
        where: {
          state: 'pending',
        },
        select: {
          id: true,
          name: true,
          args: true,
          state: true,
          message: true,
          duration: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json(jobs);
    }),
  );

  app.get(
    '/queue/jobs/failed',
    handler(async (req, res) => {
      const jobs = await prisma.job.findMany({
        where: {
          state: 'failed',
        },
        select: {
          id: true,
          name: true,
          args: true,
          state: true,
          message: true,
          duration: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json(jobs);
    }),
  );

  app.get(
    '/queue/jobs/completed',
    handler(async (req, res) => {
      const jobs = await prisma.job.findMany({
        where: {
          state: 'completed',
        },
        select: {
          id: true,
          name: true,
          args: true,
          state: true,
          message: true,
          duration: true,
          createdAt: true,
          updatedAt: true,
        },
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
