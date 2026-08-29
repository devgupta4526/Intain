import { defineConfig } from 'vitest/config';

process.env.DATABASE_PATH = './data/veritas-test.db';

export default defineConfig({
  test: { environment: 'node', fileParallelism: false, sequence: { concurrent: false } },
});

