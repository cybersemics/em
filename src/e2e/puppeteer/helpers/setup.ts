import chalk from 'chalk'
import { Browser, Device, Page } from 'puppeteer'
import { WEBSOCKET_TIMEOUT } from '../../../constants'
import sleep from '../../../util/sleep'

export interface InitPageOptions {
  puppeteerBrowser?: Browser
  url?: string
  skipTutorial?: boolean
  emulatedDevice?: Device
}

/** Opens em in a new incognito window in Puppeteer. */
const setup = async ({
  puppeteerBrowser = browser,
  url = 'http://localhost:3000',
  emulatedDevice,
  skipTutorial = true,
}: InitPageOptions = {}): Promise<Page> => {
  const context = await puppeteerBrowser.createIncognitoBrowserContext()
  const page: Page = await context.newPage()

  if (emulatedDevice) {
    await page.emulate(emulatedDevice)
  }

  page.on('dialog', async dialog => dialog.accept())

  // forward console.logs to test logs
  page.on('console', log => {
    const messageType = log.type()

    // console.error logs the stack trace, but it's useless if the error originated in the Page context.
    // Therefore, just log info in red to avoid the noise.
    if (messageType === 'error') {
      console.info(chalk.red(log.text()))
    } else {
      const c = console
      c[messageType](log.text())
    }
  })

  await page.goto(url)

  if (skipTutorial) {
    await page.waitForSelector('#skip-tutorial')
    await page.click('#skip-tutorial')
    await page.waitForFunction(() => !document.getElementById('skip-tutorial'))
  }

  // wait for YJS to give up connecting to WebsocketProvider
  // add 500ms for hamburger-menu animation to complete
  await sleep(WEBSOCKET_TIMEOUT + 500)

  return page
}
export default setup
