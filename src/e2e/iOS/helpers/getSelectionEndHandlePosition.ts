import getScreenOffset from './getScreenOffset.js'

/** Get the native screen coordinates of the current selection's end handle. */
const getSelectionEndHandlePosition = async () => {
  const raw = await browser.execute(() => {
    const selection = window.getSelection()
    if (!selection?.rangeCount) return ''

    const rects = selection.getRangeAt(0).getClientRects()
    const rect = rects[rects.length - 1]
    return rect ? JSON.stringify({ bottom: rect.bottom, right: rect.right }) : ''
  })
  if (!raw) throw new Error('Selection range not found.')

  const rect = JSON.parse(raw) as { bottom: number; right: number }
  const offset = await getScreenOffset()

  // WebKit draws the grab circle just inside and below the range endpoint. getClientRects is viewport-relative,
  // so the offset applies without a scroll correction.
  return {
    x: Math.round(rect.right - 4 + offset.x),
    y: Math.round(rect.bottom + 6 + offset.y),
  }
}

export default getSelectionEndHandlePosition
