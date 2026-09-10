// Temporary diagnostics branch only. Do not merge into application branches.
import fs from 'node:fs/promises'
import puppeteer from 'puppeteer-core'
import original from './src/e2e/puppeteer-environment'

export default {
  ...original,
  name: 'desktop-diagnostic',
  async setup(global, options) {
    const originalConnect = puppeteer.connect
    puppeteer.connect = connectOptions => {
      if (process.env.DIAG_BROWSER !== 'v1') return originalConnect(connectOptions)
      const source = new URL(connectOptions.browserWSEndpoint!)
      const launch = JSON.parse(Buffer.from(source.searchParams.get('launch')!, 'base64').toString())
      const target = new URL('ws://localhost:7579')
      for (const arg of launch.args) {
        const [key, value = 'true'] = arg.split('=')
        target.searchParams.set(key, value)
      }
      return originalConnect({ ...connectOptions, browserWSEndpoint: target.toString() })
    }
    let environment
    try {
      environment = await original.setup(global, options)
    } finally {
      puppeteer.connect = originalConnect
    }
    const browser = global.browser
    const version = await browser.version()
    const createContext = browser.createBrowserContext.bind(browser)
    let index = 0
    browser.createBrowserContext = async (...args) => {
      const context = await createContext(...args)
      const newPage = context.newPage.bind(context)
      context.newPage = async (...pageArgs) => {
        const page = await newPage(...pageArgs)
        if (process.env.DIAG_CPU) {
          const session = await page.createCDPSession()
          await session.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.DIAG_CPU) })
        }
        if (!['1', '2'].includes(process.env.DIAG_CAPTURE || '')) return page
        const file = `/tmp/em-desktop-${process.env.DIAG_BROWSER || 'v2'}-${process.env.DIAG_RUN || '0'}-${process.pid}-${index++}.json`
        const commands = []
        const evaluate = page.evaluate.bind(page)
        page.evaluate = (fn, ...evaluateArgs) => {
          if (typeof fn === 'function' && fn.toString().includes('executeCommandById')) {
            commands.push({ time: Date.now(), command: evaluateArgs[0] })
          }
          return evaluate(fn, ...evaluateArgs)
        }
        await page.evaluateOnNewDocument(advanced => {
          const records = []
          window.__desktopDiagnostics = records
          let observedStore = false
          const observeStore = () => {
            const store = window.em?.store
            if (!advanced || observedStore || !store) return
            observedStore = true
            const select = state => ({
              cursor: state.cursor,
              multicursors: Object.keys(state.multicursors),
              noteFocus: state.noteFocus,
              cursorOffset: state.cursorOffset,
            })
            let previous = JSON.stringify(select(store.getState()))
            store.subscribe(() => {
              const state = select(store.getState())
              const current = JSON.stringify(state)
              if (current !== previous) {
                previous = current
                records.push({
                  type: 'cursor-state',
                  time: performance.now(),
                  state,
                  url: location.href,
                  stack: new Error().stack,
                })
              }
            })
            // Observe completion only; do not gate input or test execution on this promise.
            window.em.testHelpers.waitForInitialized().then(
              () =>
                records.push({
                  type: 'initialized',
                  time: performance.now(),
                  url: location.href,
                  state: select(store.getState()),
                }),
              error => records.push({ type: 'initialization-error', time: performance.now(), error: String(error) }),
            )
          }
          const identify = node => {
            const el = node?.nodeType === 1 ? node : node?.parentElement
            return el
              ? {
                  tag: el.tagName,
                  id: el.id,
                  label: el.getAttribute('aria-label'),
                  editable: el.getAttribute('data-editable'),
                  text: el.textContent?.slice(0, 150),
                }
              : null
          }
          for (const type of [
            'keydown',
            'keyup',
            'beforeinput',
            'input',
            'focusin',
            'focusout',
            'selectionchange',
            'mousedown',
            'mouseup',
            'click',
          ]) {
            document.addEventListener(
              type,
              event => {
                observeStore()
                const selection = window.getSelection()
                const state = advanced ? window.em?.store?.getState() : undefined
                records.push({
                  time: performance.now(),
                  type,
                  key: event.key,
                  data: event.data,
                  inputType: event.inputType,
                  ctrl: event.ctrlKey,
                  meta: event.metaKey,
                  x: event.clientX,
                  y: event.clientY,
                  state: state
                    ? {
                        cursor: state.cursor,
                        multicursors: Object.keys(state.multicursors),
                        noteFocus: state.noteFocus,
                        cursorOffset: state.cursorOffset,
                      }
                    : undefined,
                  target: identify(event.target),
                  active: identify(document.activeElement),
                  anchor: identify(selection?.anchorNode),
                  anchorOffset: selection?.anchorOffset,
                  focus: identify(selection?.focusNode),
                  focusOffset: selection?.focusOffset,
                })
              },
              { capture: true, passive: true },
            )
          }
          if (advanced) {
            new MutationObserver(changes => {
              observeStore()
              for (const change of changes) {
                const el = change.target.nodeType === 1 ? change.target : change.target.parentElement
                const editable = el?.closest?.('[data-editable], [aria-label="note-editable"]')
                if (editable)
                  records.push({
                    time: performance.now(),
                    type: 'mutation',
                    target: identify(editable),
                    html: editable.innerHTML,
                  })
              }
            }).observe(document, { subtree: true, childList: true, characterData: true })
          }
        }, process.env.DIAG_CAPTURE === '2')
        const close = page.close.bind(page)
        page.close = async (...closeArgs) => {
          try {
            const result = await page.evaluate(() => ({
              url: location.href,
              timeOrigin: performance.timeOrigin,
              viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
              editables: Array.from(document.querySelectorAll('[data-editable]')).map(el => ({
                value: el.innerHTML,
                parent: el.parentElement?.outerHTML.slice(0, 500),
              })),
              note: document.querySelector('[aria-label="note-editable"]')?.outerHTML,
              noteText: document.querySelector('[aria-label="note-editable"]')?.textContent,
              events: window.__desktopDiagnostics,
            }))
            await fs.writeFile(file, JSON.stringify({ version, commands, result }))
            console.log('DESKTOP_DIAGNOSTIC', file)
          } catch (error) {
            console.log('DESKTOP_DIAGNOSTIC_ERROR', String(error))
          }
          return close(...closeArgs)
        }
        return page
      }
      return context
    }
    return environment
  },
}
