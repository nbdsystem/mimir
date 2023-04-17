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

function Table({ columns, rows, renderRow, ...rest }) {
  return (
    <table {...rest} className="table w-full table-auto">
      <thead>
        <tr>
          {columns.map((column) => {
            return (
              <th key={column} className="border border-black p-2 text-left">
                {column}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          return renderRow(row);
        })}
      </tbody>
    </table>
  );
}

function TableRow({ children, ...rest }) {
  return <tr {...rest}>{children}</tr>;
}

function TableCell({ children, ...rest }) {
  return (
    <td {...rest} className="border border-black p-2">
      {children}
    </td>
  );
}

function Stack({ children }) {
  return <div className="flex flex-col gap-y-8">{children}</div>;
}

export default function QueuePage() {
  return (
    <>
      <main className="p-4">
        <h1 className="text-xl font-bold ">Queue</h1>
        <Stack>
          <Query
            fallback={<p>Loading...</p>}
            queryKey="queue"
            queryFn={fetchQueue}
          >
            {(data) => {
              let queued = 0;
              let pending = 0;
              let failed = 0;

              for (const job of data) {
                if (job.state === 'queued') {
                  queued += 1;
                }
                if (job.state === 'pending') {
                  pending += 1;
                }
                if (job.state === 'failed') {
                  failed += 1;
                }
              }

              return (
                <Stack>
                  <div className="flex gap-x-5">
                    <div>
                      <div>Queued</div>
                      <div>{queued}</div>
                    </div>
                    <div>
                      <div>Pending</div>
                      <div>{pending}</div>
                    </div>
                    <div>
                      <div>Failed</div>
                      <div>{failed}</div>
                    </div>
                  </div>

                  <section>
                    <h2 id="pending-title" className="text-xl font-bold">
                      Pending
                    </h2>
                    <Table
                      aria-labelledby="pending-title"
                      columns={['id', 'Name', 'Arguments']}
                      rows={data.filter((row) => row.state === 'pending')}
                      renderRow={(row) => {
                        return (
                          <TableRow key={row.id}>
                            <TableCell>{row.id}</TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>{row.args.join(', ')}</TableCell>
                          </TableRow>
                        );
                      }}
                    />
                  </section>

                  <section>
                    <h2 id="failed-title" className="text-xl font-bold">
                      Failed
                    </h2>
                    <Table
                      aria-labelledby="failed-title"
                      columns={['id', 'Name', 'Error']}
                      rows={data.filter((row) => row.state === 'failed')}
                      renderRow={(row) => {
                        return (
                          <TableRow key={row.id}>
                            <TableCell>{row.id}</TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>
                              <pre>
                                <code>{row.error}</code>
                              </pre>
                            </TableCell>
                          </TableRow>
                        );
                      }}
                    />
                  </section>
                </Stack>
              );
            }}
          </Query>

          <section>
            <h2 id="workers-title" className="text-xl font-bold">
              Workers
            </h2>
            <Query
              fallback={<p>Loading...</p>}
              queryKey="workers"
              queryFn={fetchWorkers}
            >
              {(data) => {
                return (
                  <Table
                    columns={['id', 'state']}
                    rows={data}
                    renderRow={(row) => {
                      return (
                        <TableRow key={row.id}>
                          <TableCell>{row.id}</TableCell>
                          <TableCell>{row.state}</TableCell>
                        </TableRow>
                      );
                    }}
                  />
                );
              }}
            </Query>
          </section>
        </Stack>
      </main>
    </>
  );
}
