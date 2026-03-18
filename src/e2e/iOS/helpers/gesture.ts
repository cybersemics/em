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

/** Apply gesture action for the given path. */
const gesture = async (path: Gesture, { xStart, yStart, segmentLength = 60, waitMs = 200 }: GestureOptions = {}) => {
  if (!xStart || !yStart) {
    const windowSize = await browser.getWindowSize()
    xStart = xStart ?? windowSize!.width / 3
    yStart = yStart ?? windowSize!.height / 2
  }

  // Build actions array for performActions
  // Safari/XCUITest doesn't support the DELETE /actions endpoint (releaseActions)
  // which WebDriverIO's action().perform() calls automatically after performing
  const pointerActions: PointerAction[] = [
    { type: 'pointerMove', duration: 0, x: Math.round(xStart), y: Math.round(yStart), origin: 'viewport' },
    { type: 'pointerDown', button: 0 },
    { type: 'pause', duration: waitMs },
  ]

  // Build move actions for each direction in the path
  let currentX = xStart
  let currentY = yStart

  for (const direction of Array.from(path) as Direction[]) {
    currentX = currentX + (direction === 'r' ? +segmentLength : direction === 'l' ? -segmentLength : 0)
    currentY = currentY + (direction === 'd' ? +segmentLength : direction === 'u' ? -segmentLength : 0)

    pointerActions.push({
      type: 'pointerMove',
      duration: waitMs,
      x: Math.round(currentX),
      y: Math.round(currentY),
      origin: 'viewport',
    })
    pointerActions.push({ type: 'pause', duration: waitMs })
  }

  pointerActions.push({ type: 'pointerUp', button: 0 })

  // Use performActions directly to avoid the automatic releaseActions call
  await browser.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: pointerActions,
    },
  ])
}

export default gesture
