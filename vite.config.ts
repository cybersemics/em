/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
  },
  build: {
    outDir: 'build',
  },
  plugins: [react()],
  test: {
    globals: true,
    include: ['**/__tests__/**/*.ts'],
    exclude: ['node_modules/**', '**/e2e/**'],
    environment: 'happy-dom',
    mockReset: false,
    setupFiles: ['src/setupTests.js'],
  },
})
