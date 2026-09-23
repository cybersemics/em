import type { Element } from 'webdriverio'

interface TouchPoint {
  x: number
  y: number
}

/**
 * Arm a one-shot recorder for the next touch and return a reader for where it landed, in viewport coordinates.
 *
 * Touches are delivered in screen coordinates, so this is the only way to see where one actually arrived on the page.
 * The reader returns null if nothing was touched, which is what a touch aimed outside the page looks like.
 */
const recordNextTouch = async (): Promise<() => Promise<TouchPoint | null>> => {
  await browser.execute(() => {
    const w = window as unknown as { __touchPoint: string | null }
    w.__touchPoint = null
    document.addEventListener(
      'pointerdown',
      (e: PointerEvent) => {
        w.__touchPoint = JSON.stringify({ x: Math.round(e.clientX), y: Math.round(e.clientY) })
      },
      { once: true, capture: true },
    )
  })

  return async () => {
    const raw = await browser.execute(() => (window as unknown as { __touchPoint: string | null }).__touchPoint)
    return raw ? (JSON.parse(raw) as TouchPoint) : null
  }
}

export type { Element, TouchPoint }
export default recordNextTouch
