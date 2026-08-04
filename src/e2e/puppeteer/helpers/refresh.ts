import { page } from '../session'

/** Refreshes the page. */
const refresh = async (): Promise<void> => {
  await page.evaluate(async () => {
    await window.em?.testHelpers?.waitForThoughtspaceRuntimeIdle?.()
  })
  await page.reload({ waitUntil: 'load' })
  await page.evaluate(() => window.em.testHelpers.waitForInitialized())
}

export default refresh
