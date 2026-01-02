/**
 * Perform a swipe gesture.
 * Uses the global browser object from WDIO.
 */
const swipe = async () => {
  await browser.touchAction([
    { action: 'press', x: 200, y: 100 },
    // { action: 'moveTo', x: 300, y: 300 },
    // { action: 'moveTo', x: 300, y: 500 },
    // 'release',
  ])

  await browser.pause(5000)
}

export default swipe
