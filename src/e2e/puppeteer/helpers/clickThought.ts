import { Page } from 'puppeteer'
import waitForEditable from './waitForEditable'

/**
 * Click the thought for the given thought value. Waits for the thought at the beginning in case it hasn't been rendered yet.
 */
const clickThought = async (page: Page, value: string) => {
  // use a short timeout to make time for a render and async page communication
  // precede clickThought by a longer waitForEditable for steps that are known to take time, such as refreshing the page
  const editableNode = await waitForEditable(page, value, { timeout: 1000 })
  await editableNode.asElement()?.click()
}

export default clickThought
