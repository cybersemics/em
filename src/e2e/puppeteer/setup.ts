/* eslint-disable import/prefer-default-export */
import chalk from 'chalk'
import { Browser, BrowserContext, ConsoleMessage, Device, Page } from 'puppeteer'
import type { PreloadedEmWindow } from '../../@types'
import type { ThoughtspaceStorage } from '../../data-providers/thoughtspace'
import createId from '../../util/createId'
import deviceEmulation from './helpers/deviceEmulation'
import { page, setPage } from './session'

// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/prefer-namespace-keyword
declare module global {
  const browser: Browser
}

let context: BrowserContext
let activeThoughtspaceStorage: ThoughtspaceStorage = 'memory'

/** Selects thoughtspace storage before a Puppeteer page starts the app. */
const preloadThoughtspaceStorage = (target: Page, storage: ThoughtspaceStorage) =>
  target.evaluateOnNewDocument(storage => {
    const preloadedWindow: PreloadedEmWindow = window
    preloadedWindow.em = {
      ...preloadedWindow.em,
      testFlags: {
        ...preloadedWindow.em?.testFlags,
        thoughtspaceStorage: storage,
      },
    }
  }, storage)

/** Opens an additional page with the requested thoughtspace storage. */
export const createTreecrdtTestPage = async (
  browserContext: BrowserContext,
  storage: ThoughtspaceStorage,
): Promise<Page> => {
  const target = await browserContext.newPage()
  await preloadThoughtspaceStorage(target, storage)
  return target
}

/** Use persistent OPFS storage for tests that verify reload/materialization from storage. */
export const usePersistentTreecrdtStorage = (): ThoughtspaceStorage => {
  beforeAll(() => {
    activeThoughtspaceStorage = 'persistent'
  })

  afterAll(() => {
    activeThoughtspaceStorage = 'memory'
  })

  return 'persistent'
}

/** Opens em in a new incognito window in Puppeteer. */
const setup = async ({
  puppeteerBrowser = global.browser,
  // Use host.docker.internal to connect to the host machine from inside the container. On Github actions, host.docker.internal is not available, so use 172.17.0.1 instead.
  url = process.env.CI ? 'https://172.17.0.1:3000' : 'https://host.docker.internal:2552',
  // url = 'https://google.com',
  emulatedDevice = deviceEmulation.device,
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

  await page.evaluateOnNewDocument(sessionId => {
    if (!sessionStorage.getItem('__em_puppeteer_storage_initialized')) {
      localStorage.clear()
      sessionStorage.setItem('__em_puppeteer_storage_initialized', '1')
    }

    localStorage.setItem('tsid', sessionId)
    localStorage.setItem('accessToken', sessionId)
  }, sessionId)

  await preloadThoughtspaceStorage(page, activeThoughtspaceStorage)

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

  if (skipTutorial) {
    // wait for welcome modal to appear
    await page.waitForSelector('#skip-tutorial')

    // click the skip tutorial link
    await page.click('#skip-tutorial')

    // wait for welcome modal to disappear
    await page.waitForFunction(() => !document.getElementById('skip-tutorial'))
  }
}

beforeEach(setup, 60000)

// Closing the browser context is the whole teardown. Every test runs in its own incognito context whose storage
// (localStorage and the OPFS database alike) is discarded with it, and names its thoughtspace with a fresh tsid, so
// nothing a test wrote can be seen by the next one and there is no need to drop the thoughtspace from inside the page.
afterEach(async () => {
  if (page) {
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
