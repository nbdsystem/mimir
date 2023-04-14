import os from 'node:os';
import { Worker as NativeWorker } from 'node:worker_threads';
import * as WorkerEvent from './events.js';

const TaskInfo = Symbol('TaskInfo');

export class Worker {
  static create(filename, options) {
    return new Worker(filename, options);
  }

  constructor(filename, { supportedMethods } = {}) {
    this.filename = filename.toString();
    this.worker = new NativeWorker(new URL('./worker.js', import.meta.url));

    this.worker.on('message', (message) => {
      if (this.worker[TaskInfo]) {
        if (message.type === WorkerEvent.SUCCESS) {
          this.worker[TaskInfo].resolve(message.value);
        } else {
          this.worker[TaskInfo].reject(message.reason);
        }
        this.worker[TaskInfo] = null;
      }
    });

    this.worker.on('error', (error) => {
      if (this.worker[TaskInfo]) {
        this.worker[TaskInfo].reject(error);
        this.worker[TaskInfo] = null;
      } else {
        throw error;
      }
    });

    this.worker.postMessage({
      type: WorkerEvent.START,
      filename: this.filename,
    });

    return new Proxy(this, {
      get(target, prop) {
        if (supportedMethods.includes(prop)) {
          return function (...args) {
            return target.execute.apply(target, [prop, ...args]);
          };
        }
        return Reflect.get(target, prop);
      },
    });
  }

  execute(method, ...args) {
    return new Promise((resolve, reject) => {
      this.worker[TaskInfo] = {
        resolve,
        reject,
      };
      this.worker.postMessage({
        type: WorkerEvent.CALL,
        filename: this.filename,
        method,
        args,
      });
    });
  }

  terminate() {
    return this.worker.terminate();
  }
}

const defaultNumWorkers = os.availableParallelism() - 1;

export class Pool {
  static create(filename, options) {
    return new Pool(filename, options);
  }

  constructor(
    filename,
    { numWorkers = defaultNumWorkers, supportedMethods } = {},
  ) {
    this.filename = filename.toString();
    this.numWorkers = numWorkers;
    this.workerOptions = {
      supportedMethods,
    };
    this.workers = [];
    this.availableWorkers = [];
    this.queue = [];

    for (let i = 0; i < this.numWorkers; i++) {
      this.spawnWorker();
    }

    return new Proxy(this, {
      get(target, prop) {
        if (supportedMethods.includes(prop)) {
          return function (...args) {
            return new Promise((resolve, reject) => {
              this.queue.push([prop, args, resolve, reject]);
              return target.execute.call(target);
            });
          };
        }
        return Reflect.get(target, prop);
      },
    });
  }

  async execute() {
    if (this.availableWorkers.length === 0 || this.queue.length === 0) {
      return;
    }

    const worker = this.availableWorkers.shift();
    const [method, args, resolve, reject] = this.queue.shift();

    try {
      const result = await worker.execute(method, ...args);
      resolve(result);
    } catch (error) {
      reject(error);
    }

    this.availableWorkers.push(worker);
    if (this.queue.length > 0) {
      this.execute();
    }
  }

  spawnWorker() {
    const worker = new Worker(this.filename, this.workerOptions);

    this.workers.push(worker);
    this.availableWorkers.push(worker);
  }

  close() {
    return Promise.all(this.workers.map((worker) => worker.terminate()));
  }
}
