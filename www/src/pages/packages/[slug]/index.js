import { prisma } from '@mimir/prisma';
import semver from 'semver';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { Link } from '../../../components/Link';
import { Page } from '../../../components/Page';
import { PageFooter } from '../../../components/PageFooter';
import { PageHeader } from '../../../components/PageHeader';

export default function PackagePage({ pkg }) {
  return (
    <Page>
      <PageHeader />
      <main className="container mx-auto pt-8">
        <Breadcrumbs className="mb-6">
          <Link href="/packages">Packages</Link>
          <span>{pkg.name}</span>
        </Breadcrumbs>
        <h1 className="mb-8 text-3xl">{pkg.name}</h1>
        <section>
          <h2 className="mb-4 text-xl">Versions</h2>
          <table>
            <thead>
              <tr>
                <th>Version</th>
                <th>Entrypoints</th>
              </tr>
            </thead>
            <tbody>
              {pkg.versions.map((version) => {
                return (
                  <tr key={version.id}>
                    <td>
                      <Link href={`/packages/${pkg.slug}/${version.version}`}>
                        {version.version}
                      </Link>
                    </td>
                    <td>{version._count.entrypoints}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
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
      versions: {
        select: {
          id: true,
          version: true,
          _count: {
            select: {
              entrypoints: true,
            },
          },
        },
      },
    },
  });

  return {
    props: {
      pkg: {
        ...pkg,
        versions: pkg.versions.sort((a, b) => {
          return semver.compare(b.version, a.version);
        }),
      },
    },
  };
}
