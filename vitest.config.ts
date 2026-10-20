import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// `resolve.tsconfigPaths` is not used: the explicit alias matches the tsconfig
// `@/*` mapping on every Vite version this project can install.
export const alias = {
  '@': fileURLToPath(new URL('./', import.meta.url)),
  'server-only': fileURLToPath(new URL('./test/stubs/server-only.ts', import.meta.url)),
};

// Vite 8 transforms with Oxc instead of esbuild, so the JSX runtime is explicit.
export const oxcOptions = { jsx: { runtime: 'automatic' as const } };

export default defineConfig({
  resolve: { alias },
  oxc: oxcOptions,
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
