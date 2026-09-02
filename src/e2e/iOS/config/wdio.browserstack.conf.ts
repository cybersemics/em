import { type ChildProcess } from 'child_process'
import dotenv from 'dotenv'
import http, { type IncomingMessage } from 'http'
import https from 'https'
import path from 'path'
import { findFirstAvailableTunnel, parseTunnelPool } from './cloudflareTunnelPool'
import baseConfig from './wdio.base.conf.js'

// Load .env.test.local before checking env vars since this file is imported
// at module load time, before vitest's automatic env loading kicks in
dotenv.config({ path: path.resolve(process.cwd(), '.env.test.local') })

// Validate environment variables
if (!process.env.BROWSERSTACK_USERNAME) {
  throw new Error('process.env.BROWSERSTACK_USERNAME not defined')
}
if (!process.env.BROWSERSTACK_ACCESS_KEY) {
  throw new Error('process.env.BROWSERSTACK_ACCESS_KEY not defined')
}

const user = process.env.BROWSERSTACK_USERNAME
const date = new Date().toISOString().slice(0, 10)

let tunnelProcess: ChildProcess | null = null

/**
 * Checks that a dev server is running on port 3000 and fetches its tunnel token from the
 * /__tunnel-token endpoint (see tunnelTokenGate.ts) for local runs.
 */
const probeDevServer = async (): Promise<{ token: string | null } | null> => {
  /** Sends one GET over the given protocol and resolves to the probe result, or null if nothing answered. */
  const probe = (protocol: 'http' | 'https'): Promise<{ token: string | null } | null> =>
    new Promise(resolve => {
      /** Buffers the response and extracts the token from the route's JSON payload, if any. */
      const onResponse = (response: IncomingMessage) => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', (chunk: string) => {
          // The token payload is tiny; cap what we buffer in case an older server answers with a page.
          if (body.length < 2048) body += chunk
        })
        response.on('end', () => {
          // Any answer proves a server is up. Only a parseable { token } proves it runs the gate
          // with the discovery route — an older server may 404 or fall back to serving HTML here.
          try {
            const token: unknown = response.statusCode === 200 ? (JSON.parse(body) as { token?: unknown }).token : null
            resolve({ token: typeof token === 'string' && token.length > 0 ? token : null })
          } catch {
            resolve({ token: null })
          }
        })
      }
      const url = `${protocol}://localhost:3000/__tunnel-token`
      const request =
        protocol === 'https'
          ? https.request(url, { method: 'GET', timeout: 2000, rejectUnauthorized: false }, onResponse)
          : http.request(url, { method: 'GET', timeout: 2000 }, onResponse)
      request.on('error', () => resolve(null))
      request.on('timeout', () => {
        request.destroy()
        resolve(null)
      })
      request.end()
    })
  return (await probe('https')) || (await probe('http'))
}

/**
 * WDIO configuration for BrowserStack iOS testing.
 * Uses a pool of named Cloudflare Tunnels (see cloudflareTunnelPool.ts) to expose the local
 * dev server via a public HTTPS URL with a real CA-signed cert, avoiding Safari's self-signed
 * cert restrictions.
 *
 * Prerequisites:
 * 1. Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY env vars.
 * 2. Set CLOUDFLARE_TUNNEL_POOL to a JSON array of { name, hostname, token } (provisioned out-of-band — see docs/testing.md).
 * 3. Start the app with `yarn start` (on port 3000, in the default HTTPS mode — the dev pool's
 * ingress connects to https://localhost:3000 with No TLS Verify, so Vite's self-signed cert is
 * accepted). The Vite app-gate token needs no setup: the server generates one and onPrepare
 * discovers it via the gate's /__tunnel-token route (see tunnelTokenGate in vite.config.ts).
 *
 * Run: yarn test:ios:browserstack.
 */
export const config: WebdriverIO.Config = {
  ...baseConfig,

  // BrowserStack Configuration
  user,
  key: process.env.BROWSERSTACK_ACCESS_KEY,

  // Capabilities
  capabilities: [
    {
      ...baseConfig.baseCapabilities,
      'appium:deviceName': 'iPhone 15 Plus',
      'appium:platformVersion': '17',
      'bstack:options': {
        deviceName: 'iPhone 15 Plus',
        osVersion: '17',
        projectName: process.env.BROWSERSTACK_PROJECT_NAME || 'em',
        buildName: process.env.BROWSERSTACK_BUILD_NAME || `Local - ${user} - ${date}`,
        sessionName: 'iOS Safari Tests',
        // The device reaches the dev server over the public cloudflared HTTPS URL (onPrepare), so
        // BrowserStack Local (`local: true`) is not used on this path. These flags collect diagnostic
        // data on BrowserStack's web dashboard, which we don't need/use.
        debug: false,
        networkLogs: false,
        consoleLogs: 'errors',
        idleTimeout: 60,
      },
    },
  ],

  // Services
  services: [
    [
      'browserstack',
      {
        testObservability: true,
      },
    ],
  ],

  onPrepare: async function () {
    try {
      // Claim a tunnel from the pool if not already set (e.g. by a CI workflow step)
      if (!process.env.CLOUDFLARED_URL) {
        if (!process.env.CLOUDFLARE_TUNNEL_POOL) {
          throw new Error(
            'CLOUDFLARE_TUNNEL_POOL is not set. See docs/testing.md for information on how to set this up.',
          )
        }
        // With no server on port 3000, every tunnel candidate looks free, attaches a connector,
        // and burns its ~30s claim timeout on an opaque "timed out waiting ... to answer with this
        // run's app-gate token" — then the pool logic waits up to 45 min for a slot to "free up".
        // Probe the origin directly first so that failure costs one request and names its actual
        // cause. The same probe discovers the server's app-gate token, so a local run needs no
        // TUNNEL_TOKEN setup at all.
        const devServer = await probeDevServer()
        if (!devServer) {
          throw new Error('No dev server is answering on port 3000. Start one with `yarn start`.')
        }

        // The server's own answer is authoritative: the tunnel claim below proves a candidate by
        // asking whether the origin answers THIS token, and the origin is that server. This also
        // shrugs off a stale TUNNEL_TOKEN exported in the shell (the pre-discovery setup docs
        // recommended that), which would otherwise mismatch a server that generated its own. In
        // CI the server was started with the workflow's TUNNEL_TOKEN, so discovery returns that
        // same token and nothing changes.
        if (devServer.token) {
          process.env.TUNNEL_TOKEN = devServer.token
        } else if (!process.env.TUNNEL_TOKEN) {
          throw new Error(
            'The dev server on port 3000 does not expose /__tunnel-token, so it is running code that predates automatic app-gate token discovery. Restart it from this branch, or set TUNNEL_TOKEN for both the server and this runner. See docs/testing.md.',
          )
        }

        const pool = parseTunnelPool(process.env.CLOUDFLARE_TUNNEL_POOL)
        const claimed = await findFirstAvailableTunnel(pool, process.env.TUNNEL_TOKEN)
        tunnelProcess = claimed.process
        process.env.CLOUDFLARED_URL = claimed.url
        console.info(`cloudflared tunnel: ${claimed.name} (${claimed.url})`)
      }

      // Append the app-gate token via the URL API so the href always includes `/` before `?`.
      // String concat on `https://host` produces `https://host?__token=`, which iOS Safari does
      // not load as `/` — the first WDIO session then fails `before` while later retries pass.
      if (process.env.TUNNEL_TOKEN && process.env.CLOUDFLARED_URL) {
        const origin = new URL(process.env.CLOUDFLARED_URL)
        origin.searchParams.set('__token', process.env.TUNNEL_TOKEN)
        process.env.CLOUDFLARED_URL = origin.href
      }

      await baseConfig.onPrepare()
    } catch (err) {
      // Exit rather than rethrow. WebdriverIO logs a failed launcher hook and then starts the
      // workers regardless, so a misconfigured run proceeds to open a device against a URL that
      // was never set — every spec then fails on an opaque origin ("The operation is insecure",
      // "em.testHelpers is undefined", editable timeouts), each retried, burning a full ~20 min
      // BrowserStack build. All of it traces back to here, but the real cause ends up buried at
      // the top of a thousand lines of consequences. Exiting makes it the last thing printed.
      if (tunnelProcess) tunnelProcess.kill()
      console.error(`\niOS test setup failed: ${err instanceof Error ? err.message : String(err)}\n`)
      process.exit(1)
    }
  },

  onComplete: function () {
    if (tunnelProcess) {
      tunnelProcess.kill()
      tunnelProcess = null
    }
  },
}

export default config
