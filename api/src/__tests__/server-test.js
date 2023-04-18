import request from 'supertest';
import { setup } from '../server.js';

describe('server', () => {
  let app;

  beforeEach(() => {
    app = setup();
  });

  test('GET /', async () => {
    const response = await request(app).get('/').expect(200);
    expect(response.text).toEqual('Hello World');
  });
});
