import { WindowEm } from '../../../initialize'
import { page } from '../session'
import waitForAppReady from './waitForAppReady'

/** Refreshes the page. */
const refresh = async (): Promise<void> => {
  await page.evaluate(async () => {
    await (window.em as Partial<WindowEm> | undefined)?.testHelpers?.waitForThoughtspaceRuntimeIdle?.()
  })
  await page.reload({ waitUntil: 'load' })
  await waitForAppReady(page)
}

export default refresh
