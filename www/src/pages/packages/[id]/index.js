import { prisma } from '@mimir/prisma';
import { filesize } from 'filesize';
import Link from 'next/link';
import { Table, TableCell, TableRow } from '../../../components/Table';

export default function PackagePage({ pkg }) {
  return (
    <main className="p-4">
      <ul>
        <li>
          <Link href="/packages" className="text-blue-600 underline">
            Packages
          </Link>
        </li>
      </ul>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{pkg.name}</h1>
        <div>
          <button type="button">Sync</button>
        </div>
      </div>
      <section>
        <h2>Versions ({pkg.versions.length})</h2>
        <Table
          columns={[
            'Version',
            'Entrypoint',
            'Exports',
            'Gzip (minified)',
            'Gzip (unminified)',
            'Minified',
            'Unminified',
          ]}
          rows={pkg.versions.flatMap((version) => {
            return version.entrypoints.map((entrypoint) => {
              return {
                ...version,
                entrypoint,
              };
            });
          })}
          renderRow={(row) => {
            return (
              <TableRow key={`${row.id}:${row.entrypoint.id}`}>
                <TableCell>
                  <Link
                    className="text-blue-600 underline"
                    href={`/packages/${pkg.id}/${row.version}`}
                  >
                    {row.version}
                  </Link>
                </TableCell>
                <TableCell>
                  {row.entrypoint.entrypoint === '.'
                    ? pkg.name
                    : `${pkg.name}/${row.entrypoint.entrypoint.slice(2)}`}
                </TableCell>
                <TableCell>{row.entrypoint._count.exports}</TableCell>
                <TableCell>{filesize(row.entrypoint.gzipMinified)}</TableCell>
                <TableCell>{filesize(row.entrypoint.gzipUnminified)}</TableCell>
                <TableCell>{filesize(row.entrypoint.minified)}</TableCell>
                <TableCell>{filesize(row.entrypoint.unminified)}</TableCell>
              </TableRow>
            );
          }}
        />
      </section>
    </main>
  );
}

export async function getServerSideProps({ params }) {
  const pkg = await prisma.package.findUniqueOrThrow({
    where: {
      id: params.id,
    },
    select: {
      id: true,
      name: true,
      versions: {
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
              _count: {
                select: {
                  exports: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return {
    props: {
      pkg,
    },
  };
}
