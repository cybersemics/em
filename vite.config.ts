import react from '@vitejs/plugin-react'
import fs from 'fs'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import { createHtmlPlugin } from 'vite-plugin-html'
import { VitePWA } from 'vite-plugin-pwa'

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
  plugins: [
    react(),
    // Do not run vite-plugin-checker during tests, as it will clear the test output.
    // The dev server is usually running anyway, and tsc is run in lint:tsc which is triggered prepush.
    ...[!process.env.VITEST && !process.env.PUPPETEER ? checker({ typescript: true }) : undefined],
    VitePWA({ injectRegister: null, strategies: 'injectManifest', srcDir: 'src', filename: 'service-worker.ts' }),
    // minify and add EJS capabilities to index.html
    createHtmlPlugin({ minify: true }),
  ],
  ...(process.env.PUPPETEER
    ? {
        // Serve the dev server over HTTPS in puppeteer tests to enable clipboard access
        server: {
          https: {
            key: fs.readFileSync('./src/e2e/puppeteer/puppeteer-key.pem'),
            cert: fs.readFileSync('./src/e2e/puppeteer/puppeteer.pem'),
          },
          // Disable HMR in puppeteer tests to not interrupt running tests
          hmr: false,
        },
      }
    : {}),
})
