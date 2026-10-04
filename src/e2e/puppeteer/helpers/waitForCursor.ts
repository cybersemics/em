import { page } from '../session'

/**
 * Waits for the cursor to be on a thought with the given value, then for the next animation frame. The value is matched against the editable's innerHTML, so it may contain formatting tags, e.g. `<b>apple</b>`.
 *
 * Cursor navigation commands are throttled to one execution per animation frame by throttleByAnimationFrame, and the cursor lands in the same frame as the key press that moved it. Waiting for the next frame lets the throttle reset, so a key pressed after this resolves is not dropped.
 */
const waitForCursor = async (value: string) => {
  await page.waitForFunction(
    (value: string) => document.querySelector('[data-editing=true] [data-editable]')?.innerHTML === value,
    {},
    value,
  )

  // requestAnimationFrame callbacks run in the order they were registered, so this runs after the throttle's reset, which was registered during the key press.
  await page.evaluate(() => new Promise(requestAnimationFrame))
}

export default waitForCursor
