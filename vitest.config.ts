import Terminal from 'vite-plugin-terminal'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        extends: './vite.config.ts',
        test: {
          name: 'unit',
          globals: true,
          include: ['**/__tests__/**/*.ts'],
          exclude: ['node_modules/**', '**/e2e/**', 'packages/**'],
          environment: 'jsdom',
          mockReset: false,
          // localStorage is mocked by vitest-localstorage-mock first before setupTests.js runs.
          // This is done to ensure that localStorage is always defined (especially in CI environment).
          setupFiles: ['vitest-localstorage-mock', 'src/setupTests.js'],
        },
      },
      {
        extends: './vite.config.ts',
        test: {
          name: 'puppeteer-e2e',
          globals: true,
          include: ['src/e2e/puppeteer/__tests__/*.ts'],
          exclude: ['node_modules/**'],
          environment: './src/e2e/puppeteer-environment.ts',
          setupFiles: ['./src/e2e/puppeteer/setup.ts'],
        },
        plugins: [
          Terminal({
            console: 'terminal',
            output: ['terminal', 'console'],
          }),
        ],
      },
      // iOS tests are now run with WDIO test runner
      // Use: yarn test:ios:local (local Appium) or yarn test:ios:browserstack
    ],
  },
})
