import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: './vite.config.ts',
    test: {
      name: 'unit',
      globals: true,
      include: ['**/__tests__/**/*.ts'],
      exclude: ['node_modules/**', '**/e2e/**'],
      environment: 'jsdom',
      mockReset: false,
      setupFiles: ['src/setupTests.js'],
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
    },
  },
])
