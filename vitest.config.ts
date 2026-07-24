import Terminal from 'vite-plugin-terminal'
import { defineConfig } from 'vitest/config'

const puppeteerMaxWorkers = Number(process.env.PUPPETEER_MAX_WORKERS || 2)

export default defineConfig({
  test: {
    projects: [
      {
        extends: './vite.config.ts',
        plugins: [],
        test: {
          name: 'unit',
          globals: true,
          include: ['**/__tests__/**/*.ts'],
          exclude: ['node_modules/**', '**/e2e/**'],
          environment: 'jsdom',
          mockReset: false,
          // vitest-localstorage-mock provides an in-test localStorage/sessionStorage mock. Note it does NOT
          // by itself prevent the intermittent `ReferenceError: localStorage is not defined` (#3345), which is
          // a teardown race handled by the persistent global-prototype fallback installed in src/setupTests.js.
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
          // Browserless runs all Puppeteer files in one Chrome service. Unbounded file parallelism overloads
          // touch/focus handling and OPFS cleanup, so keep bounded parallelism instead of serializing the suite.
          maxWorkers: puppeteerMaxWorkers,
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
