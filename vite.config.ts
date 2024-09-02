import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import { createHtmlPlugin } from 'vite-plugin-html'
import mkcert from 'vite-plugin-mkcert'
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
    // Generate SSL certificate for local development
    // This is required to access the clipboard in Puppeteer.
    process.env.PUPPETEER ? mkcert() : undefined,
    react(),
    // Do not run vite-plugin-checker during tests, as it will clear the test output.
    // The dev server is usually running anyway, and tsc is run in lint:tsc which is triggered prepush.
    ...[!process.env.VITEST && !process.env.PUPPETEER ? checker({ typescript: true }) : undefined],
    VitePWA({ injectRegister: null, strategies: 'injectManifest', srcDir: 'src', filename: 'service-worker.ts' }),
    // minify and add EJS capabilities to index.html
    createHtmlPlugin({ minify: true }),
  ],
})
