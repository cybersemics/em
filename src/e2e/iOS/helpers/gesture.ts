import Direction from '../../../@types/Direction'
import Gesture from '../../../@types/Gesture'

export interface GestureOptions {
  hold?: boolean
  xStart?: number
  yStart?: number
  segmentLength?: number
  segmentLengths?: number[]
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

let activePointerPosition: { x: number; y: number } | null = null

/** Apply gesture action for the given path. */
const gesture = async (
  path: Gesture,
  { hold, xStart, yStart, segmentLength = 60, segmentLengths, waitMs = 200 }: GestureOptions = {},
) => {
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

  for (const [index, direction] of (Array.from(path) as Direction[]).entries()) {
    const currentSegmentLength = segmentLengths?.[index] ?? segmentLength
    currentX = currentX + (direction === 'r' ? +currentSegmentLength : direction === 'l' ? -currentSegmentLength : 0)
    currentY = currentY + (direction === 'd' ? +currentSegmentLength : direction === 'u' ? -currentSegmentLength : 0)

    pointerActions.push(
      {
        type: 'pointerMove',
        duration: waitMs,
        x: Math.round(currentX),
        y: Math.round(currentY),
        origin: 'viewport',
      },
      { type: 'pause', duration: waitMs },
    )
  }

  if (!hold) {
    pointerActions.push({ type: 'pointerUp', button: 0 })
  }

  // Use performActions directly to avoid the automatic releaseActions call
  await browser.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: pointerActions,
    },
  ])

  activePointerPosition = hold ? { x: Math.round(currentX), y: Math.round(currentY) } : null
}

/** End a gesture that was started with hold: true. */
export const endGesture = async () => {
  if (!activePointerPosition) {
    throw new Error('Cannot end gesture: no held gesture is active.')
  }

  const { x, y } = activePointerPosition
  try {
    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y, origin: 'viewport' },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
  } finally {
    activePointerPosition = null
  }
}

export default gesture
