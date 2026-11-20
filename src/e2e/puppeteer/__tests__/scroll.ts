import { KnownDevices } from 'puppeteer'
import cursorBackCommand from '../../../commands/cursorBack'
import clickThought from '../helpers/clickThought'
import closeKeyboard from '../helpers/closeKeyboard'
import deviceEmulation from '../helpers/deviceEmulation'
import gesture, { startGesture } from '../helpers/gesture'
import getEditingText from '../helpers/getEditingText'
import getThoughtTop from '../helpers/getThoughtTop'
import getVisibleThoughtBounds from '../helpers/getVisibleThoughtBounds'
import paste from '../helpers/paste'
import preloadTestFlags from '../helpers/preloadTestFlags'
import press from '../helpers/press'
import refresh from '../helpers/refresh'
import scrollTo from '../helpers/scrollTo'
import waitForBrowserSettled from '../helpers/waitForBrowserSettled'
import waitForCursor from '../helpers/waitForCursor'
import waitForEditable from '../helpers/waitForEditable'
import waitForSmoothScroll from '../helpers/waitForSmoothScroll'
import waitUntil from '../helpers/waitUntil'
import { page } from '../session'
import { usePersistentTreecrdtStorage } from '../setup'

// Keep the upper bound above 450px at the default font size so long pulls exercise the full resistance curve.
const OVERSCROLL_DOCUMENT = `
      - preceding 1
      - preceding 2
      - preceding 3
      - preceding 4
      - a
      - b
      - c
      - d
      - e
      - f
      - g
      - h
      - i
      - j
      - k
      - l
      - m
        - n
        - o
        - p
        - q
        - r
        - s
        - t
        - u
        - v
        - w
        - x
        - y
        - z
          - 1
            - 2
              - 3
    `

const MOCK_REPLICATION_DELAY = 100

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })
usePersistentTreecrdtStorage()
deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

describe('scrollCursorIntoView', () => {
  it('should scroll cursor into view after page refresh with delayed replicateChildren', async () => {
    const importText = `
- a
  - =pin
  - b
  - c
  - d
  - e
  - f
  - g
  - h
  - i
  - j
  - k
  - l
  - m
  - n
  - o
  - p
  - q
  - r
  - s
  - u
  - v
- t
    `

    // Note: initial window.scrollY can be non-zero after paste for some reason.
    // Does not matter since we are asserting the initial scroll position after refresh, but be aware.
    await paste(importText)

    await clickThought('t')

    // Simulate slow TreeCRDT reads during app startup after refresh.
    await preloadTestFlags(page, { replicationDelay: MOCK_REPLICATION_DELAY })

    await refresh()

    // Wait for page to be ready after refresh
    await page.waitForFunction(() => document.readyState === 'complete')

    // Verify the initial scroll position is 0
    const initialScrollY = await page.evaluate(() => window.scrollY)
    expect(initialScrollY).toBe(0)

    // Wait for the cursor to be restored to thought 't'
    await waitForEditable('t')

    // Verify the editing thought is still 't'
    const editingText = await getEditingText()
    expect(editingText).toBe('t')

    // Verify the cursor was scrolled into view after refresh
    await waitUntil(() => {
      const el = document.querySelector('[data-editing=true]')
      if (!el) return false

      const rect = el.getBoundingClientRect()
      const toolbarRect = document.querySelector('[data-testid="toolbar"]')?.getBoundingClientRect()
      const toolbarBottom = toolbarRect ? toolbarRect.bottom : 0

      const viewport = {
        top: toolbarBottom,
        bottom: window.innerHeight,
      }

      const isInViewport = rect.top >= viewport.top && rect.bottom <= viewport.bottom

      // Ensure the cursor is scrolled into view
      return isInViewport && window.scrollY > 0
    })
  })
})

describe('scroll clamp', () => {
  // https://github.com/cybersemics/em/pull/5400#issuecomment-6512974749
  it('clamps to displayed content with safe-area insets', async () => {
    await page.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
    await deviceEmulation.setSafeAreaInsets({ top: 59, bottom: 34, left: 0, right: 0 })
    await paste(`
      - preceding 1
      - preceding 2
      - preceding 3
      - preceding 4
      - preceding 5
      - preceding 6
      - preceding 7
      - preceding 8
      - preceding 9
      - preceding 10
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
      - K
      - L
      - M
      - N
      - O
      - P
      - Q
      - R
      - S
      - T
        - U
          - V
            - W
              - X
                - Y
                  - Z
    `)

    await clickThought('T')
    await waitForCursor('T')
    await closeKeyboard()
    await waitForBrowserSettled()
    await scrollTo(0)
    await waitForBrowserSettled()

    // Earlier displayed siblings stay reachable even when the selected thought leaves the viewport.
    const toolbarBottom = await page.$eval('#toolbar', element => element.getBoundingClientRect().bottom)
    expect(await getThoughtTop('preceding 1')).toBeGreaterThanOrEqual(toolbarBottom)
    expect(await getThoughtTop('T')).toBeGreaterThan(await page.evaluate(() => window.innerHeight))

    await clickThought('T')
    await press('ArrowDown')
    await waitForCursor('U')
    await waitForBrowserSettled()
    await press('ArrowDown')
    await waitForCursor('V')
    await waitForBrowserSettled()
    await press('ArrowDown')
    await waitForCursor('W')
    await waitForBrowserSettled()
    await press('ArrowDown')
    await waitForCursor('X')
    await waitForBrowserSettled()
    await press('ArrowDown')
    await waitForCursor('Y')
    await waitForBrowserSettled()
    await press('ArrowDown')
    await waitForCursor('Z')
    await closeKeyboard()
    await waitForBrowserSettled()
    await scrollTo(0)
    await waitForBrowserSettled()

    const leafBottom = await page.$$eval(
      '[data-editable]',
      elements => elements.find(element => element.textContent === 'Z')!.getBoundingClientRect().bottom,
    )
    const navTop = await page.$eval('[aria-label="nav"]', element => element.getBoundingClientRect().top)
    expect(leafBottom).toBeLessThanOrEqual(navTop)
  })

  it('limits empty space above the visible thoughts', async () => {
    await paste(OVERSCROLL_DOCUMENT)

    await clickThought('m')
    await scrollTo(200)
    await clickThought('z')
    await waitForCursor('z')
    await press('ArrowDown')
    await waitForCursor('1')
    await press('ArrowDown')
    await waitForCursor('2')
    await press('ArrowDown')
    await waitForCursor('3')
    await waitForBrowserSettled()

    await scrollTo(0)
    await waitForBrowserSettled()

    const { minScrollY } = await getVisibleThoughtBounds()
    expect(minScrollY).toBeGreaterThan(0)
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - minScrollY)).toBeLessThan(1)
  })

  it('keeps the footer accessible at the bottom scroll limit', async () => {
    await paste(OVERSCROLL_DOCUMENT)

    await clickThought('m')
    await scrollTo(200)
    await clickThought('z')
    await waitForCursor('z')
    await press('ArrowDown')
    await waitForCursor('1')
    await press('ArrowDown')
    await waitForCursor('2')
    await press('ArrowDown')
    await waitForCursor('3')
    await waitForBrowserSettled()

    await scrollTo(100000)
    await waitForBrowserSettled()

    const { maxScrollY } = await getVisibleThoughtBounds()
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - maxScrollY)).toBeLessThan(1)
    const footerBottom = await page.$eval('[aria-label="footer"]', element => element.getBoundingClientRect().bottom)
    expect(footerBottom).toBeLessThanOrEqual((await page.evaluate(() => window.innerHeight)) + 1)
  })
})

describe('iOS overscroll', () => {
  // https://github.com/cybersemics/em/pull/5400
  it('bounces the footer and navigation together at the bottom with a deep selection', async () => {
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
      - K
      - L
      - M
      - N
      - O
      - Q
      - R
      - S
      - T
        - U
          - V
            - W
              - X
    `)
    await clickThought('T')
    await clickThought('U')
    await clickThought('V')
    await clickThought('W')
    await clickThought('X')
    await waitForBrowserSettled()
    const { minScrollY, maxScrollY } = await getVisibleThoughtBounds()
    expect(minScrollY).toBeGreaterThan(50)
    await scrollTo(maxScrollY)
    await waitForBrowserSettled()
    const footerTop = await page.$eval('[aria-label="footer"]', element => element.getBoundingClientRect().top)
    const navTop = await page.$eval('[aria-label="nav"]', element => element.getBoundingClientRect().top)
    const thoughtTop = await getThoughtTop('X')

    const gesture = await startGesture({ xStart: 350, yStart: 400 })
    await gesture.move('u', { segmentLength: 180 })
    await waitForBrowserSettled()
    const footerTopWhileHeld = await page.$eval('[aria-label="footer"]', element => element.getBoundingClientRect().top)
    const navTopWhileHeld = await page.$eval('[aria-label="nav"]', element => element.getBoundingClientRect().top)
    const displacement = footerTopWhileHeld - footerTop
    expect(displacement).toBeLessThan(-10)
    expect(Math.abs(navTopWhileHeld - navTop - displacement)).toBeLessThan(1)
    expect(Math.abs((await getThoughtTop('X')) - thoughtTop - displacement)).toBeLessThan(1)
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - maxScrollY)).toBeLessThan(1)

    await gesture.move('u', { segmentLength: 90 })
    await waitForBrowserSettled()
    expect(await page.$eval('[aria-label="footer"]', element => element.getBoundingClientRect().top)).toBeLessThan(
      footerTopWhileHeld - 10,
    )
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - maxScrollY)).toBeLessThan(1)
    await gesture.end()
    await page.waitForFunction(
      top => Math.abs(document.querySelector('[aria-label="footer"]')!.getBoundingClientRect().top - top) < 1,
      {},
      footerTop,
    )
    expect(
      Math.abs((await page.$eval('[aria-label="nav"]', element => element.getBoundingClientRect().top)) - navTop),
    ).toBeLessThan(1)
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - maxScrollY)).toBeLessThan(1)
  })

  // https://github.com/cybersemics/em/pull/5400#issuecomment-5935316452
  it('keeps native scrolling at the visible boundary while a deep thought elastically overscrolls', async () => {
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
      - K
      - L
      - M
      - N
      - O
      - Q
      - R
      - S
      - T
        - U
          - V
            - W
              - X
    `)
    await clickThought('T')
    await clickThought('U')
    await clickThought('V')
    await clickThought('W')
    await clickThought('X')
    await waitForBrowserSettled()
    const { minScrollY } = await getVisibleThoughtBounds()
    expect(minScrollY).toBeGreaterThan(50)
    await scrollTo(minScrollY)
    await waitForBrowserSettled()
    const restingTop = await getThoughtTop('V')

    const gesture = await startGesture({ xStart: 350, yStart: 100 })
    await gesture.move('d', { segmentLength: 180 })
    await waitForBrowserSettled()
    expect(await getThoughtTop('V')).toBeGreaterThan(restingTop + 10)
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - minScrollY)).toBeLessThan(1)
    await gesture.end()
    await page.waitForFunction(
      top => {
        const thought = Array.from(document.querySelectorAll('[data-editable]')).find(
          element => element.innerHTML === 'V',
        )
        return !!thought && Math.abs(thought.getBoundingClientRect().top - top) < 1
      },
      {},
      restingTop,
    )
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - minScrollY)).toBeLessThan(1)
  })

  it('keeps yielding with increasing resistance beyond the old overscroll cap', async () => {
    await paste(OVERSCROLL_DOCUMENT)

    await clickThought('m')
    await scrollTo(200)
    await clickThought('z')
    await waitForCursor('z')
    await press('ArrowDown')
    await waitForCursor('1')
    await press('ArrowDown')
    await waitForCursor('2')
    await press('ArrowDown')
    await waitForCursor('3')
    await waitForBrowserSettled()
    const { minScrollY } = await getVisibleThoughtBounds()
    await scrollTo(minScrollY)
    await waitForBrowserSettled()

    expect(minScrollY).toBeGreaterThan(450)
    const topAtBoundary = await getThoughtTop('1')
    const gesture = await startGesture({ xStart: 350, yStart: 100 })
    await gesture.move('d', { segmentLength: 150 })
    await waitForBrowserSettled()
    const firstTop = await getThoughtTop('1')
    await gesture.move('d', { segmentLength: 150 })
    await waitForBrowserSettled()
    const secondTop = await getThoughtTop('1')
    await gesture.move('d', { segmentLength: 150 })
    await waitForBrowserSettled()
    const thirdTop = await getThoughtTop('1')
    await gesture.move('d', { segmentLength: 150 })
    await waitForBrowserSettled()
    const fourthTop = await getThoughtTop('1')
    // The first segment includes native pan-recognition slop. Compare equal travel after recognition.
    expect(firstTop).toBeGreaterThan(topAtBoundary + 10)
    expect(secondTop - firstTop).toBeGreaterThan(thirdTop - secondTop)
    expect(thirdTop - secondTop).toBeGreaterThan(fourthTop - thirdTop)
    expect(fourthTop - thirdTop).toBeGreaterThan(1)
    await gesture.end()
  })

  it('resumes from the current stretch when a return animation is interrupted', async () => {
    await paste(OVERSCROLL_DOCUMENT)

    await clickThought('m')
    await scrollTo(200)
    await clickThought('z')
    await waitForCursor('z')
    await press('ArrowDown')
    await waitForCursor('1')
    await press('ArrowDown')
    await waitForCursor('2')
    await press('ArrowDown')
    await waitForCursor('3')
    await waitForBrowserSettled()
    const { minScrollY } = await getVisibleThoughtBounds()
    await scrollTo(minScrollY)
    await waitForBrowserSettled()

    const topAtBoundary = await getThoughtTop('1')
    const gesture = await startGesture({ xStart: 350, yStart: 100 })
    await gesture.move('d', { segmentLength: 180 })
    await waitForBrowserSettled()
    await gesture.end()
    const resumed = await startGesture({ xStart: 350, yStart: 100 })
    const heldTop = await getThoughtTop('1')
    expect(heldTop - topAtBoundary).toBeGreaterThan(10)
    await waitForBrowserSettled()
    expect(Math.abs((await getThoughtTop('1')) - heldTop)).toBeLessThan(1)
    await resumed.move('d', { segmentLength: 60 })
    await waitForBrowserSettled()
    const pulledTop = await getThoughtTop('1')
    expect(pulledTop).toBeGreaterThan(heldTop + 5)
    await resumed.move('u', { segmentLength: 60 })
    await waitForBrowserSettled()
    // Native pan recognition consumes the first few pixels, so opposite finger travel need not return to the same point.
    expect(await getThoughtTop('1')).toBeLessThan(pulledTop - 5)
    await resumed.end()
    await page.waitForFunction(
      top => {
        const thought = Array.from(document.querySelectorAll('[data-editable]')).find(
          element => element.innerHTML === '1',
        )
        return !!thought && Math.abs(thought.getBoundingClientRect().top - top) < 1
      },
      {},
      topAtBoundary,
    )
  })
})

describe('iOS scroll continuity', () => {
  it('leaves command gestures in charge when the thoughtspace has interior scroll bounds', async () => {
    await paste(OVERSCROLL_DOCUMENT)
    await clickThought('m')
    await scrollTo(200)
    await clickThought('z')
    await press('ArrowDown')
    await waitForCursor('1')
    await waitForBrowserSettled()
    await press('ArrowDown')
    await waitForCursor('2')
    await waitForBrowserSettled()
    await press('ArrowDown')
    await waitForCursor('3')
    await waitForBrowserSettled()
    const { minScrollY } = await getVisibleThoughtBounds()
    expect(minScrollY).toBeGreaterThan(450)

    await gesture(cursorBackCommand, { xStart: 150, yStart: 300 })
    await waitForCursor('2')
  })

  it('keeps autoscrolling while a long-pressed thought is dragged at the screen edge', async () => {
    await paste(Array.from({ length: 40 }, (_, index) => `- thought ${index + 1}`).join('\n'))
    await press('Escape')
    await scrollTo(0)
    await waitForBrowserSettled()

    const source = (await waitForEditable('thought 1')).asElement()
    if (!source) throw new Error('Drag source thought is not available.')
    const bullet = await source.evaluateHandle(element =>
      element instanceof Element
        ? element.closest('[aria-label="thought-container"]')?.querySelector('[aria-label="bullet"]')
        : null,
    )
    const position = await bullet.asElement()?.boundingBox()
    if (!position) throw new Error('Drag source bullet has no bounding box.')

    const drag = await startGesture({
      xStart: position.x + position.width / 2,
      yStart: position.y + position.height / 2,
    })
    try {
      await page.waitForFunction(element => element?.getAttribute('data-highlighted') === 'true', {}, bullet)
      const viewport = page.viewport()
      if (!viewport) throw new Error('Viewport is not available.')
      await drag.move('d', {
        segmentLength: viewport.height - 60 - (position.y + position.height / 2),
        stepSize: 40,
      })
      await page.waitForSelector('[data-drag-in-progress="true"]')
      const scrollY = await page.evaluate(() => window.scrollY)
      const scrollYAfterFrames = await page.evaluate(
        start =>
          new Promise<number>(resolve => {
            /** Samples the frame-driven autoscroll while the drag remains held. */
            const sample = (remaining = 30) => {
              if (remaining === 0 || window.scrollY > start + 80) resolve(window.scrollY)
              else requestAnimationFrame(() => sample(remaining - 1))
            }
            requestAnimationFrame(() => sample())
          }),
        scrollY,
      )
      expect(scrollYAfterFrames).toBeGreaterThan(scrollY + 80)
    } finally {
      await drag.end()
    }
  })

  it('leaves no temporary displacement after an ordinary in-range swipe', async () => {
    await paste(OVERSCROLL_DOCUMENT)

    await clickThought('m')
    await scrollTo(200)
    await clickThought('z')
    await waitForCursor('z')
    await press('ArrowDown')
    await waitForCursor('1')
    await press('ArrowDown')
    await waitForCursor('2')
    await press('ArrowDown')
    await waitForCursor('3')
    await waitForBrowserSettled()
    const { minScrollY } = await getVisibleThoughtBounds()
    await scrollTo(minScrollY)
    await waitForBrowserSettled()

    expect(minScrollY).toBeGreaterThan(450)

    const topInDocument = await getThoughtTop('1', { relativeTo: 'document' })
    await scrollTo(minScrollY + 250)
    await waitForBrowserSettled()
    const gesture = await startGesture({ xStart: 350, yStart: 100 })
    await gesture.move('d', { segmentLength: 60 })
    await waitForBrowserSettled()
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(minScrollY + 100)
    await gesture.end()
    await waitForBrowserSettled()
    expect(Math.abs((await getThoughtTop('1', { relativeTo: 'document' })) - topInDocument)).toBeLessThan(1)
  })

  it('suspends custom scrolling when a second finger joins an active pan', async () => {
    await paste(OVERSCROLL_DOCUMENT)

    await clickThought('m')
    await scrollTo(200)
    await clickThought('z')
    await waitForCursor('z')
    await press('ArrowDown')
    await waitForCursor('1')
    await press('ArrowDown')
    await waitForCursor('2')
    await press('ArrowDown')
    await waitForCursor('3')
    await waitForBrowserSettled()
    const { minScrollY } = await getVisibleThoughtBounds()
    await scrollTo(minScrollY)
    await waitForBrowserSettled()

    expect(minScrollY).toBeGreaterThan(450)

    const firstFinger = await startGesture({ xStart: 350, yStart: 100 })
    await firstFinger.move('d', { segmentLength: 180 })
    await waitForBrowserSettled()
    const secondFinger = await startGesture({ xStart: 350, yStart: 500 })
    await waitForBrowserSettled()
    const heldTop = await getThoughtTop('1')
    await firstFinger.move('d', { segmentLength: 40 })
    await waitForBrowserSettled()
    expect(Math.abs((await getThoughtTop('1')) - heldTop)).toBeLessThan(1)
    await firstFinger.end()
    await secondFinger.move('u', { segmentLength: 60 })
    await waitForBrowserSettled()
    expect(Math.abs((await getThoughtTop('1')) - heldTop)).toBeLessThan(1)
    await secondFinger.end()
  })

  it('lets deliberate navigation take over while a finger holds an interrupted return', async () => {
    await paste(OVERSCROLL_DOCUMENT)

    await clickThought('m')
    await scrollTo(200)
    await clickThought('z')
    await waitForCursor('z')
    await press('ArrowDown')
    await waitForCursor('1')
    await press('ArrowDown')
    await waitForCursor('2')
    await press('ArrowDown')
    await waitForCursor('3')
    await waitForBrowserSettled()
    const { minScrollY } = await getVisibleThoughtBounds()
    await scrollTo(minScrollY)
    await waitForBrowserSettled()

    expect(minScrollY).toBeGreaterThan(450)

    const topInDocument = await getThoughtTop('1', { relativeTo: 'document' })
    const gesture = await startGesture({ xStart: 350, yStart: 100 })
    await gesture.move('d', { segmentLength: 180 })
    await waitForBrowserSettled()
    await gesture.end()
    const held = await startGesture({ xStart: 350, yStart: 100 })
    await scrollTo(minScrollY + 40)
    await waitForBrowserSettled()
    // A queued native frame can move a few pixels after navigation. It must still supersede the old anchor.
    const navigationY = await page.evaluate(() => window.scrollY)
    expect(navigationY).toBeGreaterThan(minScrollY + 30)
    expect(Math.abs((await getThoughtTop('1', { relativeTo: 'document' })) - topInDocument)).toBeLessThan(1)
    await held.end()
    await waitForBrowserSettled()
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - navigationY)).toBeLessThan(1)
  })

  it('keeps a held overscroll responsive when the viewport height changes', async () => {
    await paste(OVERSCROLL_DOCUMENT)

    await clickThought('m')
    await scrollTo(200)
    await clickThought('z')
    await waitForCursor('z')
    await press('ArrowDown')
    await waitForCursor('1')
    await press('ArrowDown')
    await waitForCursor('2')
    await press('ArrowDown')
    await waitForCursor('3')
    await waitForBrowserSettled()
    const { minScrollY } = await getVisibleThoughtBounds()
    await scrollTo(minScrollY)
    await waitForBrowserSettled()

    expect(minScrollY).toBeGreaterThan(450)

    const gesture = await startGesture({ xStart: 350, yStart: 100 })
    await gesture.move('d', { segmentLength: 180 })
    await waitForBrowserSettled()
    const viewport = page.viewport()!
    await page.setViewport({ ...viewport, height: viewport.height - 40 })
    await waitForBrowserSettled()
    const topAfterResize = await getThoughtTop('1')
    await gesture.move('d', { segmentLength: 60 })
    await waitForBrowserSettled()
    expect(await getThoughtTop('1')).toBeGreaterThan(topAfterResize + 5)
    await gesture.end()
    await page.waitForFunction(min => window.scrollY >= min - 1, {}, minScrollY + 32)
  })
})

describe('iOS momentum', () => {
  // https://github.com/cybersemics/em/pull/5400#issuecomment-6132655766
  it('slows smoothly between whole pixels while coasting inside the scroll limits', async () => {
    await paste(OVERSCROLL_DOCUMENT)
    await clickThought('m')
    await scrollTo(200)
    await clickThought('z')
    await waitForCursor('z')
    await press('ArrowDown')
    await waitForCursor('1')
    await press('ArrowDown')
    await waitForCursor('2')
    await press('ArrowDown')
    await waitForCursor('3')
    await waitForBrowserSettled()
    const { minScrollY, maxScrollY } = await getVisibleThoughtBounds()
    await scrollTo(minScrollY + 100)
    await waitForBrowserSettled()

    const topBeforeSwipe = await getThoughtTop('1')
    const swipe = await startGesture({ xStart: 350, yStart: 450 })
    await swipe.move('u', { segmentLength: 80, stepSize: 5 })
    await swipe.end()

    await waitForSmoothScroll('1')
    expect(await getThoughtTop('1')).toBeLessThan(topBeforeSwipe - 80)
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(maxScrollY - 20)
  })

  it('continues momentum when an interrupted stretch is dragged back inside the range', async () => {
    await paste(OVERSCROLL_DOCUMENT)

    await clickThought('m')
    await scrollTo(200)
    await clickThought('z')
    await waitForCursor('z')
    await press('ArrowDown')
    await waitForCursor('1')
    await press('ArrowDown')
    await waitForCursor('2')
    await press('ArrowDown')
    await waitForCursor('3')
    await waitForBrowserSettled()
    const { minScrollY } = await getVisibleThoughtBounds()
    await scrollTo(minScrollY)
    await waitForBrowserSettled()

    expect(minScrollY).toBeGreaterThan(450)

    const topInDocument = await getThoughtTop('1', { relativeTo: 'document' })
    const gesture = await startGesture({ xStart: 350, yStart: 100 })
    await gesture.move('d', { segmentLength: 180 })
    await waitForBrowserSettled()
    await gesture.end()
    const resumed = await startGesture({ xStart: 350, yStart: 600 })
    await resumed.move('u', { segmentLength: 220, stepSize: 40 })
    const topBeforeFlick = await getThoughtTop('1')
    expect(topBeforeFlick).toBeLessThan(topInDocument - minScrollY - 20)
    // Measure before the final flick so page round trips cannot turn its release into a pause.
    await resumed.move('u', { segmentLength: 80, stepSize: 40 })
    await resumed.end()
    await page.waitForFunction(
      top => {
        const thought = Array.from(document.querySelectorAll('[data-editable]')).find(
          element => element.innerHTML === '1',
        )
        return !!thought && thought.getBoundingClientRect().top < top - 90
      },
      {},
      topBeforeFlick,
    )
    expect(Math.abs((await getThoughtTop('1', { relativeTo: 'document' })) - topInDocument)).toBeLessThan(1)
  })

  it('coasts from inside the range into a boundary spring instead of stopping abruptly', async () => {
    await paste(OVERSCROLL_DOCUMENT)

    await clickThought('m')
    await scrollTo(200)
    await clickThought('z')
    await waitForCursor('z')
    await press('ArrowDown')
    await waitForCursor('1')
    await press('ArrowDown')
    await waitForCursor('2')
    await press('ArrowDown')
    await waitForCursor('3')
    await waitForBrowserSettled()
    const { minScrollY } = await getVisibleThoughtBounds()
    await scrollTo(minScrollY)
    await waitForBrowserSettled()

    const topAtBoundary = await getThoughtTop('1')
    await scrollTo(minScrollY + 160)
    await waitForBrowserSettled()
    const gesture = await startGesture({ xStart: 350, yStart: 100 })
    await gesture.move('d', { segmentLength: 80, stepSize: 40 })
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(minScrollY + 60)
    // End with two fresh input samples; the assertion round trip may have outlasted the velocity window.
    await gesture.move('d', { segmentLength: 40, stepSize: 20 })
    await gesture.end()
    await page.waitForFunction(
      top => {
        const thought = Array.from(document.querySelectorAll('[data-editable]')).find(
          element => element.innerHTML === '1',
        )
        return !!thought && thought.getBoundingClientRect().top > top + 5
      },
      {},
      topAtBoundary,
    )
    await page.waitForFunction(
      top => {
        const thought = Array.from(document.querySelectorAll('[data-editable]')).find(
          element => element.innerHTML === '1',
        )
        return !!thought && Math.abs(thought.getBoundingClientRect().top - top) < 1
      },
      {},
      topAtBoundary,
    )
    // Visible proximity precedes spring completion. Wait for normalization, then verify it preserves the resting view.
    await page.waitForFunction(min => Math.abs(window.scrollY - min) < 1, {}, minScrollY)
    expect(Math.abs((await getThoughtTop('1')) - topAtBoundary)).toBeLessThan(1)
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - minScrollY)).toBeLessThan(1)
  })
})
