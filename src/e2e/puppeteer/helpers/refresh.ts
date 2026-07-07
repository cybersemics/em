import { WindowEm } from '../../../initialize'
import { page } from '../session'

/** Refreshes the page. */
const refresh = async (): Promise<void> => {
  await page.evaluate(async () => {
    await (window.em as Partial<WindowEm> | undefined)?.testHelpers?.waitForThoughtspaceRuntimeIdle?.()
  })
  await page.reload({ waitUntil: 'load' })
  await page.waitForFunction(() => {
    return typeof (window.em as Partial<WindowEm> | undefined)?.testHelpers?.waitForInitialized === 'function'
  })
  await page.evaluate(async () => {
    const waitForInitialized = (window.em as Partial<WindowEm> | undefined)?.testHelpers?.waitForInitialized
    if (typeof waitForInitialized !== 'function') throw new Error('waitForInitialized is not available')
    await waitForInitialized()
  })
}

export default refresh
