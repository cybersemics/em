import getCaretOffset from './getCaretOffset'

/**
 * Waits for the caret to come to rest at the given offset in the thought being edited. A caret that iOS places at a
 * tap can be moved back within about 70ms, so the offset must match on two samples taken further apart than that.
 * Uses the global browser object from WDIO.
 */
const waitForCaretOffset = async (offset: number): Promise<void> => {
  let matchedPreviousSample = false
  try {
    await browser.waitUntil(
      async () => {
        const matched = (await getCaretOffset()) === offset
        const settled = matched && matchedPreviousSample
        matchedPreviousSample = matched
        return settled
      },
      { timeout: 5000, interval: 250 },
    )
  } catch {
    throw new Error(`Expected the caret to come to rest at offset ${offset}, but it was at ${await getCaretOffset()}.`)
  }
}

export default waitForCaretOffset
