import { ErrorBoundary } from '../../components/ErrorBoundary';
import { Page } from '../../components/Page';
import { PageFooter } from '../../components/PageFooter';
import { PageHeader } from '../../components/PageHeader';
import { Query } from '../../components/Query';
import { Text } from '../../components/Text';

async function fetchJobs() {
  const response = await fetch('/api/queue/jobs');
  const json = await response.json();
  return json;
}

async function fetchWorkers() {
  const response = await fetch('/api/queue/workers');
  const json = await response.json();
  return json;
}

export default function QueuePage() {
  return (
    <Page>
      <PageHeader />
      <main className="container mx-auto pt-8">
        <Text asChild token="heading-01">
          <h1>Queue</h1>
        </Text>
        <div className="flex flex-col gap-y-12">
          <ErrorBoundary fallback={<p>Error loading jobs</p>}>
            <Query
              queryKey="jobs"
              queryFn={fetchJobs}
              refetchInterval={1000}
              fallback={<p>Loading queue...</p>}
            >
              {(data) => {
                console.log(data);
                return (
                  <section>
                    <h2>Jobs</h2>
                  </section>
                );
              }}
            </Query>
          </ErrorBoundary>
          <ErrorBoundary fallback={<p>Error loading workers</p>}>
            <Query
              queryKey="workers"
              queryFn={fetchWorkers}
              refetchInterval={1000}
              fallback={<p>Loading workers...</p>}
            >
              {(data) => {
                console.log(data);
                return (
                  <section>
                    <h2>Workers</h2>
                  </section>
                );
              }}
            </Query>
          </ErrorBoundary>
        </div>
      </main>
      <PageFooter />
    </Page>
  );
}
