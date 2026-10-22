/**
 * Records the caret's focus offset on every selectionchange from the next touchstart on, in the page, so that a change
 * between two WebDriver calls is not missed, and one still pending from before the touch is not counted. Returns a
 * function that reads the offsets recorded so far.
 */
const recordCaretOffsetsFromNextTouch = async (): Promise<() => Promise<number[]>> => {
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
  return () => browser.execute(() => (window as unknown as { __caretOffsets: number[] }).__caretOffsets)
}

export default recordCaretOffsetsFromNextTouch
