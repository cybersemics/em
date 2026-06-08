import type { WindowEm } from '../../../initialize'
import { page } from '../setup'
import waitForAppReady from './waitForAppReady'

/** Refreshes the page. */
const refresh = async (): Promise<void> => {
  await page.evaluate(async () => {
    await (window.em as Partial<WindowEm> | undefined)?.testHelpers?.waitForTreecrdtIdle?.()
  })
  await page.reload({ waitUntil: 'load' })
  await waitForAppReady(page)
}

export default refresh
