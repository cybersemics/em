import { Browser } from 'webdriverio'

/**
 * Tap a node with an optional text offset or x,y offset.
 */
const swipe = async (browser: Browser) => {
  await browser.touchAction([
    { action: 'press', x: 200, y: 100 },
    // { action: 'moveTo', x: 300, y: 300 },
    // { action: 'moveTo', x: 300, y: 500 },
    // 'release',
  ])

  await browser.pause(5000)
}

export default swipe
