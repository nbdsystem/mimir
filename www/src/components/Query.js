import { useQuery } from 'react-query';

export function Query({ children, fallback, ...config }) {
  const info = useQuery(config);

  if (info.isError) {
    throw info.error;
  }

  if (info.isLoading) {
    return fallback;
  }

  return children(info.data);
}
