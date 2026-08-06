/**
 * Keyboard utilities.
 * Uses the global browser object from WDIO.
 */
const keyboard = {
  /** Type text on the keyboard. */
  type: (text: string) =>
    browser.performActions([
      {
        type: 'key',
        id: 'keyboard',
        actions: Array.from(text).flatMap(value => [
          { type: 'keyDown', value },
          { type: 'keyUp', value },
        ]),
      },
    ]),
}

export default keyboard
