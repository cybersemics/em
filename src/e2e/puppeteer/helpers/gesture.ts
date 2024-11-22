import { page } from '../setup'

/** Draw a gesture on the screen. */
const gesture = async (points: { x: number; y: number }[], complete: boolean = true) => {
  const start = points[0]

  await page.touchscreen.touchStart(start.x, start.y)

  for (let i = 1; i < points.length; i++) await page.touchscreen.touchMove(points[i].x, points[i].y)

  if (complete) await page.touchscreen.touchEnd()
}

export default gesture

export const drawHorizontalLineGesture = (y: number = 100) =>
  gesture(
    [
      { x: 100, y },
      { x: 110, y },
      { x: 120, y },
      { x: 130, y },
      { x: 140, y },
      { x: 150, y },
      { x: 160, y },
      { x: 170, y },
      { x: 180, y },
      { x: 190, y },
      { x: 200, y },
      { x: 210, y },
      { x: 220, y },
      { x: 230, y },
      { x: 240, y },
      { x: 250, y },
      { x: 260, y },
      { x: 270, y },
      { x: 280, y },
      { x: 290, y },
      { x: 300, y },
    ],
    false,
  )
