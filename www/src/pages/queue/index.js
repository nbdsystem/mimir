import { formatDistance, formatDistanceToNow } from 'date-fns';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { Page } from '../../components/Page';
import { PageFooter } from '../../components/PageFooter';
import { PageHeader } from '../../components/PageHeader';
import { Query } from '../../components/Query';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '../../components/Tabs';
import { Text } from '../../components/Text';

export default function QueuePage() {
  const states = [
    {
      heading: 'Queued',
      state: 'queued',
      queryFn: fetchQueuedJobs,
    },
    {
      heading: 'Pending',
      state: 'pending',
      queryFn: fetchPendingJobs,
    },
    {
      heading: 'Failed',
      state: 'failed',
      queryFn: fetchFailedJobs,
    },
    {
      heading: 'Completed',
      state: 'completed',
      queryFn: fetchCompletedJobs,
    },
  ];

  return (
    <Page>
      <PageHeader />
      <main className="container mx-auto px-4 py-8">
        <Text asChild token="heading-01">
          <h1 className="mb-6">Queue</h1>
        </Text>
        <div>
          <Tabs>
            <TabList>
              <Tab>Queued</Tab>
              <Tab>Pending</Tab>
              <Tab>Failed</Tab>
              <Tab>Completed</Tab>
            </TabList>
            <TabPanels>
              {states.map((state) => {
                return (
                  <TabPanel className="py-4" key={state.state}>
                    <ErrorBoundary
                      fallback={<p>Error loading {state.state}</p>}
                    >
                      <Query
                        queryKey={state.state}
                        queryFn={state.queryFn}
                        refetchInterval={1000}
                        fallback={<p>Loading {state.state}...</p>}
                      >
                        {(data) => {
                          return (
                            <>
                              <h2 className="mb-4 flex items-center gap-x-2 px-4 text-2xl">
                                {state.heading}{' '}
                                <span className="text-sm text-gray-500">
                                  ({data.length})
                                </span>
                              </h2>
                              {data.length > 0 ? (
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Name</th>
                                      <th>State</th>
                                      <th>Duration</th>
                                      <th>Parameters</th>
                                      <th>Message</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {data.map((job) => {
                                      return (
                                        <tr key={job.id}>
                                          <td>{job.name}</td>
                                          <td>{job.state}</td>
                                          <td>
                                            {job.state === 'completed'
                                              ? formatDistance(
                                                  new Date(job.createdAt),
                                                  new Date(job.updatedAt),
                                                )
                                              : formatDistanceToNow(
                                                  new Date(job.createdAt),
                                                )}
                                          </td>
                                          <td>
                                            <ul>
                                              {job.args.map((arg, index) => {
                                                return (
                                                  <li key={index}>{arg}</li>
                                                );
                                              })}
                                            </ul>
                                          </td>
                                          <td></td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              ) : (
                                <p>No {state.state} jobs</p>
                              )}
                            </>
                          );
                        }}
                      </Query>
                    </ErrorBoundary>
                  </TabPanel>
                );
              })}
            </TabPanels>
          </Tabs>
        </div>
        <div className="flex flex-col gap-y-12">
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

async function fetchQueuedJobs() {
  const response = await fetch('/api/queue/jobs/queued');
  const json = await response.json();
  return json;
}

async function fetchPendingJobs() {
  const response = await fetch('/api/queue/jobs/pending');
  const json = await response.json();
  return json;
}

async function fetchFailedJobs() {
  const response = await fetch('/api/queue/jobs/failed');
  const json = await response.json();
  return json;
}

async function fetchCompletedJobs() {
  const response = await fetch('/api/queue/jobs/completed');
  const json = await response.json();
  return json;
}

async function fetchWorkers() {
  const response = await fetch('/api/queue/workers');
  const json = await response.json();
  return json;
}
