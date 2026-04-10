import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import crypto from 'crypto'
import path from 'path'
import { type Plugin, defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import { createHtmlPlugin } from 'vite-plugin-html'
import { VitePWA } from 'vite-plugin-pwa'

const useHttps = !process.env.HTTP

/**
 * Vite plugin that gates access behind a secret token when TUNNEL_TOKEN is set.
 * Used in CI to prevent unauthorized access when the dev server is exposed via
 * a public cloudflared tunnel. Requests without ?__token=<secret> get a 403.
 * The token is set in the CI workflow and appended to the tunnel URL by the
 * test config.
 */
function tunnelTokenGate(): Plugin | undefined {
  const token = process.env.TUNNEL_TOKEN
  if (!token) return undefined

  const gate = (server: { middlewares: { use: (fn: Function) => void } }) => {
    server.middlewares.use((req: { url?: string }, res: { statusCode: number; end: (s: string) => void }, next: () => void) => {
      const url = new URL(req.url || '/', 'http://localhost')
      if (url.searchParams.get('__token') === token) {
        return next()
      }
      res.statusCode = 403
      res.end('Forbidden')
    })
  }

  return {
    name: 'tunnel-token-gate',
    configureServer: gate,
    configurePreviewServer: gate,
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      'react-native': 'react-native-web',
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
    // Use HTTPS for dev server by default. Set HTTP=1 to disable.
    ...(useHttps ? [basicSsl()] : []),
    // Gate access behind a token when exposed via cloudflared tunnel in CI.
    tunnelTokenGate(),
  ],
  server: {
    // Allow bs-local.com for BrowserStack local testing
    allowedHosts: ['bs-local.com'],
    ...(process.env.PUPPETEER
      ? {
          hmr: {
            host: 'host.docker.internal',
            // wss uses a secure websocket(wss://) connection. This was necessary to resolve mixed content security error which was observed when using ws protocol only.
            protocol: 'wss',
          },
        }
      : {}),
  },
})
