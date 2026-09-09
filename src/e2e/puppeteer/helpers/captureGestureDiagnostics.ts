import { mkdir, open, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import type { Browser, CDPSession, Page, Protocol } from 'puppeteer'
import { page } from '../session'

/** Reads diagnostic state without changing the DOM or performing test assertions. */
const readPage = async (target: Page) => ({
  requestedViewport: target.viewport(),
  rendered: await target.evaluate(() => {
    const popup = document.querySelector('[data-testid=popup-value]')
    const style = popup ? getComputedStyle(popup) : null
    const state = window.em.store.getState()
    return {
      time: Date.now(),
      performanceTime: performance.now(),
      viewport: {
        width: innerWidth,
        height: innerHeight,
        deviceScaleFactor: devicePixelRatio,
        maxTouchPoints: navigator.maxTouchPoints,
        scrollX,
        scrollY,
      },
      popup: popup
        ? {
            rect: popup.getBoundingClientRect().toJSON(),
            display: style?.display,
            visibility: style?.visibility,
            opacity: style?.opacity,
            childCount: popup.childElementCount,
            text: popup.textContent?.slice(0, 1000),
          }
        : null,
      showGestureMenu: state.showGestureMenu,
      showCommandCenter: state.showCommandCenter,
      longPress: state.longPress,
    }
  }),
})

/** Temporarily captures browser input/compositor tracing and existing gesture logs; never changes input, viewport, assertions, or timers. */
const captureGestureDiagnostics = async () => {
  const browser = (globalThis as typeof globalThis & { browser: Browser }).browser
  const directory = path.join(process.env.RUNNER_TEMP || tmpdir(), 'em-gesture-diagnostics')
  await mkdir(directory, { recursive: true })
  const browserSession = await browser.target().createCDPSession()
  const version = await browserSession.send('Browser.getVersion')
  await browserSession.send('Tracing.start', {
    categories: 'input,cc,devtools.timeline,blink.user_timing',
    transferMode: 'ReturnAsStream',
  })

  const consoleEvents: Protocol.Runtime.ConsoleAPICalledEvent[] = []
  let pageSession: CDPSession | undefined
  let target: Page | undefined
  let previousLogging = false
  let before: Awaited<ReturnType<typeof readPage>> | undefined

  return {
    /** Attaches only inspector observers and enables the app's existing diagnostic logging for the selected case. */
    startPage: async () => {
      target = page
      pageSession = await target.createCDPSession()
      pageSession.on('Runtime.consoleAPICalled', event => consoleEvents.push(event))
      await pageSession.send('Runtime.enable')
      before = await readPage(target)
      previousLogging = await target.evaluate(() => {
        const previous = window.em.testFlags.logMultigesture
        window.em.testFlags.logMultigesture = true
        return previous
      })
    },

    /** Saves the trace and post-test evidence before fixture cleanup; restores the logging flag and detaches observers. */
    finish: async (outcome: string) => {
      try {
        const after = target ? await readPage(target).catch(error => ({ error: String(error) })) : null
        await writeFile(
          path.join(directory, 'state.json'),
          JSON.stringify({ outcome, version, before, after, consoleEvents }, null, 2),
        )
        if (target && !target.isClosed()) {
          await target.screenshot({ path: path.join(directory, 'after.png') })
          await target.evaluate(previous => {
            window.em.testFlags.logMultigesture = previous
          }, previousLogging)
        }

        const completed = new Promise<Protocol.Tracing.TracingCompleteEvent>(resolve => {
          browserSession.once('Tracing.tracingComplete', resolve)
        })
        await browserSession.send('Tracing.end')
        const { stream, ...traceStatus } = await completed
        await writeFile(path.join(directory, 'trace-status.json'), JSON.stringify(traceStatus, null, 2))
        if (!stream) throw new Error('Chrome did not return the gesture diagnostic trace stream.')
        const file = await open(path.join(directory, 'trace.json'), 'w')
        try {
          // Stream the trace to disk instead of retaining the full compositor trace in Node memory.
          let eof = false
          while (!eof) {
            const chunk = await browserSession.send('IO.read', { handle: stream, size: 1024 * 1024 })
            await file.writeFile(Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8'))
            eof = chunk.eof
          }
        } finally {
          await file.close()
          await browserSession.send('IO.close', { handle: stream })
        }
      } finally {
        await pageSession?.detach()
        await browserSession.detach()
      }
    },
  }
}

export default captureGestureDiagnostics
