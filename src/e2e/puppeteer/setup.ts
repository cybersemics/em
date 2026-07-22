/* eslint-disable import/prefer-default-export */
import chalk from 'chalk'
import { Browser, BrowserContext, ConsoleMessage, Device, Page } from 'puppeteer'
import { WindowEm } from '../../initialize'
import createId from '../../util/createId'
import { page, setPage } from './session'

// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/prefer-namespace-keyword
declare module global {
  const browser: Browser
}

type TreecrdtTestRuntime = 'dedicated-worker' | 'direct' | 'shared-worker'

let context: BrowserContext
let treecrdtStorage: 'memory' | 'opfs' = 'memory'
let treecrdtRuntime: TreecrdtTestRuntime = 'direct'

/** Injects typed TreeCRDT configuration before the app bundle starts. */
const installTreecrdtClientConfig = async (
  target: Page,
  config: { docId: string; runtime: TreecrdtTestRuntime; storage: typeof treecrdtStorage },
): Promise<void> => {
  await target.evaluateOnNewDocument(treecrdtClientConfig => {
    type PreloadedWindowEm = Omit<Partial<WindowEm>, 'testFlags'> & {
      testFlags?: Partial<WindowEm['testFlags']>
    }

    const emWindow = window as Window & { em?: PreloadedWindowEm }
    emWindow.em = {
      ...emWindow.em,
      testFlags: {
        ...emWindow.em?.testFlags,
        treecrdtClientConfig,
      },
    }
  }, config)
}

/** Seeds an isolated browser session and typed test configuration before the app bundle starts. */
const installTestSession = async (
  target: Page,
  sessionId: string,
  storage: typeof treecrdtStorage,
  runtime: typeof treecrdtRuntime,
): Promise<void> => {
  await target.evaluateOnNewDocument(sessionId => {
    if (!sessionStorage.getItem('__em_puppeteer_storage_initialized')) {
      localStorage.clear()
      sessionStorage.setItem('__em_puppeteer_storage_initialized', '1')
    }

    localStorage.setItem('tsid', sessionId)
    localStorage.setItem('accessToken', sessionId)
  }, sessionId)

  await installTreecrdtClientConfig(target, { docId: sessionId, runtime, storage })
}

/** Opens an additional page with the current TreeCRDT test configuration. */
export const createTreecrdtTestPage = async (browserContext: BrowserContext, docId: string): Promise<Page> => {
  const target = await browserContext.newPage()
  await installTreecrdtClientConfig(target, {
    docId,
    runtime: treecrdtRuntime,
    storage: treecrdtStorage,
  })
  return target
}

/** Use persistent OPFS storage for tests that verify reload/materialization from storage. */
export const usePersistentTreecrdtStorage = ({ runtime = 'direct' }: { runtime?: TreecrdtTestRuntime } = {}) => {
  beforeAll(() => {
    treecrdtStorage = 'opfs'
    treecrdtRuntime = runtime
  })

  afterAll(() => {
    treecrdtStorage = 'memory'
    treecrdtRuntime = 'direct'
  })
}

/** Opens em in a new incognito window in Puppeteer. */
const setup = async ({
  puppeteerBrowser = global.browser,
  // Use host.docker.internal to connect to the host machine from inside the container. On Github actions, host.docker.internal is not available, so use 172.17.0.1 instead.
  url = process.env.CI ? 'https://172.17.0.1:3000' : 'https://host.docker.internal:2552',
  // url = 'https://google.com',
  emulatedDevice,
  skipTutorial = true,
}: {
  puppeteerBrowser?: Browser
  url?: string
  skipTutorial?: boolean
  emulatedDevice?: Device
} = {}) => {
  context = await puppeteerBrowser.createBrowserContext()

  // Grant permissions to read and write to the clipboard, only works with https.
  await context.overridePermissions(url.replace(/:\d+/, ''), ['clipboard-read', 'clipboard-write'])

  setPage(await context.newPage())

  if (emulatedDevice) {
    await page.emulate(emulatedDevice)
  }

  const sessionId = createId()

  await installTestSession(page, sessionId, treecrdtStorage, treecrdtRuntime)

  page.on('dialog', async dialog => dialog.accept())

  // forward puppeteer logs to console logs
  page.on('console', (message: ConsoleMessage): void => {
    const messageType = message.type()
    const text = message.text()

    switch (messageType) {
      // console.error logs the stack trace, but it's useless if the error originated in the Page context.
      // Therefore, just log info in red to avoid the noise.
      case 'error':
        console.info(chalk.red(text))
        break
      case 'info':
      case 'log':
        // eslint-disable-next-line no-console
        console[messageType](text)
        break
      // ConsoleMessage 'warning needs to be converted to native console 'warn'
      case 'warn':
        console.warn(text)
        break
      default:
        break
    }
  })

  await page.goto(url)
  await page.evaluate(() => (window.em as WindowEm).testHelpers.waitForInitialized())

  if (skipTutorial) {
    // wait for welcome modal to appear
    await page.waitForSelector('#skip-tutorial')

    // click the skip tutorial link
    await page.click('#skip-tutorial')

    // wait for welcome modal to disappear
    await page.waitForFunction(() => !document.getElementById('skip-tutorial'))

    // The skip action clears storage, closes the modal, and rerenders the empty thoughtspace.
    // Wait until the first real e2e key command can be handled by the app shell.
    await page.waitForSelector('#content')
    await page.waitForSelector('[aria-label=menu]')
    await page.waitForFunction(() => !document.querySelector('[aria-label=modal]'))
    await page.waitForFunction(() => document.querySelector('[aria-label=empty-thoughtspace], [data-editable]'))
    await page.evaluate(async () => {
      await (window.em as Partial<WindowEm> | undefined)?.testHelpers?.waitForThoughtspaceRuntimeIdle?.()
    })
  }
}

beforeEach(setup, 60000)

// TreeCRDT teardown can drain OPFS writes from import-heavy tests before dropping storage.
afterEach(async () => {
  if (page) {
    await page
      .evaluate(async () => {
        await (window.em as Partial<WindowEm> | undefined)?.testHelpers?.waitForThoughtspaceRuntimeIdle?.()
        await (window.em as Partial<WindowEm> | undefined)?.testHelpers?.dropThoughtspace?.()
      })
      .catch(() => {
        // Ignore teardown errors when a failing test has already closed or navigated the page.
      })

    await page.close().catch(() => {
      // Ignore errors when closing the page.
    })
  }

  if (context) {
    await context.close().catch(() => {
      // Ignore errors when closing the context.
    })
  }
}, 60000)
