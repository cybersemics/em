import { Page } from 'puppeteer'
import waitForContextHasChildWithValue from './waitForContextHasChildWithValue'

/**
 * Skip tutorial screen.
 */
const skipTutorialScreen = async (page: Page) => {
  await waitForContextHasChildWithValue(page, ['__EM__', 'Settings', 'Tutorial'], 'On')
  await page.waitForSelector('#skip-tutorial')
  await page.evaluate(() => document.getElementById('skip-tutorial')?.click())
  await page.waitForFunction(() => !document.getElementById('skip-tutorial'))
}

export default skipTutorialScreen
