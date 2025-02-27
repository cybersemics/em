import { Browser } from 'webdriverio'

/**
 * Tap a node with an optional text offset or x,y offset.
 */
const pause = async (browser: Browser, milliseconds: number) => {
  await browser.pause(milliseconds)
}

export default pause
