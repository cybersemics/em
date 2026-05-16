/**
 * A console proxy that captures console.{log,warn,error,info,debug} into
 * sessionStorage when the VITE_BROWSER_CONSOLE_CAPTURE build-time env var is set.
 * BrowserStack does not provide native access to console logs from iOS runs;
 * this proxy lets us work around those limitations.
 */

export type CapturedLog = { level: string; message: string }

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

let installed = false

/**
 * Installs the console-proxy.
 */
const installConsoleProxy = (): void => {
  if (!import.meta.env.VITE_BROWSER_CONSOLE_CAPTURE) return

  // Idempotency guard – ensure the proxy is only installed once per session.
  if (installed) return
  installed = true

  // Create the storage key if it doesn't exist. drainConsoleProxy / waitForConsoleProxy use this as a readiness signal.
  if (sessionStorage.getItem(STORAGE_KEY) === null) {
    sessionStorage.setItem(STORAGE_KEY, '[]')
  }

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
  return browser.execute((key: string) => {
    try {
      const logs = JSON.parse(sessionStorage.getItem(key) ?? '[]') as CapturedLog[]
      sessionStorage.setItem(key, '[]')
      return logs
    } catch {
      return []
    }
  }, STORAGE_KEY)
}

/**
 * Resolves once the console proxy has installed in the remote browser, or rejects after `timeout` ms.
 *
 * No-op when VITE_BROWSER_CONSOLE_CAPTURE is unset – this env var must be set both at build time (so the served bundle includes the proxy) and at runtime (so this helper waits for it).
 */
export const waitForConsoleProxy = async (timeout = 30000): Promise<void> => {
  if (!process.env.VITE_BROWSER_CONSOLE_CAPTURE) return
  await browser.waitUntil(
    async () => browser.execute((key: string) => sessionStorage.getItem(key) !== null, STORAGE_KEY),
    {
      timeout,
      timeoutMsg: `Console proxy did not install within ${timeout}ms — VITE_BROWSER_CONSOLE_CAPTURE is set on the WDIO process but the served bundle was likely built without it. Rebuild with \`VITE_BROWSER_CONSOLE_CAPTURE=1 yarn build\` and re-serve.`,
    },
  )
}

export default installConsoleProxy

// Self-install at module load. Importing this file (e.g. as the first line of src/index.tsx) installs the proxy before any other module body runs, so app-bootstrap logs are captured. No-op when VITE_BROWSER_CONSOLE_CAPTURE isn't set at build time.
installConsoleProxy()
