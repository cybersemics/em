import { Page } from 'puppeteer'
import waitForEditable from './waitForEditable'

/** Wait for an editable to become hidden by checking the color alpha. */
// TODO: Broken after virtualizing thoughts
async function waitForHiddenEditable(page: Page, value: string) {
  const editableElement = await waitForEditable(page, value)
  await page.waitForFunction(
    (element: Element) => {
      return window.getComputedStyle(element, null).color === 'rgba(255, 255, 255, 0)'
    },
    {},
    editableElement,
  )
}

export default waitForHiddenEditable
