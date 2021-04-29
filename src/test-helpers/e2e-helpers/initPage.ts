import skipTutorialScreen from './skipTutorialScreen'
import { Browser, Device, Page } from 'puppeteer'

export interface InitPageOptions {
  puppeteerBrowser?: Browser,
  url?: string,
  skipTutorial?: boolean,
  emulatedDevice?: Device,
}

/**
 * Create a new incognito context and page.
 */
const initPage = async ({ puppeteerBrowser = browser, url = 'http://localhost:3000', emulatedDevice, skipTutorial = true }: InitPageOptions) => {
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

  return { page, context }

}
export default initPage
