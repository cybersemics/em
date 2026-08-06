import { page } from '../session'

/** Reloads the page and waits for the thoughtspace to load. */
const refresh = async (): Promise<void> => {
  await page.evaluate(async () => {
    await window.em?.testHelpers?.waitForThoughtspaceRuntimeIdle?.()
  })
  await page.reload({ waitUntil: 'load' })
  await page.evaluate(() => window.em.testHelpers.waitForInitialized())
}

export default refresh
