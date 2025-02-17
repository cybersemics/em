import { Browser } from 'webdriverio'

/**
 * Tap a node with an optional text offset or x,y offset.
 */
const keys = async (browser: Browser<'async'>) => {
  await browser.keys(['f', 'a', 'k', 'e'])
}

export default keys
