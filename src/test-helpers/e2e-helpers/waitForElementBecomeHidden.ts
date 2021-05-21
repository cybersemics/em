import { Page } from 'puppeteer'
import waitForEditable from './waitForEditable'

/** Wait for element become hidden by checking color. */
async function waitForElementBecomeHidden(page: Page, value: string) {
  const editableElement = await waitForEditable(page, value)
  await page.waitForFunction((element: Element) => {
    return window.getComputedStyle(element, null).color === 'rgba(255, 255, 255, 0)'
  }, {}, editableElement)
}

export default waitForElementBecomeHidden
