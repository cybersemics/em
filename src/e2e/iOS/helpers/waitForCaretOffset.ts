/** Milliseconds between samples of the caret. It must exceed the time a caret can sit at a position before it is
 * moved again after a tap — WebKit reverts a caret it placed within 26–39 ms of the touchend (#4220), and
 * useEditMode's CARET_REVERT_TIMEOUT corrects it at 100 ms — so that of two consecutive samples, the second is always
 * taken after both. */
const SAMPLE_INTERVAL = 250

/**
 * Wait for the caret to come to rest at the given character offset in the thought being edited. A single sample
 * can land in the moment between WebKit placing the caret at a tapped point and reverting it, which would pass while
 * the tap in fact had no lasting effect, so the offset must be read on two consecutive samples. A bare timeout would
 * only report that the wait failed, so the offset the caret actually reached is read back once and named in the
 * error.
 *
 * Uses the global browser object from WDIO.
 *
 * @param offset Character offset the caret is expected to reach.
 */
const waitForCaretOffset = async (offset: number): Promise<void> => {
  let matchedPreviousSample = false
  try {
    await browser.waitUntil(
      async () => {
        const matched = await browser.execute(o => window.getSelection()?.focusOffset === o, offset)
        const settled = matched && matchedPreviousSample
        matchedPreviousSample = matched
        return settled
      },
      { timeout: 5000, interval: SAMPLE_INTERVAL },
    )
  } catch {
    const actual = await browser.execute(() => window.getSelection()?.focusOffset ?? null)
    throw new Error(`Expected the caret to come to rest at offset ${offset}, but it was at ${actual}.`)
  }
}

export default waitForCaretOffset
