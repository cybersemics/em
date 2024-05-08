import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: './vite.config.ts',
    test: {
      name: 'unit',
      globals: true,
      include: ['**/__tests__/**/*.ts'],
      exclude: ['node_modules/**', '**/e2e/**'],
      environment: 'happy-dom',
      mockReset: false,
      setupFiles: ['src/setupTests.js'],
    },
  },
])
