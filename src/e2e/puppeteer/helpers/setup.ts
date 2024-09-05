import chalk from 'chalk'
import { Browser, ConsoleMessage, Device, Page } from 'puppeteer'
import { WEBSOCKET_TIMEOUT } from '../../../constants'
import sleep from '../../../util/sleep'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module global {
  const browser: Browser
}

export interface InitPageOptions {
  puppeteerBrowser?: Browser
  url?: string
  skipTutorial?: boolean
  emulatedDevice?: Device
}

/** Opens em in a new incognito window in Puppeteer. */
const setup = async ({
  puppeteerBrowser = global.browser,
  // Use host.docker.internal to connect to the host machine from inside the container. On Github actions, host.docker.internal is not available, so use 172.17.0.1 instead.
  // We're using port 3001 for local proxy with SSL, required to access the clipboard.
  url = process.env.CI ? 'https://172.17.0.1:2552' : 'https://host.docker.internal:2552',
  // url = 'https://google.com',
  emulatedDevice,
  skipTutorial = true,
}: InitPageOptions = {}): Promise<Page> => {
  const context = await puppeteerBrowser.createBrowserContext()

  // Grant permissions to read and write to the clipboard, only works with https.
  await context.overridePermissions(url.replace(/:\d+/, ''), ['clipboard-read', 'clipboard-write'])

  const page: Page = await context.newPage()

  if (emulatedDevice) {
    await page.emulate(emulatedDevice)
  }

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
    // tap for mobile devices, since fastClick uses touch events
    await page.tap('#skip-tutorial')

    // wait for welcome modal to disappear
    await page.waitForFunction(() => !document.getElementById('skip-tutorial'))
  }

  // wait for YJS to give up connecting to WebsocketProvider
  // add 500ms for hamburger-menu animation to complete
  await sleep(WEBSOCKET_TIMEOUT + 500)

  return page
}
export default setup
