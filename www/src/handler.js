export function get(handler) {
  return (req, res) => {
    if (req.method === 'GET') {
      return handler(req, res);
    }
    res.status(404).send('Not found');
  };
}
export function post(handler) {
  return (req, res) => {
    if (req.method === 'POST') {
      return handler(req, res);
    }
    res.status(404).send('Not found');
  };
}
