import Direction from '../../../@types/Direction'
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
  const xStepSize = x2 > x1 ? stepSize : x1 > x2 ? -stepSize : 0
  const yStepSize = y2 > y1 ? stepSize : y1 > y2 ? -stepSize : 0
  let curX = x1
  let curY = y1

  while (curX < x2 || curY < y2) {
    await page.touchscreen.touchMove(curX, curY)
    if (curX < x2) {
      curX += xStepSize
    }
    if (curY < y2) {
      curY += yStepSize
    }
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
const swipe = async (gesture: string, completeGesture = false) => {
  const directions = gesture.split('') as Direction[]

  // Fixed step sizes for consistent gesture behavior
  const stepSize = 80

  // Starting position for the gesture
  let y = 300
  let x = 100

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
