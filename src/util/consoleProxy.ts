/**
 * A console proxy that captures console.{log,warn,error,info,debug} into
 * sessionStorage when the VITE_BROWSER_CONSOLE_CAPTURE build-time env var is set.
 * BrowserStack does not provide native access to console logs from iOS runs;
 * this proxy lets us work around those limitations.
 */

export type CapturedLog = { level: string; message: string }

declare global {
  interface Window {
    /**
     * Browser-context drain published by installConsoleProxy when capture is enabled.
     * The interactive browser-control skill calls this via the wdio MCP's execute_script,
     * which runs a string in the page and cannot import the Node-side drainConsoleProxy
     * (that helper uses `browser`/`process`). Delegates to drainBuffer so the wire format
     * stays single-sourced. Absent in production (capture unset -> install no-ops, tree-shaken).
     */
    __drainConsoleProxy__?: () => CapturedLog[]
  }
}

/** SessionStorage key under which captured logs are buffered. Using sessionStorage rather than an in-memory array means the buffer survives same-tab page reloads, which iOS Safari occasionally does mid-test. */
const STORAGE_KEY = '__capturedConsoleLogs__'

/** Reads the buffer from sessionStorage. Returns [] on parse failure or missing buffer. */
const read = (): CapturedLog[] => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') as CapturedLog[]
  } catch {
    return []
  }
}

/**
 * Atomically reads and clears the buffer for `key`. Runs IN THE REMOTE BROWSER:
 * drainConsoleProxy ships this via browser.execute, which serializes the function
 * source and drops all closure scope, so it must reference only its `key` param and
 * browser globals (no module-scope helpers, no STORAGE_KEY capture). Single source of
 * truth for the drain wire format.
 */
const drainBuffer = (key: string): CapturedLog[] => {
  try {
    const logs = JSON.parse(sessionStorage.getItem(key) ?? '[]') as CapturedLog[]
    sessionStorage.setItem(key, '[]')
    return logs
  } catch {
    return []
  }
}

/** Readiness probe for waitForConsoleProxy. Self-contained for the same browser.execute serialization reason as drainBuffer. The buffer key exists iff installConsoleProxy has run. */
const isProxyInstalled = (key: string): boolean => sessionStorage.getItem(key) !== null

let installed = false

/**
 * Installs the console-proxy.
 */
const installConsoleProxy = (): void => {
  // Node safety first: this module is also loaded by WDIO's config in Node, where `import.meta.env` is undefined and a direct property access would throw. `typeof window` short-circuits before Vite's static replacement is reached.
  if (typeof window === 'undefined') return
  // Direct property access (no optional chaining) so Vite statically replaces this with the env-var literal at build time, enabling Rollup to dead-code-eliminate the rest when the var is unset.
  if (!import.meta.env.VITE_BROWSER_CONSOLE_CAPTURE) return

  // Idempotency guard – ensure the proxy is only installed once per session.
  if (installed) return
  installed = true

  // Create the storage key if it doesn't exist. drainConsoleProxy / waitForConsoleProxy use this as a readiness signal.
  if (sessionStorage.getItem(STORAGE_KEY) === null) {
    sessionStorage.setItem(STORAGE_KEY, '[]')
  }

  // Browser-context drain for the interactive browser-control skill (execute_script can't import the Node-side helper). Same drainBuffer -> single source of truth.
  window.__drainConsoleProxy__ = () => drainBuffer(STORAGE_KEY)

  const c = console as unknown as Record<string, (...args: unknown[]) => void>
  for (const method of ['log', 'warn', 'error', 'info', 'debug']) {
    const orig = c[method].bind(console)
    c[method] = (...args: unknown[]) => {
      try {
        const message = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
        const buf = read()
        buf.push({ level: method, message })
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(buf))
      } catch {
        // Serialization or storage failure (e.g. circular refs, quota) — drop this entry.
      }
      orig(...args)
    }
  }
}

/** Atomically reads and clears the console-proxy buffer in the remote browser. Returns [] when capture is not enabled or nothing has been captured. */
export const drainConsoleProxy = async (): Promise<CapturedLog[]> => {
  if (!process.env.VITE_BROWSER_CONSOLE_CAPTURE) return []
  return browser.execute(drainBuffer, STORAGE_KEY)
}

/**
 * Resolves once the console proxy has installed in the remote browser, or rejects after `timeout` ms.
 *
 * No-op when VITE_BROWSER_CONSOLE_CAPTURE is unset – this env var must be set both at build time (so the served bundle includes the proxy) and at runtime (so this helper waits for it).
 */
export const waitForConsoleProxy = async (timeout = 30000): Promise<void> => {
  if (!process.env.VITE_BROWSER_CONSOLE_CAPTURE) return
  await browser.waitUntil(async () => browser.execute(isProxyInstalled, STORAGE_KEY), {
    timeout,
    timeoutMsg: `Console proxy did not install within ${timeout}ms — VITE_BROWSER_CONSOLE_CAPTURE is set on the WDIO process but the served bundle was likely built without it. Rebuild with \`VITE_BROWSER_CONSOLE_CAPTURE=1 yarn build\` and re-serve.`,
  })
}

export default installConsoleProxy

// Self-install at module load. Importing this file (e.g. as the first line of src/index.tsx) installs the proxy before any other module body runs, so app-bootstrap logs are captured. No-op when VITE_BROWSER_CONSOLE_CAPTURE isn't set at build time.
installConsoleProxy()
