import { page } from '../session'

/** Waits for browser layout, paint, and queued macrotasks to settle after DOM-affecting e2e actions. */
const waitForBrowserSettled = async (): Promise<void> => {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    await new Promise(resolve => setTimeout(resolve))
  })
}

export default waitForBrowserSettled
