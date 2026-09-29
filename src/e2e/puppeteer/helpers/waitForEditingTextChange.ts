import { page } from '../session'

/** Waits for the current editable text to differ from the given value. */
const waitForEditingTextChange = (previousValue: string) =>
  page.waitForFunction(
    previousValue => document.querySelector('[data-editing=true] [data-editable]')?.innerHTML !== previousValue,
    {},
    previousValue,
  )

export default waitForEditingTextChange
