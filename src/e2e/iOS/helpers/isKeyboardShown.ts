import { Browser } from 'webdriverio'

/** Returns true if the keyboard is currently being shown. */
const isKeyboardShown = (browser: Browser): Promise<boolean> => browser.isKeyboardShown()

export default isKeyboardShown
