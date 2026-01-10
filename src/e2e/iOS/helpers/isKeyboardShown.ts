/**
 * Returns true if the keyboard is currently being shown.
 * Uses the global browser object from WDIO.
 */
const isKeyboardShown = (): Promise<boolean> => browser.isKeyboardShown()

export default isKeyboardShown
