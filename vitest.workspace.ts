import Terminal from 'vite-plugin-terminal'
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: './vite.config.ts',
    test: {
      name: 'unit',
      globals: true,
      include: ['**/__tests__/**/*.ts'],
      exclude: ['node_modules/**', '**/e2e/**', 'packages/**'],
      environment: 'jsdom',
      mockReset: false,
      setupFiles: ['src/setupTests.js'],
      deps: {
        optimizer: {
          web: {
            include: ['vitest-canvas-mock'],
          },
        },
      },
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
  },
  {
    extends: './vite.config.ts',
    test: {
      name: 'ios-appium',
      globals: true,
      include: ['src/e2e/iOS/__tests__/split.ts'],
      exclude: ['node_modules/**'],
      environment: './src/e2e/webdriverio-environment.ts',
      retry: 0,
      testTimeout: 90000,
      hookTimeout: 90000,
      environmentOptions: {
        target: 'appium',
      },
    },
    plugins: [
      Terminal({
        console: 'terminal',
        output: ['terminal', 'console'],
      }),
    ],
  },
  {
    extends: './vite.config.ts',
    test: {
      name: 'ios-browserstack',
      globals: true,
      include: ['src/e2e/iOS/__tests__/split.ts'],
      exclude: ['node_modules/**'],
      environment: './src/e2e/webdriverio-environment.ts',
      retry: 0,
      testTimeout: 90000,
      hookTimeout: 90000,
      environmentOptions: {
        target: 'browserstack',
      },
    },
    plugins: [
      Terminal({
        console: 'terminal',
        output: ['terminal', 'console'],
      }),
    ],
  },
])
