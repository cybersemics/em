import Direction from '../../../@types/Direction'
import Gesture from '../../../@types/Gesture'

export interface GestureOptions {
  xStart?: number
  yStart?: number
  segmentLength?: number
  waitMs?: number
}

interface PointerAction {
  type: string
  duration?: number
  x?: number
  y?: number
  button?: number
  origin?: string
}

/** Performs a touch swipe along a viewport-relative path, translated to screen coordinates via the WebView origin. */
const gesture = async (path: Gesture, { xStart, yStart, segmentLength = 60, waitMs = 200 }: GestureOptions = {}) => {
  const { scrollBefore, defaultX, defaultY } = await browser.execute(() => ({
    scrollBefore: { x: window.scrollX, y: window.scrollY },
    defaultX: window.innerWidth / 3,
    defaultY: window.innerHeight / 2,
  }))

  xStart = xStart ?? defaultX
  yStart = yStart ?? defaultY

  const viewportPoints: { x: number; y: number }[] = [{ x: xStart, y: yStart }]
  let currentX = xStart
  let currentY = yStart

  for (const direction of Array.from(path) as Direction[]) {
    currentX = currentX + (direction === 'r' ? +segmentLength : direction === 'l' ? -segmentLength : 0)
    currentY = currentY + (direction === 'd' ? +segmentLength : direction === 'u' ? -segmentLength : 0)
    viewportPoints.push({ x: currentX, y: currentY })
  }

  const oldContext = ((await browser.getContext()) as string) || 'NATIVE_APP'
  try {
    await browser.switchContext('NATIVE_APP')

    const webContainer = await browser.$('//XCUIElementTypeOther[@name="em"]').getElement()
    const { x: webOriginX, y: webOriginY } = await browser.getElementRect(webContainer.elementId)

    /** Translate WebView viewport coordinates to device screen coordinates. */
    const toScreen = (p: { x: number; y: number }) => ({
      x: Math.round(p.x + webOriginX),
      y: Math.round(p.y + webOriginY),
    })

    const start = toScreen(viewportPoints[0])
    const pointerActions: PointerAction[] = [
      { type: 'pointerMove', duration: 0, x: start.x, y: start.y, origin: 'viewport' },
      { type: 'pointerDown', button: 0 },
      { type: 'pause', duration: waitMs },
    ]

    for (let i = 1; i < viewportPoints.length; i++) {
      const screen = toScreen(viewportPoints[i])
      pointerActions.push({
        type: 'pointerMove',
        duration: waitMs,
        x: screen.x,
        y: screen.y,
        origin: 'viewport',
      })
      pointerActions.push({ type: 'pause', duration: waitMs })
    }

    pointerActions.push({ type: 'pointerUp', button: 0 })

    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: pointerActions,
      },
    ])
  } finally {
    await browser.switchContext(oldContext)
    await browser.execute(({ x, y }) => window.scrollTo(x, y), scrollBefore)
    await browser.waitUntil(
      async () => {
        const current = await browser.execute(() => ({ x: window.scrollX, y: window.scrollY }))
        return current.x === scrollBefore.x && current.y === scrollBefore.y
      },
      { timeout: 3000, timeoutMsg: 'Failed to restore scroll position after gesture' },
    )
  }
}

export default gesture
