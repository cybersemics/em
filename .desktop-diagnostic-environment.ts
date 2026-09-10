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
      if (process.env.DIAG_DISABLE_DEFER === 'true') {
        const endpoint = new URL(connectOptions.browserWSEndpoint!)
        const launch = JSON.parse(Buffer.from(endpoint.searchParams.get('launch')!, 'base64').toString())
        launch.args.push('--disable-features=DeferRendererTasksAfterInput')
        endpoint.searchParams.set('launch', Buffer.from(JSON.stringify(launch)).toString('base64'))
        connectOptions = { ...connectOptions, browserWSEndpoint: endpoint.toString() }
      }
      if (process.env.DIAG_BROWSER !== 'v1') return originalConnect(connectOptions)
      const source = new URL(connectOptions.browserWSEndpoint!)
      const launch = JSON.parse(Buffer.from(source.searchParams.get('launch')!, 'base64').toString())
      const target = new URL(`ws://localhost:${process.env.DIAG_V1_PORT || '7579'}`)
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
    const infoSession = await browser.target().createCDPSession()
    const browserArguments = await infoSession.send('Browser.getBrowserCommandLine').then(result => result.arguments)
    await infoSession.detach()
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
        const task = global.__vitest_worker__?.current
        const testIdentity = { file: global.__vitest_worker__?.filepath, name: task?.name, suite: task?.suite?.name }
        const traceTarget =
          testIdentity.name === 'undoes and redoes contiguous note typing with its caret' ||
          testIdentity.name === 'should drop multiple thoughts as siblings before target' ||
          (testIdentity.name === 'long list of siblings' && testIdentity.suite?.includes('Font Size: 18'))
        let traceSession
        if (process.env.DIAG_TRACE === '1' && traceTarget) {
          traceSession = await browser.target().createCDPSession()
          await traceSession.send('Tracing.start', {
            categories: 'devtools.timeline,input,blink.user_timing,disabled-by-default-renderer.scheduler',
            transferMode: 'ReturnAsStream',
          })
        }
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
          let startupComplete = false
          let apiId = 0
          const readAsDataURL = FileReader.prototype.readAsDataURL
          FileReader.prototype.readAsDataURL = function (...args) {
            if (!startupComplete) {
              const id = apiId++
              records.push({ type: 'file-read-start', id, time: performance.now() })
              this.addEventListener(
                'loadend',
                () => records.push({ type: 'file-read-end', id, time: performance.now() }),
                { once: true },
              )
            }
            return Reflect.apply(readAsDataURL, this, args)
          }
          for (const [prototype, method] of [
            [IDBFactory.prototype, 'open'],
            [IDBObjectStore.prototype, 'get'],
          ]) {
            const original = prototype[method]
            prototype[method] = function (...args) {
              const request = Reflect.apply(original, this, args)
              if (!startupComplete) {
                const id = apiId++
                records.push({ type: 'idb-start', id, method, time: performance.now() })
                request.addEventListener(
                  'success',
                  () => records.push({ type: 'idb-end', id, method, time: performance.now() }),
                  { once: true },
                )
                request.addEventListener(
                  'error',
                  () => records.push({ type: 'idb-error', id, method, time: performance.now() }),
                  { once: true },
                )
              }
              return request
            }
          }
          const captureStack = () => {
            const previous = Error.stackTraceLimit
            try {
              Error.stackTraceLimit = 80
              return new Error().stack
            } finally {
              Error.stackTraceLimit = previous
            }
          }
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
                  stack: captureStack(),
                })
              }
            })
            // Observe completion only; do not gate input or test execution on this promise.
            window.em.testHelpers.waitForInitialized().then(
              () => {
                startupComplete = true
                records.push({
                  type: 'initialized',
                  time: performance.now(),
                  url: location.href,
                  state: select(store.getState()),
                })
              },
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
              resources: performance
                .getEntriesByType('resource')
                .filter(entry => /worker-|\.wasm|glow\.avif/.test(entry.name))
                .map(entry => entry.toJSON()),
              viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
              editables: Array.from(document.querySelectorAll('[data-editable]')).map(el => ({
                value: el.innerHTML,
                parent: el.parentElement?.outerHTML.slice(0, 500),
              })),
              note: document.querySelector('[aria-label="note-editable"]')?.outerHTML,
              noteText: document.querySelector('[aria-label="note-editable"]')?.textContent,
              events: window.__desktopDiagnostics,
            }))
            await fs.writeFile(file, JSON.stringify({ version, browserArguments, testIdentity, commands, result }))
            console.log('DESKTOP_DIAGNOSTIC', file)
          } catch (error) {
            console.log('DESKTOP_DIAGNOSTIC_ERROR', String(error))
          }
          if (traceSession) {
            const complete = new Promise(resolve => traceSession.once('Tracing.tracingComplete', resolve))
            await traceSession.send('Tracing.end')
            const status = await complete
            await fs.writeFile(file.replace('.json', '.trace-status.json'), JSON.stringify(status))
            const output = await fs.open(file.replace('.json', '.trace.json'), 'w')
            try {
              let eof = false
              while (!eof) {
                const chunk = await traceSession.send('IO.read', { handle: status.stream, size: 1048576 })
                await output.writeFile(chunk.base64Encoded ? Buffer.from(chunk.data, 'base64') : chunk.data)
                eof = chunk.eof
              }
            } finally {
              await output.close()
              await traceSession.send('IO.close', { handle: status.stream })
              await traceSession.detach()
            }
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
