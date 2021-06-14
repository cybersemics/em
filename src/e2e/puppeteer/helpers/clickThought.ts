import { Page } from 'puppeteer'
import waitForEditable from './waitForEditable'

/**
 * Click the thought for the given thought value. Waits for the thought at the beginning in case it hasn't been rendered yet.
 */
const clickThought = async (page: Page, value: string) => {
  // use a very short timeout, assuming that if the user expects to be able to click on a thought then they shouldn't have any noticeable wait
  // clickThought should be preceeded by a longer waitForEditable for steps that are known to take time, such as refreshing the page
  const editableNode = await waitForEditable(page, value, { timeout: 500 })
  await editableNode.asElement()?.click()
}

export default clickThought
