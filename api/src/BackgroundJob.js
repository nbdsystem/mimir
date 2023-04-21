import { BackgroundJob } from './BackgroundJob/BackgroundJob.js';

let backgroundJob = null;

function get() {
  if (backgroundJob === null) {
    backgroundJob = BackgroundJob.create();
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
