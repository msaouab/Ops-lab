/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths + hash routing: the build works from any folder,
  // including a GitHub Pages project URL (/ops-lab/).
  base: './',
  // The Algorithms track reads its tests from ../A2-online-test.
  server: { fs: { allow: ['..'] } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
