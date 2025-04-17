import { page } from '../setup'

/** Draw a gesture on the screen. */
const swipePoints = async (points: { x: number; y: number }[], complete: boolean = true) => {
  const start = points[0]

  await page.touchscreen.touchStart(start.x, start.y)

  for (let i = 1; i < points.length; i++) {
    await page.touchscreen.touchMove(points[i].x, points[i].y)
  }

  if (complete) {
    await page.touchscreen.touchEnd()
  }
}

/** Swipe right. */
// TODO: Support other directions and multiple swipes.
const swipe = async (direction: 'r' | 'l', complete: boolean = true) => {
  const anchor = direction === 'l' ? 250 : 100
  const delta = direction === 'l' ? -10 : 10
  const y = 100
  await swipePoints(
    new Array(15).fill(0).map((_, i) => ({ x: anchor + delta * i, y })),
    complete,
  )
}

export default swipe
