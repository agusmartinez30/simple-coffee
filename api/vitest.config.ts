import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'prisma/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    environment: 'node',
  },
  plugins: [
    // SWC emits decorator metadata, which esbuild does not; Nest DI depends on it.
    swc.vite({ module: { type: 'es6' } }),
  ],
});
