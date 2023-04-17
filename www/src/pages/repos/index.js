import got from 'got';
import Link from 'next/link';

export default function ReposPage({ repos }) {
  console.log(repos);
  return (
    <>
      <div className="flex items-center justify-between">
        <h1>Repos</h1>
        <div>
          <Link className="text-blue-600 underline" href="/repos/create">
            Create
          </Link>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  const repos = await got('https://api.mimir.test/api/repos', {
    headers: {
      Accept: 'application/json',
    },
    https: {
      rejectUnauthorized: false,
    },
  }).json();
  return {
    props: {
      repos,
    },
  };
}
