import { type ChildProcess, spawn } from 'child_process'
import { bin, install } from 'cloudflared'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
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
 * Starts a cloudflared tunnel and returns the public HTTPS URL.
 * Safari blocks localStorage on self-signed HTTPS, so we use cloudflared
 * to get a real CA-signed cert (*.trycloudflare.com).
 */
async function startTunnel(): Promise<string> {
  // Install the cloudflared binary if not already present
  if (!fs.existsSync(bin)) {
    await install(bin)
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(bin, ['tunnel', '--url', 'https://localhost:3000', '--no-tls-verify'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    tunnelProcess = proc

    let output = ''
    let settled = false

    // Use a wrapper object so cleanup can reference timeout before it's assigned
    const state = { timeout: undefined as ReturnType<typeof setTimeout> | undefined }

    /** Remove all listeners and cancel the timeout after the Promise settles. */
    const cleanup = () => {
      if (state.timeout !== undefined) clearTimeout(state.timeout)
      proc.stdout?.removeAllListeners('data')
      proc.stderr?.removeAllListeners('data')
      proc.removeAllListeners('error')
      proc.removeAllListeners('exit')
    }

    /** Resolve once and release listeners. */
    const resolveAndCleanup = (url: string) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(url)
    }

    /** Reject once, terminate the child, and release listeners. */
    const rejectAndCleanup = (error: Error) => {
      if (settled) return
      settled = true
      cleanup()
      if (!proc.killed) {
        proc.kill()
      }
      if (tunnelProcess === proc) {
        tunnelProcess = null
      }
      reject(error)
    }

    /** Scan cloudflared output for the tunnel URL. */
    const onData = (data: Buffer) => {
      output += data.toString()
      const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
      return match ? resolveAndCleanup(match[0]) : null
    }

    /** Reject if cloudflared exits before printing the tunnel URL. */
    const onExit = (code: number | null, signal: NodeJS.Signals | null) =>
      rejectAndCleanup(
        new Error(
          `cloudflared exited before tunnel URL was available${code !== null ? ` (code ${code})` : ''}${signal ? ` (signal ${signal})` : ''}`,
        ),
      )

    /** Reject on process startup errors. */
    const onError = (err: Error) => rejectAndCleanup(new Error(`Failed to start cloudflared: ${err.message}`))

    state.timeout = setTimeout(() => {
      rejectAndCleanup(new Error('cloudflared tunnel timed out'))
    }, 30000)

    proc.stdout?.on('data', onData)
    proc.stderr?.on('data', onData)
    proc.once('error', onError)
    proc.once('exit', onExit)
  })
}

/**
 * WDIO configuration for BrowserStack iOS testing.
 * Uses cloudflared tunnel to expose the local HTTPS dev server via a public
 * URL with a real CA-signed cert, avoiding Safari's self-signed cert restrictions.
 *
 * Prerequisites:
 * 1. Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY env vars.
 * 2. Start the app: yarn start (on port 3000).
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
        debug: true,
        networkLogs: true,
        consoleLogs: 'verbose',
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
    // Start cloudflared tunnel if not already set (e.g. by a CI workflow step)
    if (!process.env.CLOUDFLARED_URL) {
      const url = await startTunnel()
      process.env.CLOUDFLARED_URL = url
      console.info(`cloudflared tunnel: ${url}`)
    }

    await baseConfig.onPrepare()
  },

  onComplete: function () {
    if (tunnelProcess) {
      tunnelProcess.kill()
      tunnelProcess = null
    }
  },
}

export default config
