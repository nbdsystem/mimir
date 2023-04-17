import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as toolCache from '@actions/tool-cache';
import { logger } from '@mimir/logger';
import { prisma } from '@mimir/prisma';
import { Octokit } from '@octokit/rest';
import { BackgroundJob } from '../BackgroundJob.js';
import { Job } from './Job.js';

const rootDirectory = path.dirname(
  path.dirname(fileURLToPath(import.meta.url)),
);
const cacheDir = path.join(rootDirectory, '.cache');

export const GetPackageUsage = Job({
  name: 'GetPackageUsage',
  file: import.meta.url,
  async run(packageId, repositoryId) {
    const pkg = await prisma.package.findUniqueOrThrow({
      where: {
        id: packageId,
      },
    });
    const repo = await prisma.repository.findUniqueOrThrow({
      where: {
        id: repositoryId,
      },
    });

    logger.info(
      'Getting usage for %s in %s/%s',
      pkg.name,
      repo.owner,
      repo.name,
    );

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    await fs.mkdir(cacheDir, { recursive: true });

    const { data: commits } = await octokit.repos.listCommits({
      owner: repo.owner,
      repo: repo.name,
    });
    const commit = commits[0].sha;

    for (const { sha } of commits.slice(1)) {
      if (existsSync(path.join(cacheDir, sha))) {
        logger.info('Removing old commit %s...', sha);
        await fs.rmdir(path.join(cacheDir, sha));
      }
    }

    const extractPath = path.join(cacheDir, commit);

    if (!existsSync(extractPath)) {
      logger.info('Downloading latest commit %s...', commit);

      const archivePath = path.join(cacheDir, `${commit}.tar.gz`);
      let archiveData = await octokit.repos.downloadTarballArchive({
        owner: repo.owner,
        repo: repo.name,
        ref: commit,
      });
      await fs.writeFile(archivePath, Buffer.from(archiveData.data));

      // Free memory
      archiveData = Buffer.from('');

      await fs.mkdir(extractPath, { recursive: true });
      await toolCache.extractTar(archivePath, extractPath);
      await fs.rm(archivePath);
    }

    const extractedFiles = await fs.readdir(extractPath);
    const directory = path.join(extractPath, extractedFiles[0]);

    let repositoryCommit = await prisma.commit.findUnique({
      where: {
        commit: {
          repositoryId: repo.id,
          sha: commit,
        },
      },
    });
    if (!repositoryCommit) {
      repositoryCommit = await prisma.commit.create({
        data: {
          repositoryId: repo.id,
          sha: commit,
        },
      });
    }

    await BackgroundJob.enqueue(
      GetStylesUsage,
      repositoryCommit.sha,
      directory,
    );
    await BackgroundJob.enqueue(
      GetJavaScriptUsage,
      repositoryCommit.sha,
      directory,
    );
  },
});

export const GetStylesUsage = Job({
  name: 'GetStylesUsage',
  file: import.meta.url,
  async run(sha, directory) {
    const commit = await prisma.commit.findUniqueOrThrow({
      where: {
        sha,
      },
    });

    logger.info('Getting style usage for commit: %s', sha);
  },
});

export const GetJavaScriptUsage = Job({
  name: 'GetJavaScriptUsage',
  file: import.meta.url,
  async run(sha, directory) {
    const commit = await prisma.commit.findUniqueOrThrow({
      where: {
        sha,
      },
    });

    logger.info('Getting JavaScript usage for commit: %s', sha);
  },
});
