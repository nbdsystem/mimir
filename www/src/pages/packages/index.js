import { prisma } from '@mimir/prisma';
import { Link } from '../../components/Link';
import { Page } from '../../components/Page';
import { PageFooter } from '../../components/PageFooter';
import { PageHeader } from '../../components/PageHeader';
import { Text } from '../../components/Text';

export default function PackagesPage({ packages }) {
  return (
    <Page>
      <PageHeader />
      <main className="container mx-auto pt-8">
        <Text asChild token="heading-01">
          <h1 className="mb-6">Packages</h1>
        </Text>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Versions</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => {
              return (
                <tr key={pkg.id}>
                  <td>
                    <Link href={`/packages/${pkg.slug}`}>{pkg.name}</Link>
                  </td>
                  <td>{pkg._count.versions}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>
      <PageFooter />
    </Page>
  );
}

export async function getServerSideProps() {
  const packages = await prisma.package.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
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
