import { prisma } from '@mimir/prisma';
import { filesize } from 'filesize';
import Link from 'next/link';
import { Stack } from '../../../../components/Stack';
import { Table, TableCell, TableRow } from '../../../../components/Table';

export default function PackageVersion({ version }) {
  return (
    <>
      <main className="p-4">
        <nav>
          <ul className="flex py-4">
            <li className="text-gray-600 after:mx-4 after:content-['/']">
              <Link className="text-blue-600 underline" href="/packages">
                Packages
              </Link>
            </li>
            <li className="text-gray-600 after:mx-4 after:content-['/']">
              <Link
                className="text-blue-600 underline"
                href={`/packages/${version.package.id}`}
              >
                {version.package.name}
              </Link>
            </li>
            <li>{version.version}</li>
          </ul>
        </nav>
        <h1 className="text-2xl font-bold">
          {version.package.name}@{version.version}
        </h1>

        <section>
          <h2 className="text-xl font-bold">Entrypoints</h2>
          <Stack className="gap-y-8">
            {version.entrypoints.map((entrypoint) => {
              return (
                <section key={entrypoint.id}>
                  <h3>
                    {entrypoint.entrypoint === '.'
                      ? version.package.name
                      : `${version.package.name}/${entrypoint.entrypoint.slice(
                          2,
                        )}`}
                  </h3>
                  <Table
                    columns={[
                      'Identifier',
                      'Gzip (minified)',
                      'Gzip (unminifed)',
                      'Minified',
                      'Unminified',
                    ]}
                    rows={entrypoint.exports}
                    renderRow={(row) => {
                      return (
                        <TableRow key={row.id}>
                          <TableCell>{row.identifier}</TableCell>
                          <TableCell>{filesize(row.gzipMinified)}</TableCell>
                          <TableCell>{filesize(row.gzipUnminified)}</TableCell>
                          <TableCell>{filesize(row.minified)}</TableCell>
                          <TableCell>{filesize(row.unminified)}</TableCell>
                        </TableRow>
                      );
                    }}
                  />
                </section>
              );
            })}
          </Stack>
        </section>
      </main>
    </>
  );
}

export async function getServerSideProps({ params }) {
  const version = await prisma.packageVersion.findUniqueOrThrow({
    where: {
      versionByPackage: {
        packageId: params.id,
        version: params.version,
      },
    },
    select: {
      id: true,
      version: true,
      package: {
        select: {
          id: true,
          name: true,
        },
      },
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
        },
      },
    },
  });

  return {
    props: {
      version,
    },
  };
}
