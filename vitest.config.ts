import { createRequire } from 'node:module'
import Terminal from 'vite-plugin-terminal'
import { defineConfig } from 'vitest/config'

const puppeteerMaxWorkers = Number(process.env.PUPPETEER_MAX_WORKERS || 2)
const require = createRequire(import.meta.url)

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
          // .claude/worktrees holds agent worktrees, i.e. full checkouts of this repo. Without this the
          // unanchored include glob collects their __tests__ files too, which fail to resolve the gitignored
          // styled-system/ imports unless PandaCSS happens to have been run in that worktree.
          exclude: ['node_modules/**', '**/e2e/**', '**/evals/**', '.claude/**'],
          environment: 'jsdom',
          mockReset: false,
          // vitest-localstorage-mock provides an in-test localStorage/sessionStorage mock. Note it does NOT
          // by itself prevent the intermittent `ReferenceError: localStorage is not defined` (#3345), which is
          // a teardown race handled by the persistent global-prototype fallback installed in src/setupTests.ts.
          // Pre-resolve the bare specifier: vitest resolves setupFiles against the project root's *parent*
          // directory chain, so inside an agent worktree (.claude/worktrees/*) it finds the outer checkout's
          // copy first, which then fails vite's outside-root import check and breaks every unit test.
          setupFiles: [require.resolve('vitest-localstorage-mock'), 'src/setupTests.ts'],
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
      {
        extends: './vite.config.ts',
        plugins: [],
        test: {
          name: 'eval',
          globals: true,
          include: ['packages/ai/src/evals/**/*.ts'],
          environment: 'node',
          retry: 2,
          testTimeout: 60_000,
        },
      },
      // iOS tests are now run with WDIO test runner
      // Use: yarn test:ios:local (local Appium) or yarn test:ios:browserstack
    ],
  },
})
