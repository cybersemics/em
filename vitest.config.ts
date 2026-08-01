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
          // .claude/worktrees holds agent worktrees, i.e. full checkouts of this repo. Without this the
          // unanchored include glob collects their __tests__ files too, which fail to resolve the gitignored
          // styled-system/ imports unless PandaCSS happens to have been run in that worktree.
          exclude: ['node_modules/**', '**/e2e/**', '.claude/**'],
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
