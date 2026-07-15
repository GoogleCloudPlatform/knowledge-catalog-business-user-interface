/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // use global test APIs like `describe`, `it`, etc.
    environment: 'jsdom', // simulate DOM
    setupFiles: './test/setup.ts', // custom setup (like importing jest-dom)
    include: ['src/**/**/*.test.{ts,tsx}'], // test file patterns
    css: true, // Enable CSS processing in tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        'src/mocks/**',
        'src/types/**',
        'src/constants/**',
        '**/DataProductsTypes.ts',
        'src/component/TableInsights/index.tsx',
      ],
      reportsDirectory: './coverage',
      clean: false,
      cleanOnRerun: false,
      reportOnFailure: true,
    },
  },
});
