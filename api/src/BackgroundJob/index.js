import * as redis from '../redis.js';
import { BackgroundJob } from './BackgroundJob.js';

let backgroundJob = null;

export function get() {
  if (backgroundJob === null) {
    const client = redis.get();
    backgroundJob = BackgroundJob.create(client);
  }

  return backgroundJob;
}
