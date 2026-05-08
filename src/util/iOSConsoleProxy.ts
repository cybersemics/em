type CapturedLog = { level: string; message: string }

declare global {
  interface Window {
    __drainiOSConsoleLogs__?: () => CapturedLog[]
  }
}

// sessionStorage key for the captured-log buffer. Using sessionStorage rather than an in-memory array means the buffer survives same-tab page reloads, which iOS Safari occasionally does mid-test (the new window object would otherwise wipe an in-memory buffer).
const KEY = '__iOSConsoleLogs__'

/** Reads the buffer from sessionStorage. Returns [] on parse failure or missing buffer. */
const read = (): CapturedLog[] => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as CapturedLog[]
  } catch {
    return []
  }
}

/** Atomically reads and clears the iOS console proxy buffer. Returns [] when nothing has been captured. */
export const drainiOSConsoleLogs = (): CapturedLog[] => {
  const collected = read()
  sessionStorage.setItem(KEY, '[]')
  return collected
}

/**
 * Installs a console proxy that captures console.{log,warn,error,info,debug} into
 * sessionStorage when ?__ios_console_proxy is in the URL.
 * BrowserStack does not provide access to logs natively due to Safari WebDriver
 * limitations, so we need this workaround to access console logs.
 * The proxy still calls the original console method, so
 * app behaviour is unchanged when enabled.
 *
 * The buffer is stored in sessionStorage (key __iOSConsoleLogs__) so it survives
 * same-tab page reloads. Drain via window.__drainiOSConsoleLogs__() (or
 * drainiOSConsoleLogs() from this module) — that returns the entries and clears
 * the buffer atomically. To peek without draining, run
 * `JSON.parse(sessionStorage.getItem('__iOSConsoleLogs__'))` in DevTools.
 */
const installiOSConsoleProxy = (): void => {
  if (!new URLSearchParams(window.location.search).has('__ios_console_proxy')) return
  if (window.__drainiOSConsoleLogs__) return

  window.__drainiOSConsoleLogs__ = drainiOSConsoleLogs

  const c = console as unknown as Record<string, (...args: unknown[]) => void>
  for (const method of ['log', 'warn', 'error', 'info', 'debug']) {
    const orig = c[method].bind(console)
    c[method] = (...args: unknown[]) => {
      try {
        const message = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
        const buf = read()
        buf.push({ level: method, message })
        sessionStorage.setItem(KEY, JSON.stringify(buf))
      } catch {
        // Serialization or storage failure (e.g. circular refs, quota) — drop this entry.
      }
      orig(...args)
    }
  }
}

export default installiOSConsoleProxy

// Self-install at module load. Importing this file (e.g. as the first line of src/index.tsx) installs the proxy before any other module body runs, so app-bootstrap logs are captured. No-op when ?__ios_console_proxy isn't in the URL.
installiOSConsoleProxy()
