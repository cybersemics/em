import { page } from '../session'

interface Options {
  timeout?: number
}

/** Waits for the cursor to be on a thought with the given value. The value is matched against the editable's innerHTML, so it may contain formatting tags, e.g. `<b>apple</b>`. Reports the thought the cursor is actually on if it never arrives, which is the whole diagnosis when a throttled `cursorUp`/`cursorDown` drops a keypress and leaves the cursor short of the target rather than nowhere. Times out after 6 seconds. */
const waitForCursor = async (value: string, { timeout }: Options = { timeout: 6000 }) => {
  await expect
    .poll(() => page.evaluate(() => document.querySelector('[data-editing=true] [data-editable]')?.innerHTML ?? null), {
      timeout,
    })
    .toBe(value)
}

export default waitForCursor
