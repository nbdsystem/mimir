import { client } from '../../../api';
import { get } from '../../../handler';

export default get(async (req, res) => {
  const result = await client.get('/queue/workers');
  return res.json(result.data);
});
