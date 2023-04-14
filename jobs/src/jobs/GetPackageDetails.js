import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import stream from 'node:stream';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { logger } from '@mimir/logger';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import virtual from '@rollup/plugin-virtual';
import got from 'got';
import { gzipSizeSync } from 'gzip-size';
import { rollup } from 'rollup';
import semver from 'semver';
import tar from 'tar';
import { minify } from 'terser';
import { Job } from '../Job.js';
import { prisma } from '../prisma.js';

const pipeline = promisify(stream.pipeline);
const rootDirectory = path.dirname(
  path.dirname(fileURLToPath(import.meta.url)),
);
const cacheDir = path.join(rootDirectory, '.cache');

export const GetPackageDetails = Job({
  name: 'GetPackageDetails',
  file: import.meta.url,
  async run(name) {
    logger.info('Getting package: %s', name);

    let pkg = await prisma.package.findUnique({
      where: {
        name,
      },
    });
    if (!pkg) {
      pkg = await prisma.package.create({
        data: {
          name,
        },
      });
    }

    const versions = await getPackage(pkg.name).then((result) => {
      return Object.keys(result.versions)
        .filter((version) => {
          if (version.startsWith('0.0.0')) {
            return false;
          }
          if (version.includes('-rc.')) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          return semver.gt(b, a) ? 1 : -1;
        })
        .slice(0, 10);
    });

    for (const version of versions) {
      logger.info('Getting %s@%s', pkg.name, version);

      let packageVersion = await prisma.packageVersion.findUnique({
        where: {
          versionByPackage: {
            packageId: pkg.id,
            version,
          },
        },
      });
      if (!packageVersion) {
        packageVersion = await prisma.packageVersion.create({
          data: {
            packageId: pkg.id,
            version,
          },
        });
      }

      const info = await getPackageVersion(pkg.name, version);
      const hash = createHash('sha256')
        .update(pkg.name)
        .update('\n')
        .update(version)
        .digest('base64url');
      const directory = path.join(cacheDir, hash);
      if (!existsSync(directory)) {
        await fs.mkdir(directory, {
          recursive: true,
        });
      }

      if (!existsSync(path.join(directory, 'package'))) {
        logger.info('Downloading package %s@%s', pkg.name, version);
        await pipeline(
          got.stream(info.dist.tarball),
          tar.extract({
            cwd: directory,
          }),
        );
      }

      if (!existsSync(path.join(directory, 'stats.json'))) {
        logger.info('Analyzing package %s@%s', pkg.name, version);
        const data = await getBundleData(path.join(directory, 'package'));
        await fs.writeFile(
          path.join(directory, 'stats.json'),
          JSON.stringify(data),
          'utf8',
        );
      }

      const stats = JSON.parse(
        await fs.readFile(path.join(directory, 'stats.json'), 'utf8'),
      );
      console.log(stats);
    }

    return pkg;
  },
});

// GET /{package}
// Response: https://github.com/npm/registry/blob/master/docs/responses/package-metadata.md
async function getPackage(name) {
  const url = new URL(name, 'https://registry.npmjs.com');
  const result = await got(url).json();
  return result;
}

// GET /{package}/{version}
async function getPackageVersion(name, version) {
  const url = new URL(`${name}/${version}`, 'https://registry.npmjs.com');
  const result = await got(url).json();
  return result;
}

async function getBundleData(directory) {
  const packageJsonPath = path.join(directory, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  const entrypoints = getEntrypoints(packageJson);
  const data = {
    version: 1,
    entrypoints: [],
  };

  for (const entrypoint of entrypoints) {
    logger.info(
      'Analyzing entrypoint: %s (%s)',
      entrypoint.entrypoint,
      entrypoint.type,
    );

    const filepath = path.resolve(directory, entrypoint.filepath);
    const external = [
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
      ...Object.keys(packageJson.peerDependencies ?? {}),
    ].map((name) => {
      return new RegExp(`^${name}(/.*)?`);
    });

    const bundle = await rollup({
      input: filepath,
      external,
      plugins: [
        interopPlugin,
        nodeResolve(),
        commonjs({
          include: [/node_modules/],
        }),
      ],
      onwarn: () => {
        //
      },
    });
    const { output } = await bundle.generate({
      format: 'esm',
    });
    const minified = await minify(output[0].code);
    const exports = [];

    for (const identifier of output[0].exports) {
      logger.info('Analyzing export: %s', identifier);

      const reexport = await rollup({
        input: '__entrypoint__',
        external,
        plugins: [
          interopPlugin,
          nodeResolve(),
          commonjs({
            include: /node_modules/,
          }),
          virtual({
            __entrypoint__: `export { ${identifier} } from '${filepath}';`,
          }),
        ],
        onwarn: () => {
          //
        },
      });
      const { output } = await reexport.generate({
        format: 'esm',
      });
      const minified = await minify(output[0].code);

      exports.push({
        identifier,
        unminified: Buffer.byteLength(output[0].code),
        minified: Buffer.byteLength(minified.code),
        gzipUnminified: gzipSizeSync(output[0].code),
        gzipMinified: gzipSizeSync(minified.code),
      });
    }

    data.entrypoints.push({
      ...entrypoint,
      unminified: Buffer.byteLength(output[0].code),
      minified: Buffer.byteLength(minified.code),
      gzipUnminified: gzipSizeSync(output[0].code),
      gzipMinified: gzipSizeSync(minified.code),
      exports,
    });
  }

  return data;
}

export function getEntrypoints(packageJson) {
  if (packageJson.exports) {
    return getPackageExports(packageJson.exports, packageJson.type);
  }

  if (packageJson.module) {
    return [
      {
        entrypoint: '.',
        filepath: packageJson.module,
        type: 'module',
      },
    ];
  }

  if (packageJson.main) {
    return [
      {
        entrypoint: '.',
        filepath: packageJson.main,
        type: 'commonjs',
      },
    ];
  }

  return [];
}

const conditions = new Set([
  'node-addons',
  'node',
  'import',
  'require',
  'default',
  // TypeScript
  'types',
]);

function getPackageExports(exportMap, type = 'commonjs') {
  // "exports": "./index.js"
  if (typeof exportMap === 'string') {
    return [
      {
        entrypoint: '.',
        filepath: exportMap,
        type,
      },
    ];
  }

  if (typeof exportMap === 'object') {
    return Object.entries(exportMap)
      .filter(([key]) => {
        // We currently ignore wildcard imports
        return !key.includes('*');
      })
      .map(([key, value]) => {
        if (typeof value === 'string') {
          //
          // "exports": {
          //   "import": "./index.mjs",
          //   "require": "./index.cjs",
          // }
          //
          if (conditions.has(key)) {
            return {
              entrypoint: '.',
              filepath: value,
              type: key === 'import' ? 'module' : 'commonjs',
            };
          }

          //
          // "exports": {
          //   ".": "./index.js",
          //   "./lib-esm/*": [],
          // }
          //
          return {
            entrypoint: key,
            filepath: value,
            type,
          };
        }

        //
        // "exports": {
        //   ".": {
        //     "import": "./index.js",
        //     "require": "./index.js"
        //   },
        //   "./lib-esm/*": {
        //     "import": [],
        //     "require": []
        //   }
        // }
        //
        if (value.import) {
          return {
            entrypoint: key,
            filepath: value.import,
            type: 'module',
          };
        }

        if (value.default) {
          return {
            entrypoint: key,
            filepath: value.default,
            // This should be the type of the module but currently older
            // versions of @primer/react use node to mean ESM
            type: 'module',
          };
        }

        if (value.require) {
          return {
            entrypoint: key,
            filepath: value.require,
            type: 'commonjs',
          };
        }

        if (value.node) {
          return {
            entrypoint: key,
            filepath: value.node,
            // This should be the type of the module but currently older
            // versions of @primer/react use node to mean ESM
            type: 'module',
          };
        }

        throw new Error(
          `Unsupported export value for entrypoint \`${key}\`: ${value}`,
        );
      });
  }

  throw new Error(`Unknown exports format: ${exportMap}`);
}

export function getPackageName(source) {
  const parts = source.split('/');

  if (source.startsWith('@')) {
    const [scope, name] = parts;
    return `${scope}/${name}`;
  }

  const [name] = parts;
  return name;
}

/**
 * Temporary plugin as rollup does not seem to be available to compile the
 * theme-preval from @primer/react
 */
const interopPlugin = {
  async load(id) {
    if (id.endsWith('theme.js')) {
      const contents = await fs.readFile(id, 'utf8');
      if (contents.includes(`import { theme } from './theme-preval';`)) {
        return `
          import * as theme from './theme-preval';
          export default theme.theme;
        `;
      }
    }
    return null;
  },
};
