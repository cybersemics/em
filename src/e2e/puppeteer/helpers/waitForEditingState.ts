import { WindowEm } from '../../../initialize'
import { page } from '../setup'

const em = window.em as WindowEm
/**
 * Waits until the currently editing thought in the DOM matches the given value and, if provided, the Redux cursorOffset matches.
 * Also verifies that the Redux cursor points to a thought with the same value.
 * Defaults to a 6s timeout like other wait helpers.
 */
const waitForEditingState = async (value: string, offset?: number, timeout: number = 6000) => {
  await page.waitForFunction(
    (value: string, offset?: number) => {
      if (!em) return false
      const el = document.querySelector('[data-editing=true] [data-editable]') as HTMLElement | null
      if (!el) return false

      const state = em.testHelpers.getState()
      const cursor = state.cursor
      if (!cursor) return false

      const thought = em.getThoughtById(em.head(cursor))
      const domOk = el.textContent === value
      const cursorOk = thought?.value === value
      const offsetOk = offset == null ? true : state.cursorOffset === offset

      return domOk && cursorOk && offsetOk
    },
    { timeout },
    value,
    offset,
  )
}

export default waitForEditingState
