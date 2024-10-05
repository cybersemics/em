import { Page } from 'puppeteer'
import waitForEditable from './waitForEditable'

declare module global {
  const page: Page
}

/** Wait for an editable to become hidden by checking the color alpha. */
// TODO: Broken after virtualizing thoughts
async function waitForHiddenEditable(value: string) {
  const editableElement = await waitForEditable(value)
  await global.page.waitForFunction(
    (element: Element) => {
      return window.getComputedStyle(element, null).color === 'rgba(255, 255, 255, 0)'
    },
    {},
    editableElement.asElement()! as unknown as Element,
  )
}

export default waitForHiddenEditable
