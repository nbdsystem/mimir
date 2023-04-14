import { useQuery } from 'react-query';

async function fetchQueue() {
  const response = await fetch('https://api.mimir.test/api/queue', {
    headers: {
      Accept: 'application/json',
    },
  });
  const json = await response.json();
  return json;
}

async function fetchWorkers() {
  const response = await fetch('https://api.mimir.test/api/queue/workers', {
    headers: {
      Accept: 'application/json',
    },
  });
  const json = await response.json();
  return json;
}

function Query({ children, fallback, queryKey, queryFn }) {
  const info = useQuery({
    queryKey,
    queryFn,
    refetchInterval: 1000,
  });

  if (info.isError) {
    throw info.error;
  }

  if (info.isLoading) {
    return fallback;
  }

  return children(info.data);
}

export default function QueuePage() {
  return (
    <>
      <main>
        <h1 className="text-xl font-bold ">Queue</h1>
        <Query
          fallback={<p>Loading...</p>}
          queryKey="queue"
          queryFn={fetchQueue}
        >
          {(data) => {
            return (
              <>
                <div className="flex gap-x-5">
                  <div>
                    <div>Queued</div>
                    <div>{data.queued.length}</div>
                  </div>
                  <div>
                    <div>In progress</div>
                    <div>{data.inProgress.length}</div>
                  </div>
                  <div>
                    <div>Failed</div>
                    <div>{data.failed.length}</div>
                  </div>
                </div>
                <table className="table text-left">
                  <caption>In Progress</caption>
                  <thead>
                    <tr>
                      <th>id</th>
                      <th>File</th>
                      <td>Arguments</td>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inProgress.map((row) => {
                      return (
                        <tr key={row.id}>
                          <td>{row.id}</td>
                          <td>{row.file}</td>
                          <td>{row.args.join(', ')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <table>
                  <caption>Failed</caption>
                  <thead>
                    <tr>
                      <th>id</th>
                      <th>File</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.failed.map((row) => {
                      return (
                        <tr key={row.id}>
                          <td>{row.id}</td>
                          <td>{row.state}</td>
                          <td>
                            <pre>
                              <code>{row.error}</code>
                            </pre>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            );
          }}
        </Query>

        <Query
          fallback={<p>Loading...</p>}
          queryKey="workers"
          queryFn={fetchWorkers}
        >
          {(data) => {
            return (
              <table>
                <caption>Workers</caption>
                <thead>
                  <tr>
                    <th>id</th>
                    <th>state</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => {
                    return (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.state}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          }}
        </Query>
      </main>
    </>
  );
}
