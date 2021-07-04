import { Browser } from 'webdriverio'

/** Returns true if the keyboard is currently being shown. */
const isKeyboardShown = (browser: Browser<'async'>): Promise<boolean> => browser.isKeyboardShown()

export default isKeyboardShown
