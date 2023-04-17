function post(handler) {
  return (req, res) => {
    if (req.method === 'POST') {
      return handler(req, res);
    }
    res.status(404).send('Not found');
  };
}

export default post(async (req, res) => {
  res.json({ status: 'ok' });
});
