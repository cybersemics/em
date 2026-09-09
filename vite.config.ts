import { treecrdt } from '@treecrdt/wa-sqlite/vite-plugin'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { randomBytes } from 'crypto'
import path from 'path'
import { type Plugin, defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import { createHtmlPlugin } from 'vite-plugin-html'
import { VitePWA } from 'vite-plugin-pwa'
import tunnelTokenGateMiddleware from './src/vite-middleware/tunnelTokenGate'

const useHttps = !process.env.HTTP

// The Cloudflare tunnel pool (cloudflareTunnelPool.ts) lives entirely under this domain. It is the
// single signal tunnelTokenGate keys on — a request that arrived through the tunnel always carries
// one of these hostnames as its authority — and Vite's allowedHosts must admit the same names.
const TUNNEL_HOST_SUFFIX = '.emthought.cc'

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
 * Vite plugin that gates the Cloudflare tunnel's public hostnames behind a secret token, so
 * exposing the dev server via cloudflared (for BrowserStack iOS Safari) never exposes it to the
 * public internet. Only requests whose authority is under TUNNEL_HOST_SUFFIX are gated; localhost,
 * LAN IPs, and bs-local.com pass untouched. The first tunneled request must include
 * ?__token=<secret>; the gate then sets a session cookie so subsequent asset/HMR requests are
 * allowed without the query param. Requests with neither get a 403.
 *
 * The token needs no setup: CI generates a per-run secret and exports it to both this server and
 * the test runner (ios.yml, tdd.yml), while locally the server generates its own and the iOS test
 * runner discovers it over loopback via /__tunnel-token (wdio.browserstack.conf.ts). The gate
 * must be active on every server the pool might route to even when no token was provided —
 * cloudflareTunnelPool.ts proves a claimed tunnel routes to this run's server by expecting foreign
 * tokens to 403, and an ungated server would 200 them all.
 *
 * Vite's HTML middleware runs first and rewrites `req.url` to `/index.html` for
 * browser navigations, dropping `?__token=`. The gate itself reads `originalUrl`
 * (see src/vite-middleware/tunnelTokenGate.ts).
 */
function tunnelTokenGate(): Plugin {
  const token = process.env.TUNNEL_TOKEN || randomBytes(16).toString('hex')

  const gate = tunnelTokenGateMiddleware(token, TUNNEL_HOST_SUFFIX)

  return {
    name: 'tunnel-token-gate',
    configureServer(server) {
      server.middlewares.use(gate)
    },
    configurePreviewServer(server) {
      server.middlewares.use(gate)
    },
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
        globPatterns: ['**/*.{js,mjs,wasm,css,html,webp,woff2}'],
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
    // Gate the cloudflared tunnel hostnames behind a token; all other authorities pass ungated.
    tunnelTokenGate(),
  ],
  server: {
    // Allow bs-local.com for BrowserStack local testing, and the Cloudflare tunnel pool's
    // hostnames (leading dot matches all subdomains) for BrowserStack iOS Safari.
    allowedHosts: ['bs-local.com', TUNNEL_HOST_SUFFIX],
    watch: {
      // Agent worktrees live in .claude/worktrees and are full checkouts of the repo. Creating or
      // updating one writes files the watcher would otherwise pick up — a nested tsconfig.json in
      // particular makes Vite clear its cache and force a full reload. Nothing under .claude is app
      // source, so exclude the whole directory. Appended to Vite's defaults (.git, node_modules,
      // test-results, cacheDir), not a replacement for them.
      ignored: ['**/.claude/**'],
    },
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
  preview: {
    // `yarn servebuild` (vite preview) is what ios.yml/tdd.yml actually run behind the tunnel —
    // preview.allowedHosts doesn't inherit server.allowedHosts, so it needs its own entry too.
    allowedHosts: [TUNNEL_HOST_SUFFIX],
  },
})
