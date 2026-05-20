import { fileURLToPath } from 'url'
import type { Plugin } from 'vite'
import Terminal from 'vite-plugin-terminal'
import { defineConfig } from 'vitest/config'

const testThoughtspacePath = fileURLToPath(
  new URL('./src/data-providers/treecrdt/testThoughtspace.ts', import.meta.url),
)

/** Redirects unit tests to the in-memory provider without changing runtime or Puppeteer imports. */
const treecrdtTestThoughtspacePlugin = (): Plugin => ({
  name: 'treecrdt-test-thoughtspace',
  enforce: 'pre' as const,
  async resolveId(source: string, importer?: string) {
    if (!importer || !source.endsWith('thoughtspace')) return null

    const resolved = await this.resolve(source, importer, { skipSelf: true })
    return resolved?.id.split('?')[0].endsWith('/src/data-providers/treecrdt/thoughtspace.ts')
      ? testThoughtspacePath
      : null
  },
})

export default defineConfig({
  test: {
    projects: [
      {
        extends: './vite.config.ts',
        plugins: [treecrdtTestThoughtspacePlugin()],
        test: {
          name: 'unit',
          globals: true,
          include: ['**/__tests__/**/*.ts'],
          exclude: ['node_modules/**', '**/e2e/**'],
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
          // Browserless runs all Puppeteer files in one Chrome service. Unbounded file parallelism overloads
          // touch/focus handling and OPFS cleanup, so keep bounded parallelism instead of serializing the suite.
          maxWorkers: process.env.CI ? 2 : undefined,
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
