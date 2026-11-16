/**
 * Native iOS gesture tests that need a newer WebKit than the suite's default device. Runs on iOS 27.
 * Uses WDIO test runner with Mocha framework.
 */
import clickThought from '../helpers/clickThought'
import getScreenOffsetY from '../helpers/getScreenOffsetY.js'
import isKeyboardShown from '../helpers/isKeyboardShown'
import paste from '../helpers/paste'
import setSelection from '../helpers/setSelection'
import tap from '../helpers/tap'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

describe('Gestures', () => {
  // https://github.com/cybersemics/em/issues/5844
  // The latch this depends on is also covered by unit tests in src/util/__tests__/initEvents.lifecycle.ts. Ethan James
  // authorized covering it at both levels: the unit tests are simple, and only a device shows the pan they prevent.
  it.skip('does not move the page when a drag starts on the bullet beside the caret', async () => {
    await paste(`
      - A
      - B
      - C
      - D
      - E
      - F
      - G
      - H
      - I
      - J
    `)
    await clickThought('D')
    await tap(await waitForEditable('D'), { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)
    expect(await setSelection(0, 0)).toMatchObject({ type: 'Caret' })

    // Safari may still be scrolling the focused thought into view after the keyboard appears
    let lastScrollY: number | undefined
    await waitUntil(async () => {
      const scrollY = await browser.execute(() => window.scrollY)
      const settled = scrollY === lastScrollY
      lastScrollY = scrollY
      return settled
    })

    // The bullet overlaps the editable's left edge, within reach of a caret at the start of the text. Touches arrive
    // 1px below where they are aimed, so aim at the middle of the line, where a pixel either way is still the edge.
    const point = await browser.execute(() => {
      const rect = (document.activeElement as HTMLElement).getBoundingClientRect()
      return { x: Math.ceil(rect.left), y: Math.round(rect.top + rect.height / 2) }
    })
    const target = await browser.execute(
      (x: number, y: number) => document.elementFromPoint(x, y)?.closest('[aria-label="bullet"]') !== null,
      point.x,
      point.y,
    )
    if (!target) throw new Error(`The point ${point.x},${point.y} is not on the bullet.`)

    // Safari pans the page by collapsing and expanding its bar above the keyboard, which changes the visual viewport's
    // height, as well as by scrolling the document, so both are watched for the whole drag.
    await browser.execute(() => {
      const w = window as unknown as { pageMoved: { minHeight: number; maxScroll: number } }
      w.pageMoved = { minHeight: window.visualViewport!.height, maxScroll: window.scrollY }
      /** Records the smallest visual viewport and the furthest scroll seen. */
      const record = () => {
        w.pageMoved.minHeight = Math.min(w.pageMoved.minHeight, window.visualViewport!.height)
        w.pageMoved.maxScroll = Math.max(w.pageMoved.maxScroll, window.scrollY)
      }
      window.visualViewport!.addEventListener('resize', record)
      window.addEventListener('scroll', record)
    })
    const before = await browser.execute(() => ({ height: window.visualViewport!.height, scrollY: window.scrollY }))

    // Hold past MAGNIFIER_DELAY, so the moves are let through if the press is taken for a press on the caret, then
    // drag up and down as when reaching for the caret.
    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          {
            type: 'pointerMove',
            duration: 0,
            origin: 'viewport',
            x: point.x,
            y: point.y + (await getScreenOffsetY()) - 1,
          },
          { type: 'pointerDown', button: 0 },
          // a pause would let the driver spread the drag that follows across the hold
          { type: 'pointerMove', duration: 400, origin: 'pointer', x: 0, y: 0 },
          { type: 'pointerMove', duration: 400, origin: 'pointer', x: 0, y: 150 },
          { type: 'pointerMove', duration: 400, origin: 'pointer', x: 0, y: -150 },
          { type: 'pointerMove', duration: 400, origin: 'pointer', x: 0, y: 150 },
          { type: 'pointerMove', duration: 400, origin: 'pointer', x: 0, y: -150 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])

    const moved = await browser.execute(
      () => (window as unknown as { pageMoved: { minHeight: number; maxScroll: number } }).pageMoved,
    )
    expect(Math.round(before.height - moved.minHeight)).toBe(0)
    // scrollY drifts by a pixel even when nothing pans
    expect(moved.maxScroll - before.scrollY).toBeLessThanOrEqual(1)
  })
})
