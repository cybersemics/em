import waitForContextHasChildWithValue from './waitForContextHasChildWithValue'
import { Browser, Device, Page } from 'puppeteer'

export interface InitPageOptions {
  puppeteerBrowser?: Browser,
  url?: string,
  skipTutorial?: boolean,
  emulatedDevice?: Device,
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
const setup = async ({ puppeteerBrowser = browser, url = 'http://localhost:3000', emulatedDevice, skipTutorial = true }: InitPageOptions = {}) => {
  const context = await puppeteerBrowser.createIncognitoBrowserContext()
  const page: Page = await context.newPage()

  if (emulatedDevice) {
    await page.emulate(emulatedDevice)
  }
  page.on('dialog', async dialog => {
    await dialog.accept()
  })

  await page.goto(url)

  skipTutorial && await skipTutorialScreen(page)

  return page

}
export default setup
