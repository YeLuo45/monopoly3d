import { defineConfig } from '/home/hermes/harness-desktop/node_modules/vitest/dist/config.js';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
  },
});
