import got from 'got';
import { post } from '../../../router';

export default post(async (req, res) => {
  // const response = await got
  // .post('https://api.mimir.test/api/repos', {
  // body: JSON.stringify(req.body),
  // headers: {
  // Accept: 'application/json',
  // 'Content-Type': 'application/json',
  // },
  // https: {
  // rejectUnauthorized: false,
  // },
  // })
  // .json();

  res.json({ message: 'ok' });
});
