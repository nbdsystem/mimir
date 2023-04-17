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

export { Table, TableRow, TableCell };
