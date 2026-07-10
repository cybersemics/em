import { defineConfig } from 'vitest/config'

/*
 * Vitest config for live inference tests (e.g. src/commands/__tests__/generateThought.live.ts).
 *
 * These tests hit the real AI server configured via VITE_AI_URL and are therefore kept out of the normal
 * unit run (see vitest.config.ts). Run them explicitly with `yarn test:live` or via the manually-triggered
 * "Test AI (Live)" GitHub Actions workflow.
 */
export default defineConfig({
  test: {
    projects: [
      {
        extends: './vite.config.ts',
        test: {
          name: 'live',
          globals: true,
          include: ['**/__tests__/**/*.live.ts'],
          exclude: ['node_modules/**'],
          environment: 'jsdom',
          mockReset: false,
          // localStorage is mocked by vitest-localstorage-mock first before setupTests.js runs.
          // This is done to ensure that localStorage is always defined (especially in CI environment).
          setupFiles: ['vitest-localstorage-mock', 'src/setupTests.js'],
        },
      },
    ],
  },
})
