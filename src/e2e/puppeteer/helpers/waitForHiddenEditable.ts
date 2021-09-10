import { Page } from 'puppeteer'
import waitForEditable from './waitForEditable'

/** Wait for an editable to become hidden by checking the color alpha. */
async function waitForHiddenEditable(page: Page, value: string) {
  const editableElement = await waitForEditable(page, value)
  await page.waitForFunction(
    (element: Element) => {
      // TODO: This fails if app is in light mode
      return window.getComputedStyle(element, null).color === 'rgba(255, 255, 255, 0)'
    },
    {},
    editableElement,
  )
}

export default waitForHiddenEditable
