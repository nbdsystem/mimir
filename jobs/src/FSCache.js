import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.dirname(
  path.dirname(fileURLToPath(import.meta.url)),
);
const cacheDir = path.join(rootDirectory, '.cache');

export function getDirectory() {
  return cacheDir;
}
