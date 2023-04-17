import { BackgroundJob } from './BackgroundJob/BackgroundJob.js';
import * as redis from './redis.js';

let backgroundJob = null;

function get() {
  if (backgroundJob === null) {
    const client = redis.get();
    backgroundJob = BackgroundJob.create(client);
  }

  return backgroundJob;
}

const Singleton = new Proxy(
  {},
  {
    get(target, prop) {
      const backgroundJob = get();
      return backgroundJob[prop];
    },
  },
);

export { Singleton as BackgroundJob };
