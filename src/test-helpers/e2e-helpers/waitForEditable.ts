import { Page } from 'puppeteer'

/**
 * Wait for editable div that contains the given value.
 */
const waitForEditable = async (page: Page, value: string) =>
  await page.waitForFunction((value: string) => {
    const editableElement = Array.from(document.getElementsByClassName('editable'))
      .find(element => element.innerHTML === value)
    if (editableElement) {
      return editableElement
    }
  }, {}, value)

export default waitForEditable
