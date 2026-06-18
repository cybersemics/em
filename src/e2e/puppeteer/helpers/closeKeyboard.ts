import { page } from '../session'

/** Closes the virtual keyboard by blurring the active element, simulating the native Done button. */
const closeKeyboard = () => page.evaluate(() => (document.activeElement as HTMLElement)?.blur())

export default closeKeyboard
