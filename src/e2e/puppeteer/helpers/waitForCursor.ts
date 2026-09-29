import { page } from '../session'

/** Waits for the cursor to be on a thought with the given value. The value is matched against the editable's innerHTML, so it may contain formatting tags, e.g. `<b>apple</b>`. */
const waitForCursor = (value: string) =>
  page.waitForFunction(
    (value: string) => document.querySelector('[data-editing=true] [data-editable]')?.innerHTML === value,
    {},
    value,
  )

export default waitForCursor
