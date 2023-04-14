import { prisma } from '../../prisma';

export default function PackagesPage({ packages }) {
  return (
    <>
      <main>
        <div>
          <h1 className="scale-125 opacity-50 hover:scale-150 hover:opacity-75">
            Packages
          </h1>
        </div>
        {packages.length === 0 ? <p>No packages</p> : <p>Packages!</p>}
      </main>
    </>
  );
}

export async function getServerSideProps() {
  const packages = await prisma.package.findMany({
    select: {
      id: true,
      name: true,
    },
  });
  console.log(packages);

  return {
    props: {
      packages,
    },
  };
}
