/**
 * Reads **em**'s rolling debug log out of the live app the agent is driving, and writes it to a file.
 *
 * ```sh
 * npx tsx scripts/debug-log-capture.ts --start                        # arm: enable logging, empty the buffer
 * npx tsx scripts/debug-log-capture.ts --out /tmp/em-debug-log-local.txt   # dump what the steps produced
 * ```
 *
 * The point of writing to a file rather than printing is that the log never reaches the agent's context: a
 * few steps of editing already produce thousands of characters, and a full buffer is close to a megabyte.
 * Only a one-line summary is printed; `scripts/debug-log-diff.ts` reads the file. See docs/debug-log.md.
 *
 * Attaches through the same executor bridges the e2e helpers run on — `attachExistingBrowserInstance` for
 * web and Android, `attachExistingSession` for iOS — so it drives whatever session `browser-control` already
 * brought up rather than opening one of its own.
 */
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    target: { type: 'string', default: 'web' },
    start: { type: 'boolean' },
    console: { type: 'boolean' },
    out: { type: 'string' },
  },
})

if (values.target !== 'web' && values.target !== 'android' && values.target !== 'ios') {
  console.error(`Unknown target "${values.target}". Expected web, android, or ios.`)
  process.exit(2)
}

if (!values.start && !values.out) {
  console.error(
    [
      'Usage: npx tsx scripts/debug-log-capture.ts [--target web|android|ios] (--start | --out <file>)',
      '',
      '  --start          Enable logging and empty the buffer. Run before driving the steps.',
      '  --console        With --start, also mirror every entry to the console as it is appended.',
      '  --out <file>     Write the captured log to this file. Run after driving the steps.',
      '  --target <name>  Which session to attach to. Default: web.',
    ].join('\n'),
  )
  process.exit(2)
}

/**
 * Builds the expression that arms the log for a reproduction: turns logging on (iOS and Android ship as
 * native Capacitor builds, where it does not auto-enable), empties the buffer so that what is captured
 * afterwards is the reproduction and nothing before it, and optionally starts mirroring to the console. It
 * reports the state it leaves behind rather than the state it found.
 *
 * `debugLog.clear()` leaves the console-mirror preference alone, but `localStorage.clear()` does not — so a
 * reproduction that resets app state between steps has to re-run this.
 */
const arm = (mirror: boolean): string => `(() => {
  window.em.debugLog.setEnabled(true)
  window.em.debugLog.clear()
  window.em.debugLog.setConsole(${mirror})
  return JSON.stringify({ enabled: window.em.debugLog.isEnabled(), console: window.em.debugLog.isConsole() })
})()`

/** Renders the whole buffer, with the thought-tree dump that resolves the ids in the entries to values. */
const DUMP = `window.em.debugLog.format(window.em.store.getState())`

/**
 * Evaluates an expression in the live page and returns its value.
 *
 * The expression is passed as a **string**, not a function. `tsx` compiles this file with esbuild, which
 * rewrites named functions to carry a `__name` helper that does not exist in the page's realm — a function
 * passed to `page.evaluate` then fails with `ReferenceError: __name is not defined`.
 */
const evaluate = async (expression: string): Promise<string> => {
  if (values.target === 'ios') {
    const { attachExistingSession } = await import('../src/e2e/iOS/attachExistingSession')
    const session = await attachExistingSession()
    // WebdriverIO's execute takes a body, and the bridge returns values natively; no JSON.stringify wrapper
    // is needed here, unlike the wdio MCP's iOS execute (see .github/skills/browser-control-ios/SKILL.md).
    return (await session.execute(`return ${expression}`)) as string
  }

  const { attachExistingBrowserInstance } = await import('../src/e2e/puppeteer/attachExistingBrowserInstance')
  const { browser, page } = await attachExistingBrowserInstance()
  try {
    return (await page.evaluate(expression)) as string
  } finally {
    // Disconnect, never close: the chrome-devtools MCP shares this Chrome.
    await browser.disconnect()
  }
}

/** Arms the log, or captures it, against whichever session the target names. */
const main = async () => {
  if (values.start) {
    console.info(`debug log armed on ${values.target}: ${await evaluate(arm(!!values.console))}`)
    return
  }

  const text = await evaluate(DUMP)
  writeFileSync(values.out!, text)
  const entries = text.split('\n').filter(line => /^\[\d{4}-\d{2}-\d{2}T/.test(line)).length
  console.info(`${entries} entries, ${text.length} bytes → ${values.out}`)
  if (entries === 0) {
    console.error('The buffer was empty. Was logging enabled (--start) before the steps were driven?')
    process.exit(1)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
