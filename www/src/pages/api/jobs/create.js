import got from 'got';

export default async function handler(req, res) {
  console.log('hi');
  if (req.method !== 'POST') {
    res.status(404).send('Not found');
    return;
  }

  await got.post('http://0.0.0.0:4000/api/jobs/packages', {
    json: {
      name: '@carbon/react',
    },
  });

  res.redirect('/jobs');
}
