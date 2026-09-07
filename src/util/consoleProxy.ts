/**
 * A console proxy that captures console.{log,warn,error,info,debug} into
 * sessionStorage when the VITE_BROWSER_CONSOLE_CAPTURE build-time env var is set.
 * BrowserStack does not provide native access to console logs from iOS runs;
 * this proxy lets us work around those limitations.
 *
 * This is the app side, imported first by src/index.tsx. The WebdriverIO side — draining the buffer
 * and waiting for the proxy to install — lives in src/e2e/iOS/config/wdio.base.conf.ts, because it
 * needs WebdriverIO's global `browser`, whose types are declared only for src/e2e/iOS. The two sides
 * share nothing but the storage key and the record shape exported here.
 */

export type CapturedLog = { level: string; message: string }

/** SessionStorage key under which captured logs are buffered. Using sessionStorage rather than an in-memory array means the buffer survives same-tab page reloads, which iOS Safari occasionally does mid-test. */
export const CONSOLE_PROXY_STORAGE_KEY = '__capturedConsoleLogs__'

/** Reads the buffer from sessionStorage. Returns [] on parse failure or missing buffer. */
const read = (): CapturedLog[] => {
  try {
    return JSON.parse(sessionStorage.getItem(CONSOLE_PROXY_STORAGE_KEY) ?? '[]') as CapturedLog[]
  } catch {
    return []
  }
}

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

  // Create the storage key if it doesn't exist. The WebdriverIO side uses its existence as the readiness signal.
  if (sessionStorage.getItem(CONSOLE_PROXY_STORAGE_KEY) === null) {
    sessionStorage.setItem(CONSOLE_PROXY_STORAGE_KEY, '[]')
  }

  const c = console as unknown as Record<string, (...args: unknown[]) => void>
  for (const method of ['log', 'warn', 'error', 'info', 'debug']) {
    const orig = c[method].bind(console)
    c[method] = (...args: unknown[]) => {
      try {
        const message = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
        const buf = read()
        buf.push({ level: method, message })
        sessionStorage.setItem(CONSOLE_PROXY_STORAGE_KEY, JSON.stringify(buf))
      } catch {
        // Serialization or storage failure (e.g. circular refs, quota) — drop this entry.
      }
      orig(...args)
    }
  }
}

export default installConsoleProxy

// Self-install at module load. Importing this file (e.g. as the first line of src/index.tsx) installs the proxy before any other module body runs, so app-bootstrap logs are captured. No-op when VITE_BROWSER_CONSOLE_CAPTURE isn't set at build time.
installConsoleProxy()
