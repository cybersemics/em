import waitForEditable from './waitForEditable.js'

/**
 * Send keys and wait for editable exists for the given values.
 * As you know some of the operations in tests happen truly quickly. Before you even complete writing something, another action may happen.
 * We need to be sure that the current action affects our app before running the next action.
 * In this case, we want to be sure that there is a thought with the given value after sending keys.
 * Uses the global browser object from WDIO.
 */
const editThought = async (value: string) => {
  // Use browser.keys() which works better on iOS Safari than sendKeys
  // Type each character individually for reliability
  for (const char of value) {
    await browser.keys(char)
  }
  return await waitForEditable(value)
}

export default editThought
