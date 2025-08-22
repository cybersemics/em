import Direction from '../../../@types/Direction'
import GesturePath from '../../../@types/GesturePath'
import { page } from '../setup'

/**
 * Helper function to smoothly move touch from one point to another.
 * Creates a series of touchMove events to simulate realistic gesture movement.
 *
 * @param x1 - Starting X coordinate.
 * @param y1 - Starting Y coordinate.
 * @param x2 - Ending X coordinate.
 * @param y2 - Ending Y coordinate.
 */
const move = async (x1: number, y1: number, x2: number, y2: number): Promise<void> => {
  const stepSize = 10

  // Calculate total distance and number of steps
  const deltaX = x2 - x1
  const deltaY = y2 - y1
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

  if (distance === 0) return

  const numSteps = Math.max(1, Math.ceil(distance / stepSize))
  const xStep = deltaX / numSteps
  const yStep = deltaY / numSteps

  // Generate intermediate points
  for (let i = 1; i <= numSteps; i++) {
    const curX = x1 + xStep * i
    const curY = y1 + yStep * i
    await page.touchscreen.touchMove(curX, curY)
  }
}

/** Draw a gesture on the screen. */
const swipePoints = async (points: { x: number; y: number }[], complete: boolean = true) => {
  const start = points[0]

  await page.touchscreen.touchStart(start.x, start.y)

  for (let i = 1; i < points.length; i++) {
    await move(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y)
  }

  if (complete) {
    await page.touchscreen.touchEnd()
  }
}

/**
 * Swipe gesture helper for testing.
 * Creates a series of touch events to simulate realistic gesture movement.
 * Uses fixed step sizes for simplicity and reliability.
 *
 * @param gesture - String of directions (e.g., "rd" for right-down).
 * @param completeGesture - Whether to complete the gesture with touchEnd
 * Set to false to test during-gesture behavior.
 * Set to true to test post-gesture behavior.
 */
const swipe = async (gesture: GesturePath, completeGesture = false) => {
  const directions = typeof gesture === 'string' ? (gesture.split('') as Direction[]) : gesture

  // Fixed step sizes for consistent gesture behavior
  const stepSize = 80

  // Starting position more reliably in gesture zone
  // For iPhone 15 Pro (393px wide), gesture zone is approximately x < 295px
  // Use center-left area to ensure we're in the gesture zone
  let x = 150
  let y = 350

  // Generate points for each direction in the gesture
  const points = [{ x, y }]
  for (const direction of directions) {
    switch (direction) {
      case 'r':
        x += stepSize
        break
      case 'l':
        x -= stepSize
        break
      case 'd':
        y += stepSize
        break
      case 'u':
        y -= stepSize
        break
    }
    points.push({ x, y })
  }

  // Execute the gesture with optional completion
  await swipePoints(points, completeGesture)
}

export default swipe
