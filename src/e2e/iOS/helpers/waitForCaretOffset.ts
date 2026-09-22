/**
 * Wait for the caret to reach the given character offset in the thought being edited. A bare timeout
 * would only report that the wait failed, so the offset the caret actually reached is read back once
 * and named in the error.
 *
 * Uses the global browser object from WDIO.
 *
 * @param offset Character offset the caret is expected to reach.
 */
const waitForCaretOffset = async (offset: number): Promise<void> => {
  try {
    await browser.waitUntil(() => browser.execute(o => window.getSelection()?.focusOffset === o, offset), {
      timeout: 5000,
      interval: 250,
    })
  } catch {
    const actual = await browser.execute(() => window.getSelection()?.focusOffset ?? null)
    throw new Error(`Expected the caret to move to offset ${offset}, but it was at ${actual}.`)
  }
}

export default waitForCaretOffset
