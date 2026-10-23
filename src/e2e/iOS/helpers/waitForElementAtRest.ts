import type { Element } from 'webdriverio'

/**
 * How many consecutive animation frames the element's rect must stay unchanged before it counts as at rest. The
 * cursor scroll that follows a paste starts three or four frames after the pasted thoughts render, so a shorter window
 * can resolve in the pause before the element starts to move.
 */
const STILL_FRAMES = 10

/** The watcher's state, kept on window so that each poll can read it. */
interface AtRestWatch {
  atRest: boolean
  rect: string
}

/**
 * Waits until an element stops moving, i.e. its rect is unchanged for STILL_FRAMES consecutive animation frames.
 * Call it before tapping an element that has just rendered, since tap reads the element's rect once and a touch aimed
 * at a moving element lands on whatever has moved under it. The rect is compared on every frame in the page, and the
 * result is polled, since WebKit's execute does not wait for a returned promise.
 */
const waitForElementAtRest = async (nodeHandle: Element, { timeout = 5000 }: { timeout?: number } = {}) => {
  await browser.execute(
    (ele, stillFrames) => {
      const w = window as unknown as { elementAtRestWatch?: AtRestWatch }
      const watch: AtRestWatch = { atRest: false, rect: '' }
      w.elementAtRestWatch = watch
      /** Compares the element's rect on the next frame to the one before it, until it has been still for stillFrames frames. */
      const check = (still: number) =>
        requestAnimationFrame(() => {
          // stop if a later call has replaced this watch
          if (w.elementAtRestWatch !== watch) return
          const { x, y, width, height } = (ele as unknown as HTMLElement).getBoundingClientRect()
          const rect = JSON.stringify({ x, y, width, height })
          const stillNew = rect === watch.rect ? still + 1 : 0
          watch.rect = rect
          if (stillNew >= stillFrames) {
            watch.atRest = true
          } else {
            check(stillNew)
          }
        })
      check(0)
    },
    nodeHandle,
    STILL_FRAMES,
  )

  try {
    await browser.waitUntil(
      () =>
        browser.execute(() => !!(window as unknown as { elementAtRestWatch?: AtRestWatch }).elementAtRestWatch?.atRest),
      { timeout, interval: 50 },
    )
  } catch {
    const rect = await browser.execute(
      () => (window as unknown as { elementAtRestWatch?: AtRestWatch }).elementAtRestWatch?.rect,
    )
    throw new Error(`Expected the element to come to rest within ${timeout}ms, but it was still moving at ${rect}.`)
  }
}

export default waitForElementAtRest
