import { Browser } from 'webdriverio'
import waitForEditable from './waitForEditable'

/** Send keys and wait for editable exists for the given values.
 * As you know some of the operations in tests happen truly quickly. Before you even complete writing something, another action may happen.
 * We need to be sure that the current action affects our app before running the next action.
 * In this case, we want to be sure that there is a thought with the given value after sending keys.
 * */
const editThought = async (browser: Browser<'async'>, value: string) => {
  await browser.sendKeys([value])
  return await waitForEditable(browser, value)
}

export default editThought
