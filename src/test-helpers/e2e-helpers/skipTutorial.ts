import { Page } from 'puppeteer'
import waitForState from './waitForState'
import waitForContextHasChildWithValue from './waitForContextHasChildWithValue'

/**
 * Skip tutorial screen.
 */
const skipTutorial = async (page: Page) => {
  await waitForState(page, 'isLoading', false)
  await waitForContextHasChildWithValue(page, ['__EM__', 'Settings', 'Tutorial'], 'On')
  await page.waitForSelector('#skip-tutorial')
  await page.click('#skip-tutorial')
  await page.waitForFunction(() => !document.getElementById('skip-tutorial'))
}

export default skipTutorial
