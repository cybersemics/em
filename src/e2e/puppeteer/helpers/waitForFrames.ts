import { page } from '../setup'

/** Wait for 2 frames to ensure RAF completion, ensures final layout and paint occur. */
const waitForFrames = async () =>
  await page.evaluate(() => {
    return new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    })
  })

export default waitForFrames
