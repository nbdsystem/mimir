import { prisma } from '@mimir/prisma';
import Link from 'next/link';
import { Table, TableCell, TableRow } from '../../components/Table';

export default function PackagesPage({ packages }) {
  return (
    <>
      <main>
        <div>
          <h1 id="packages-label" className="text-2xl font-bold">
            Packages
          </h1>
        </div>
        {packages.length === 0 ? (
          <>
            <p>No packages</p>
            <p>
              <Link href="/packages/create">Create one</Link>
            </p>
          </>
        ) : (
          <Table
            aria-labelledby="packages-label"
            columns={['Name', 'Versions']}
            rows={packages}
            renderRow={(row) => {
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/packages/${row.id}`}
                      className="text-blue-600 underline"
                    >
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell>{row._count.versions}</TableCell>
                </TableRow>
              );
            }}
          />
        )}
      </main>
    </>
  );
}

export async function getServerSideProps() {
  const packages = await prisma.package.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          versions: true,
        },
      },
    },
  });

  return {
    props: {
      packages,
    },
  };
}
