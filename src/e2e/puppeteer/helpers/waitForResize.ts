import { page } from '../setup'

/**
 * Waits for all resize operations to complete.
 * This includes waiting for:
 * 1. Initial RAF
 * 2. Any pending measurements to complete.
 */
const waitForResize = async () => {
  return page.evaluate(() => {
    return new Promise<void>(resolve => {
      // RAF for initial layout
      requestAnimationFrame(() => {
        setTimeout(resolve, 16) // One frame worth of time
      })
    })
  })
}

export default waitForResize
