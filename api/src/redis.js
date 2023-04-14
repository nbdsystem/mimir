import Redis from 'ioredis';

let client = null;

export function get() {
  if (client === null) {
    client = new Redis();
  }
  return client;
}
