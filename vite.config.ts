import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import { createHtmlPlugin } from 'vite-plugin-html'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      'webview-background': path.resolve(__dirname, 'packages/webview/dist/esm'),
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
    VitePWA({
      injectRegister: null,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // Increase limit to 4 MiB
        globPatterns: ['**/*.{js,css,html,webp}'],
      },
      manifest: {
        name: 'em',
        short_name: 'em',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon',
          },
        ],
        background_color: '#ffffff',
        display: 'standalone',
        theme_color: '#000000',
      },
    }),
    // minify and add EJS capabilities to index.html
    createHtmlPlugin({ minify: true }),
  ],
  server: {
    // Allow bs-local.com for BrowserStack local testing
    allowedHosts: ['bs-local.com'],
    ...(process.env.PUPPETEER
      ? {
          // Serve the dev server over HTTPS in puppeteer tests to enable clipboard access
          https: {
            key: fs.readFileSync('./src/e2e/puppeteer/puppeteer-key.pem'),
            cert: fs.readFileSync('./src/e2e/puppeteer/puppeteer.pem'),
          },
          // protocol `wss` is required to resolve websocket connection failure
          hmr: {
            host: 'host.docker.internal',
            // wss uses a secure websocket(wss://) connection. This was necessary to resolve mixed content security error which was observed when using ws protocol only.
            protocol: 'wss',
          },
        }
      : {}),
  },
})
