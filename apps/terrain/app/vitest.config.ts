import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@engine': path.resolve(__dirname, '../../../engine'),
      '@engine-services': path.resolve(__dirname, '../../../engine/services'),
      '@llm': path.resolve(__dirname, '../../../llm'),
      '@domains': path.resolve(__dirname, '../../../domains'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
