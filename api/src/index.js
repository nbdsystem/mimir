import { logger } from '@mimir/logger';
import { prisma } from '@mimir/prisma';
import { Octokit } from '@octokit/rest';
import slugify from '@sindresorhus/slugify';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { BackgroundJob } from './BackgroundJob.js';
import { GetPackageDetails } from './jobs/GetPackageDetails.js';
import { GetPackageUsage } from './jobs/GetPackageUsage.js';

const { HOST = '0.0.0.0', PORT = '4000' } = process.env;

async function main() {
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

  // ---------------------------------------------------------------------------
  // Packages
  // ---------------------------------------------------------------------------
  const CreatePackageSchema = z.object({
    name: z.string(),
  });

  // List all packages
  app.get(
    '/api/packages',
    handler(async (req, res) => {
      const packages = await prisma.package.findMany({
        select: {
          id: true,
          name: true,
        },
      });
      res.json(packages);
    }),
  );

  // Create a package
  app.post(
    '/api/packages',
    handler(async (req, res) => {
      const { data, error } = CreatePackageSchema.safeParse(req.body);
      if (error) {
        return res.json({
          type: 'error',
          details: error.format(),
        });
      }

      let pkg = await prisma.package.findUnique({
        where: {
          name: data.name,
        },
      });
      if (pkg) {
        return res.json({
          type: 'error',
          details: `A package already exists with name: ${data.name}`,
        });
      }
      pkg = await prisma.package.create({
        data: {
          name: data.name,
          slug: slugify(data.name),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await BackgroundJob.enqueue(GetPackageDetails, data.name);

      res.json(pkg);
    }),
  );

  // Get a package
  app.get(
    '/api/packages/:id',
    handler(async (req, res) => {
      const pkg = await prisma.package.findUnique({
        where: {
          id: req.params.id,
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!pkg) {
        return res.status(404).json({ message: 'Not found' });
      }
      return res.json(pkg);
    }),
  );

  // Delete a package
  app.delete(
    '/api/packages/:id',
    handler(async (req, res) => {
      const pkg = await prisma.package.findUnique({
        where: {
          id: req.params.id,
        },
      });
      if (!pkg) {
        return res.status(404).json({
          status: 'error',
          details: 'Not found',
        });
      }

      await prisma.package.delete({
        where: {
          id: req.params.id,
        },
      });

      res.json({
        status: 'ok',
      });
    }),
  );

  // ---------------------------------------------------------------------------
  // Repositories
  // ---------------------------------------------------------------------------

  // List all repositories
  app.get(
    '/api/repos',
    handler(async (req, res) => {
      const repos = await prisma.repository.findMany({
        select: {
          id: true,
          owner: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      res.json(repos);
    }),
  );

  const CreateRepositorySchema = z.object({
    owner: z.string(),
    name: z.string(),
  });

  // Create a repository
  app.post(
    '/api/repos',
    handler(async (req, res) => {
      const { data, error } = CreateRepositorySchema.safeParse(req.body);
      if (error) {
        const { _errors, ...rest } = error.format();

        return res.json({
          message: 'Validation failed',
          errors: Object.entries(rest).map(([key, value]) => {
            return {
              resource: 'Repository',
              field: key,
              code: value._errors,
            };
          }),
        });
      }

      let repo = await prisma.repository.findUnique({
        where: {
          fullName: {
            owner: data.owner,
            name: data.name,
          },
        },
      });
      if (repo) {
        return res.json({
          type: 'error',
          details: `A Repository already exists with owner: ${data.owner} and name: ${data.name}`,
        });
      }

      const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
      });
      const { data: response } = await octokit.rest.repos.get({
        owner: data.owner,
        repo: data.name,
      });

      if (!response) {
        return res.json({ message: 'Repo not found on GitHub' });
      }

      repo = await prisma.repository.create({
        data: {
          owner: data.owner,
          name: data.name,
        },
        select: {
          id: true,
          owner: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json(repo);
    }),
  );

  // ---------------------------------------------------------------------------
  // Dependencies
  // ---------------------------------------------------------------------------

  // Get dependencies for a repo
  app.get(
    '/api/repos/:id/dependencies',
    handler(async (req, res) => {
      const dependencies = await prisma.dependency.findMany({
        where: {
          repositoryId: req.params.id,
        },
        select: {
          id: true,
          package: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json(dependencies);
    }),
  );

  const AddDependencySchema = z.object({
    packageId: z.string(),
  });

  // Add a dependency to a repo
  app.post(
    '/api/repos/:id/dependencies',
    handler(async (req, res) => {
      const { data, error } = AddDependencySchema.safeParse(req.body);
      if (error) {
        return res.json({
          type: 'error',
          details: error.format(),
        });
      }

      const repo = await prisma.repository.findUnique({
        where: {
          id: req.params.id,
        },
      });
      if (!repo) {
        return res.status(404).json({
          type: 'error',
          details: `No repository found with id: ${req.params.id}`,
        });
      }

      const pkg = await prisma.package.findUnique({
        where: {
          id: data.packageId,
        },
      });
      if (!pkg) {
        return res.status(404).json({
          type: 'error',
          details: `No package found with id: ${data.id}`,
        });
      }

      let dependency = await prisma.dependency.findUnique({
        where: {
          repositoryByPackage: {
            repositoryId: req.params.id,
            packageId: data.packageId,
          },
        },
      });
      if (dependency) {
        return res.json({
          type: 'error',
          details: `A dependency already exists with repositoryId: ${data.repositoryId} and packageId: ${data.packageId}`,
        });
      }
      dependency = await prisma.dependency.create({
        data: {
          packageId: data.packageId,
          repositoryId: req.params.id,
        },
        select: {
          id: true,
          repository: {
            select: {
              id: true,
              owner: true,
              name: true,
            },
          },
          package: {
            select: {
              id: true,
              name: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json(dependency);
    }),
  );

  // Sync the dependencies for a repo
  app.post(
    '/api/repos/:id/dependencies/sync',
    handler(async (req, res) => {
      const repo = await prisma.repository.findUnique({
        where: {
          id: req.params.id,
        },
      });
      const dependencies = await prisma.dependency.findMany({
        where: {
          repositoryId: repo.id,
        },
        select: {
          package: {
            select: {
              id: true,
            },
          },
        },
      });

      const jobs = await Promise.all(
        dependencies.map(async (dependency) => {
          const jobId = await BackgroundJob.enqueue(
            GetPackageUsage,
            dependency.package.id,
            repo.id,
          );
          return jobId;
        }),
      );

      res.json(jobs);
    }),
  );

  // ---------------------------------------------------------------------------
  // Queue
  // ---------------------------------------------------------------------------

  app.get(
    '/api/queue',
    handler(async (req, res) => {
      const jobs = await BackgroundJob.Job.all();
      res.json(jobs);
    }),
  );

  app.post(
    '/api/queue/clear',
    handler(async (req, res) => {
      await BackgroundJob.clear();
      res.json({
        status: 'ok',
      });
    }),
  );

  const RetryJobSchema = z.object({
    id: z.string(),
  });

  app.post(
    '/api/queue/retry',
    handler(async (req, res) => {
      const { data, error } = RetryJobSchema.safeParse(req.body);
      if (error) {
        return res.json({
          type: 'error',
          details: error.format(),
        });
      }

      throw new Error('unimplemented');
    }),
  );

  app.get(
    '/api/queue/in-progress',
    handler(async (req, res) => {
      const jobs = await BackgroundJob.Job.all();
      res.json(jobs.inProgress);
    }),
  );

  app.get(
    '/api/queue/workers',
    handler(async (req, res) => {
      const workers = await BackgroundJob.Worker.all();
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
      const jobs = await BackgroundJob.Job.all();
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

      const jobs = await BackgroundJob.Job.all();
      const job = jobs.find((job) => {
        return job.args[0] === data.name;
      });
      if (job) {
        if (job.state === 'pending' || job.state === 'queued') {
          return res.json({
            type: 'error',
            details: `A job for package ${data.name} is already in the queue`,
          });
        }
      }

      const id = await BackgroundJob.enqueue(GetPackageDetails, data.name);
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

  app.listen(PORT, HOST, () => {
    logger.info(`Listening on http://${HOST}:${PORT}`);
  });

  BackgroundJob.start();
}

function handler(handlerFn) {
  return (req, res, next) => {
    Promise.resolve(handlerFn(req, res, next)).catch(next);
  };
}

main().catch((error) => {
  logger.error(error);
  process.exit(1);
});
