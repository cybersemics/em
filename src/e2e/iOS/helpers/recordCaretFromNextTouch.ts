/**
 * Records the caret's focus offset on every selectionchange from the next touchstart on, in the page, so that a change
 * between two WebDriver calls is not missed, and one still pending from before the touch is not counted.
 */
const recordCaretFromNextTouch = async () => {
  await browser.execute(() => {
    const w = window as unknown as { __caretOffsets: number[] }
    w.__caretOffsets = []
    document.addEventListener(
      'touchstart',
      () =>
        document.addEventListener('selectionchange', () => {
          const offset = document.getSelection()?.focusOffset
          if (offset != null) w.__caretOffsets.push(offset)
        }),
      { capture: true, once: true },
    )
  })

  return {
    /**
     * Waits until the caret has left the offset `before`, returned to it, and left it again, i.e. a tap that iOS
     * reverted has been corrected, or until `timeout` ms pass without that.
     */
    waitToSettle: async ({ before, timeout }: { before: number; timeout: number }): Promise<void> => {
      const start = Date.now()
      /** True once the offsets show the caret leaving before, returning to it, and leaving it again. */
      const corrected = (offsets: number[]) => {
        const left = offsets.findIndex(offset => offset !== before)
        const returned = offsets.findIndex((offset, i) => i > left && offset === before)
        return left !== -1 && returned !== -1 && offsets.slice(returned + 1).some(offset => offset !== before)
      }
      // Safari's driver does not wait for a promise returned from execute, so poll, with the deadline in the condition
      await browser.waitUntil(
        async () =>
          Date.now() - start >= timeout ||
          corrected(await browser.execute(() => (window as unknown as { __caretOffsets: number[] }).__caretOffsets)),
        { timeout: timeout * 5, interval: 50 },
      )
    },
  }
}

export default recordCaretFromNextTouch
