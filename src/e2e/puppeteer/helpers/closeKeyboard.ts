import type { WindowEm } from '../../../initialize'
import { page } from '../setup'

/** Closes the virtual keyboard by blurring the active element, simulating the native Done button. */
const closeKeyboard = () =>
  page.evaluate(() => {
    ;(document.activeElement as HTMLElement)?.blur()
    // blur() is a no-op when nothing is focused; sync Redux like Editable onBlur on touch
    ;(window.em as WindowEm).store.dispatch({ type: 'keyboardOpen', value: false })
  })

export default closeKeyboard
