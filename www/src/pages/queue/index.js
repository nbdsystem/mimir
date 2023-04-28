import { formatDistanceToNow } from 'date-fns';
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
      <main className="container mx-auto px-4 py-8">
        <Text asChild token="heading-01">
          <h1 className="mb-6">Queue</h1>
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
                const now = new Date();
                return (
                  <section>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-2xl">Jobs</h2>
                      <div className="flex flex-col items-end text-xs text-gray-500">
                        Last updated
                        <span className="text-xs">
                          {formatDistanceToNow(now, {
                            includeSeconds: true,
                          })}
                        </span>
                      </div>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>State</th>
                          <th>Duration</th>
                          <th>Message</th>
                          <th>Parameters</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((job) => {
                          return (
                            <tr key={job.id}>
                              <td>{job.name}</td>
                              <td className="text-gray-500">{job.state}</td>
                              <td className="text-gray-500">
                                {job.createdAt
                                  ? formatDistanceToNow(new Date(job.createdAt))
                                  : null}
                              </td>
                              <td>
                                {job.state === 'failed' ? job.error : null}
                              </td>
                              <td className="text-gray-500">
                                {job.args?.join(', ')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
                const now = new Date();
                return (
                  <section>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-2xl">Workers</h2>
                      <div className="flex flex-col items-end text-xs text-gray-500">
                        Last updated
                        <span className="text-xs">
                          {formatDistanceToNow(now, {
                            includeSeconds: true,
                          })}
                        </span>
                      </div>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>State</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((worker) => {
                          return (
                            <tr key={worker.id}>
                              <td>{worker.id}</td>
                              <td>{worker.state}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
