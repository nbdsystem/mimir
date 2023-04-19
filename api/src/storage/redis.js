import config from 'config';
import Redis from 'ioredis';

const connectionString = config.get('REDIS_URL');
let client = null;

export function get() {
  if (client === null) {
    client = new Redis(connectionString);
  }
  return client;
}
