import { page } from '../setup'
import waitForAppReady from './waitForAppReady'

/** Refreshes the page. */
const refresh = async (): Promise<void> => {
  await page.reload({ waitUntil: 'load' })
  await waitForAppReady(page)
}

export default refresh
