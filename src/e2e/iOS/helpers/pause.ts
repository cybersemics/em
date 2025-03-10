import { Browser } from 'webdriverio'

/**
 * Wait for the specified amount of time.
 */
const pause = async (browser: Browser, milliseconds: number) => {
  await browser.pause(milliseconds)
}

export default pause
