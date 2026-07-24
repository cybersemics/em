import { WindowEm } from '../../../initialize'
import { page } from '../session'

/** Refreshes the page. */
const refresh = async (): Promise<void> => {
  await page.evaluate(async () => {
    await (window.em as Partial<WindowEm> | undefined)?.testHelpers?.waitForThoughtspaceRuntimeIdle?.()
  })
  await page.reload({ waitUntil: 'load' })
  await page.evaluate(() => (window.em as WindowEm).testHelpers.waitForInitialized())
}

export default refresh
