type CapturedLog = { level: string; message: string }

declare global {
  interface Window {
    __iOSConsoleProxy__?: CapturedLog[]
    __drainiOSConsoleLogs__?: () => CapturedLog[]
  }
}

const logs: CapturedLog[] = []

/** Atomically reads and clears the iOS console proxy buffer. Returns [] when nothing has been captured. */
export const drainiOSConsoleLogs = (): CapturedLog[] => logs.splice(0)

/**
 * Installs a console proxy that captures console.{log,warn,error,info,debug} into
 * window.__iOSConsoleProxy__ when ?__ios_console_proxy is in the URL.
 * BrowserStack does not provide access to logs natively due to Safari WebDriver
 * limitations, so we need this workaround to access console logs.
 * The proxy still calls the original console method, so
 * app behaviour is unchanged when enabled.
 */
const installiOSConsoleProxy = (): void => {
  if (!new URLSearchParams(window.location.search).has('__ios_console_proxy')) return
  if (window.__iOSConsoleProxy__) return

  // Expose references so the WDIO config can reach them via browser.execute. The buffer (logs) is the same array drainiOSConsoleLogs closes over.
  window.__iOSConsoleProxy__ = logs
  window.__drainiOSConsoleLogs__ = drainiOSConsoleLogs

  const c = console as unknown as Record<string, (...args: unknown[]) => void>
  for (const method of ['log', 'warn', 'error', 'info', 'debug']) {
    const orig = c[method].bind(console)
    c[method] = (...args: unknown[]) => {
      try {
        const message = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
        logs.push({ level: method, message })
      } catch {
        // Serialization failure (e.g. circular refs) — drop this entry.
      }
      orig(...args)
    }
  }
}

export default installiOSConsoleProxy
