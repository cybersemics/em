import getNativeElementRect from './getNativeElementRect.js'

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
  const nativeContent = await getNativeElementRect('//XCUIElementTypeOther[@name="em"]')
  const viewportRaw = await browser.execute(() =>
    JSON.stringify({ x: window.visualViewport?.offsetLeft ?? 0, y: window.visualViewport?.offsetTop ?? 0 }),
  )
  const viewport = JSON.parse(viewportRaw) as { x: number; y: number }

  // WebKit draws the grab circle just inside and below the range endpoint. The native content and
  // visual viewport have different origins in Safari and Capacitor, so use whichever inset applies.
  return {
    x: Math.round(rect.right - 4 + Math.max(nativeContent.x, viewport.x)),
    y: Math.round(rect.bottom + 6 + Math.max(nativeContent.y, viewport.y)),
  }
}

export default getSelectionEndHandlePosition
