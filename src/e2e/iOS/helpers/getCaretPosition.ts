/** Pixels the Safari chrome offsets the page by: `getBoundingClientRect` reports page coordinates while
 * `performActions` delivers touches in screen coordinates. This is the same offset that `tap` callers pass, measured
 * here as 59px on an iPhone 15 Plus. */
const SAFARI_CHROME_OFFSET_Y = 60

/**
 * Get the screen coordinates of the caret, ready to be passed to `gesture` or `performActions`.
 *
 * A caret is a zero-width rect roughly one line tall inside an editable barely taller than it, so unlike a tap on a
 * whole element this has no slack: a touch that misses by more than a few pixels lands outside the thought entirely.
 */
const getCaretPosition = async (): Promise<{ x: number; y: number }> => {
  const raw = await browser.execute(() => {
    const selection = window.getSelection()
    if (!selection?.rangeCount) return ''

    const rect = selection.getRangeAt(0).getBoundingClientRect()
    return rect.height ? JSON.stringify({ x: rect.x, y: rect.y, height: rect.height }) : ''
  })
  if (!raw) throw new Error('Caret rect not found. Is the caret in a text node?')

  const rect = JSON.parse(raw) as { x: number; y: number; height: number }
  return { x: Math.round(rect.x), y: Math.round(rect.y + rect.height / 2 + SAFARI_CHROME_OFFSET_Y) }
}

export default getCaretPosition
