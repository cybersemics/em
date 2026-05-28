import { page } from '../setup'
import waitForEmIdle from './waitForEmIdle'

/** Closes the virtual keyboard by blurring the active element, simulating the native Done button. */
const closeKeyboard = async () => {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await waitForEmIdle()
}

export default closeKeyboard
