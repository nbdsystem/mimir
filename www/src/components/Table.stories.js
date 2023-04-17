import { Table, TableCell, TableRow } from './Table';

export default {
  component: Table,
  subcomponents: { TableRow, TableCell },
};

export const Default = {
  render: () => {
    return <Table columns={['Column A', 'Column B', 'Column C']} rows={[]} />;
  },
};
