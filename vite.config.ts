import { treecrdt } from '@treecrdt/wa-sqlite/vite-plugin'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import type { IncomingMessage, ServerResponse } from 'http'
import path from 'path'
import { type Plugin, type PreviewServer, type ViteDevServer, defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import { createHtmlPlugin } from 'vite-plugin-html'
import { VitePWA } from 'vite-plugin-pwa'

const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

const useHttps = !process.env.HTTP

/** Resolve the short git commit hash of the current build, injected into the app via `define`. Prefers Vercel's build-time env var, falls back to git, then to 'unknown'. */
const commitHash = (() => {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
})()

/**
 * Vite plugin that gates access behind a secret token when TUNNEL_TOKEN is set.
 * Used in CI to prevent unauthorized access when the dev server is exposed via
 * a public cloudflared tunnel. The first request must include ?__token=<secret>;
 * the gate then sets a session cookie so subsequent asset/HMR requests are
 * allowed without the query param. Requests with neither get a 403.
 */
function tunnelTokenGate(): Plugin | undefined {
  const token = process.env.TUNNEL_TOKEN
  if (!token) return undefined

  const cookieName = '__tunnel_token'

  /** Middleware that allows requests bearing a valid token (via cookie or query param) and rejects all others. */
  const gate = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
      // Unauthenticated occupancy probe, answered before the token check. A run about to claim a
      // Cloudflare tunnel needs to know whether anyone is already answering on that hostname, and
      // it can't authenticate as whoever that would be. Deliberately exposes nothing but the CI run
      // id, which is already public in the workflow logs. See checkOccupancy in
      // src/e2e/iOS/config/cloudflareTunnelPool.ts.
      if ((req.url || '').split('?')[0] === '/__tunnel-status') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ em: true, run: process.env.GITHUB_RUN_ID || '' }))
        return
      }
      // Accept an existing session cookie set on a previous authenticated request.
      const cookieHeader = req.headers.cookie || ''
      if (cookieHeader.split(';').some(c => c.trim() === `${cookieName}=${token}`)) {
        return next()
      }
      // Accept a token in the URL and issue the session cookie.
      const url = new URL(req.url || '/', 'http://localhost')
      if (url.searchParams.get('__token') === token) {
        res.setHeader('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=None`)
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
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // Avoid crawling stale local checkout directories left behind after removing the TreeCRDT submodule.
    entries: ['index.html'],
  },
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  plugins: [
    react(),
    treecrdt({ outDir: 'public/wa-sqlite' }),
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
        globPatterns: ['**/*.{js,css,html,webp,woff2}'],
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
          {
            src: 'android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
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
    // Allow bs-local.com for BrowserStack local testing, and the Cloudflare tunnel pool's
    // hostnames (leading dot matches all *.emthought.cc subdomains) for BrowserStack iOS Safari.
    allowedHosts: ['bs-local.com', '.emthought.cc'],
    ...(process.env.PUPPETEER
      ? {
          hmr: {
            host: 'host.docker.internal',
            // wss uses a secure websocket(wss://) connection. This was necessary to resolve mixed content security error which was observed when using ws protocol only.
            protocol: 'wss',
          },
        }
      : {}),
    headers: crossOriginIsolationHeaders,
  },
  preview: {
    headers: crossOriginIsolationHeaders,
    allowedHosts: ['.emthought.cc'],
  },
})
