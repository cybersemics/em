import { Browser, Device, Page } from 'puppeteer'
import { WEBSOCKET_CONNECTION_TIME } from '../../../constants'
import { delay } from '../../../test-helpers/delay'
import waitForContextHasChildWithValue from './waitForContextHasChildWithValue'

export interface InitPageOptions {
  puppeteerBrowser?: Browser
  url?: string
  skipTutorial?: boolean
  emulatedDevice?: Device
}

/**
 * Skip tutorial screen.
 */
const skipTutorialScreen = async (page: Page) => {
  await waitForContextHasChildWithValue(page, ['__EM__', 'Settings', 'Tutorial'], 'On')
  await page.waitForSelector('#skip-tutorial')
  await page.evaluate(() => document.getElementById('skip-tutorial')?.click())
  await page.waitForFunction(() => !document.getElementById('skip-tutorial'))
}

/**
 * Create a new incognito context and page.
 */
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

  await page.goto(url)

  if (skipTutorial) {
    await skipTutorialScreen(page)
  }

  // wait for YJS to give up connecting to WebsocketProvider
  // add 500ms for hamburger-menu animation to complete
  await delay(WEBSOCKET_CONNECTION_TIME + 500)

  return page
}
export default setup
