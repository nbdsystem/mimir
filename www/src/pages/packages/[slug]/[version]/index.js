import { prisma } from '@mimir/prisma';
import { filesize } from 'filesize';
import { Breadcrumbs } from '../../../../components/Breadcrumbs';
import { Link } from '../../../../components/Link';
import { Page } from '../../../../components/Page';
import { PageFooter } from '../../../../components/PageFooter';
import { PageHeader } from '../../../../components/PageHeader';

export default function PackageVersionPage({ pkg, version }) {
  return (
    <Page>
      <PageHeader />
      <main className="container mx-auto pt-8">
        <Breadcrumbs className="mb-6">
          <Link href="/packages">Packages</Link>
          <Link href={`/packages/${pkg.slug}`}>{pkg.name}</Link>
          <span>{version.version}</span>
        </Breadcrumbs>
        <h1 className="mb-8 text-3xl">Version</h1>
        <div className="flex flex-col gap-y-12">
          {version.entrypoints.map((entrypoint) => {
            return (
              <section key={entrypoint.id}>
                <h2 className="mb-2 text-xl">
                  {entrypoint.entrypoint === '.'
                    ? pkg.name
                    : `${pkg.name}/${entrypoint.entrypoint.slice(2)}`}
                </h2>
                <dl className="mb-4 grid grid-cols-4 gap-4">
                  <div>
                    <dt className="text-sm">Gzip</dt>
                    <dd>{filesize(entrypoint.gzipMinified)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm">Gzip (unminified)</dt>
                    <dd>{filesize(entrypoint.gzipUnminified)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm">Minified</dt>
                    <dd>{filesize(entrypoint.minified)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm">Unminified</dt>
                    <dd>{filesize(entrypoint.unminified)}</dd>
                  </div>
                </dl>
                <h3 className="mb-4 flex items-center gap-x-2 text-xl">
                  Exports{' '}
                  <span className="text-sm text-gray-500">
                    ({entrypoint._count.exports})
                  </span>
                </h3>
                <table>
                  <thead>
                    <tr>
                      <th>Export</th>
                      <th>Gzip</th>
                      <th>Gzip (unminified)</th>
                      <th>Minified</th>
                      <th>Unminified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entrypoint.exports.map((exp) => {
                      return (
                        <tr key={exp.id}>
                          <td>{exp.identifier}</td>
                          <td>{filesize(exp.gzipMinified)}</td>
                          <td>{filesize(exp.gzipUnminified)}</td>
                          <td>{filesize(exp.minified)}</td>
                          <td>{filesize(exp.unminified)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      </main>
      <PageFooter />
    </Page>
  );
}

export async function getServerSideProps({ params }) {
  const pkg = await prisma.package.findUniqueOrThrow({
    where: {
      slug: params.slug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
  const version = await prisma.packageVersion.findUniqueOrThrow({
    where: {
      versionByPackage: {
        packageId: pkg.id,
        version: params.version,
      },
    },
    select: {
      id: true,
      version: true,
      entrypoints: {
        select: {
          id: true,
          entrypoint: true,
          gzipMinified: true,
          gzipUnminified: true,
          minified: true,
          unminified: true,
          exports: {
            select: {
              id: true,
              identifier: true,
              gzipMinified: true,
              gzipUnminified: true,
              minified: true,
              unminified: true,
            },
          },
          _count: {
            select: {
              exports: true,
            },
          },
        },
      },
    },
  });

  return {
    props: {
      pkg,
      version,
    },
  };
}
