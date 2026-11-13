/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Stamps every production build with a build id so open clients can detect a
 * redeploy and reload themselves (see src/utils/appVersion.ts):
 *  - replaces __APP_BUILD_TIME__ in index.html (<meta name="app-build-time">)
 *  - emits dist/version.json ({ buildTime, deployId })
 * entrypoint.sh later refines deployId per deployment (build + runtime env), so a
 * config-only redeploy is detected too.
 */
const appVersionPlugin = (): Plugin => {
  const buildTime = String(Date.now());
  return {
    name: 'app-version',
    transformIndexHtml: (html) => html.replace(/__APP_BUILD_TIME__/g, buildTime),
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildTime, deployId: buildTime }),
      });
    },
  };
};

export default defineConfig({
  plugins: [react(), appVersionPlugin()],
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
