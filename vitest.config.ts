import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
      '@': path.resolve(__dirname, './app'),
      '~~': path.resolve(__dirname, './'),
      '@@': path.resolve(__dirname, './'),
      'shared': path.resolve(__dirname, './shared'),
      'server': path.resolve(__dirname, './server'),
    },
  },
});
