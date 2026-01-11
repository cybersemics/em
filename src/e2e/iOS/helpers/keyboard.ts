/**
 * Keyboard utilities.
 * Uses the global browser object from WDIO.
 */
const keyboard = {
  /** Type text on the keyboard. */
  type: (text: string) => browser.sendKeys([text]),
}

export default keyboard
