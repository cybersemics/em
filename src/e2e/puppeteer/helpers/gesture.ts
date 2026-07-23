import Command from '../../../@types/Command'
import Direction from '../../../@types/Direction'
import Gesture from '../../../@types/Gesture'
import { page } from '../session'

interface Point {
  x: number
  y: number
}

/**
 * Helper function to smoothly move touch from one point to another.
 * Creates a series of touchMove events to simulate realistic gesture movement.
 *
 * @param x1 - Starting X coordinate.
 * @param y1 - Starting Y coordinate.
 * @param x2 - Ending X coordinate.
 * @param y2 - Ending Y coordinate.
 */
const getMovePoints = (x1: number, y1: number, x2: number, y2: number): Point[] => {
  const stepSize = 10

  // Calculate total distance and number of steps
  const deltaX = x2 - x1
  const deltaY = y2 - y1
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

  if (distance === 0) return []

  const numSteps = Math.max(1, Math.ceil(distance / stepSize))
  const xStep = deltaX / numSteps
  const yStep = deltaY / numSteps

  return Array.from({ length: numSteps }, (_, i) => ({
    x: x1 + xStep * (i + 1),
    y: y1 + yStep * (i + 1),
  }))
}

/** Type predicate for Command. */
function isCommand(value: unknown): value is Command {
  return typeof value === 'object' && value !== null && 'id' in value && 'label' in value && 'exec' in value
}

interface GesturePositionOptions {
  /** CSS selector for the element where the gesture should begin. */
  target?: string
  /** Horizontal coordinate where the gesture should begin. */
  xStart?: number
  /** Vertical coordinate where the gesture should begin. */
  yStart?: number
}

interface GestureMoveOptions {
  /** Distance in pixels to move for each direction in the gesture. */
  segmentLength?: number
}

interface ActiveGesture {
  /** Move the active touch through a gesture path. */
  move: (gestureOrCommand: Gesture | Command, options?: GestureMoveOptions) => Promise<void>
  /** End the active touch. */
  end: () => Promise<void>
}

/** Resolve a gesture or command to its sequence of directions. */
const getDirections = (gestureOrCommand: Gesture | Command): Direction[] => {
  if (isCommand(gestureOrCommand) && !gestureOrCommand.gesture) {
    throw new Error(
      `Command "${gestureOrCommand.id}" does not have a gesture defined so cannot be activated with swipe.`,
    )
  }

  const gestureObject = isCommand(gestureOrCommand)
    ? gestureOrCommand.gesture instanceof Array
      ? gestureOrCommand.gesture[0]
      : // gesture must be defined because of runtime validation above
        gestureOrCommand.gesture!
    : gestureOrCommand

  return typeof gestureObject === 'string' ? (gestureObject.split('') as Direction[]) : gestureObject
}

/**
 * Start a touch and return controls for moving it through one or more gestures before ending it.
 * This allows other real input, such as scrolling, to occur between phases of the same touch.
 */
export const startGesture = async ({ target, xStart, yStart }: GesturePositionOptions = {}): Promise<ActiveGesture> => {
  // Starting position more reliably in gesture zone
  // For iPhone 15 Pro (393px wide), gesture zone is approximately x < 295px
  // Use center-left area to ensure we're in the gesture zone
  let x = xStart ?? 150
  let y = yStart ?? 350

  if (target) {
    const rect = await page.$eval(target, element => {
      const { height, left, top, width } = element.getBoundingClientRect()
      return { height, left, top, width }
    })
    x = rect.left + rect.width / 2
    y = rect.top + rect.height / 2
  }

  await page.touchscreen.touchStart(x, y)

  return {
    move: async (gestureOrCommand, { segmentLength = 80 }: GestureMoveOptions = {}) => {
      for (const direction of getDirections(gestureOrCommand)) {
        const previous = { x, y }
        switch (direction) {
          case 'r':
            x += segmentLength
            break
          case 'l':
            x -= segmentLength
            break
          case 'd':
            y += segmentLength
            break
          case 'u':
            y -= segmentLength
            break
        }

        for (const point of getMovePoints(previous.x, previous.y, x, y)) {
          await page.touchscreen.touchMove(point.x, point.y)
        }
      }
    },
    end: () => page.touchscreen.touchEnd(),
  }
}

/**
 * Swipe gesture helper for testing.
 * Creates a series of touch events to simulate realistic gesture movement.
 * Uses fixed step sizes for simplicity and reliability.
 */
const gesture = async (
  /** String of directions (e.g., "rd" for right-down) or a Command object with a gesture property. */
  gestureOrCommand: Gesture | Command,
  {
    hold,
    ...position
  }: GesturePositionOptions & {
    /** If true, the gesture will be held and not completed with touchEnd. */
    hold?: boolean
  } = {},
) => {
  const activeGesture = await startGesture(position)
  await activeGesture.move(gestureOrCommand)
  if (!hold) await activeGesture.end()
}

/** End a gesture that was started with hold: true. */
export const endGesture = () => page.touchscreen.touchEnd()

export default gesture
