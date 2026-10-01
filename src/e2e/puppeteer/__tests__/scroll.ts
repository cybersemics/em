import { KnownDevices } from 'puppeteer'
import type { PreloadedEmWindow } from '../../../@types'
import clickThought from '../helpers/clickThought'
import deviceEmulation from '../helpers/deviceEmulation'
import { startGesture } from '../helpers/gesture'
import getEditingText from '../helpers/getEditingText'
import getThoughtTop from '../helpers/getThoughtTop'
import getVisibleThoughtBounds from '../helpers/getVisibleThoughtBounds'
import paste from '../helpers/paste'
import press from '../helpers/press'
import refresh from '../helpers/refresh'
import scrollTo from '../helpers/scrollTo'
import waitForBrowserSettled from '../helpers/waitForBrowserSettled'
import waitForCursor from '../helpers/waitForCursor'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'
import { page } from '../session'
import { usePersistentTreecrdtStorage } from '../setup'

const OVERSCROLL_DOCUMENT = `
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
    await page.evaluateOnNewDocument(value => {
      const preloadedWindow = window as unknown as PreloadedEmWindow
      preloadedWindow.em = {
        ...preloadedWindow.em,
        testFlags: {
          ...preloadedWindow.em?.testFlags,
          replicationDelay: value,
        },
      }
    }, MOCK_REPLICATION_DELAY)

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
  it('clamps window scrolling to visible content while preserving footer access', async () => {
    const importText = `
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

    await paste(importText)

    await clickThought('m')

    // scroll down so that deep descendants are rendered and visible
    await scrollTo(200)

    await clickThought('z')
    await waitForCursor('z')
    await waitForBrowserSettled()
    await press('ArrowDown')
    await waitForCursor('1')
    await waitForBrowserSettled()
    await press('ArrowDown')
    await waitForCursor('2')
    await waitForBrowserSettled()
    await press('ArrowDown')
    await waitForCursor('3')
    await waitForBrowserSettled()

    const { minScrollY, viewportAllowance, viewportTopBoundary } = await getVisibleThoughtBounds()
    expect(minScrollY).toBeGreaterThan(1)
    await scrollTo(minScrollY)
    await waitForBrowserSettled()
    const topBeforeOverscroll = await getThoughtTop('1')
    const scrollYBeforeOverscroll = await page.evaluate(() => window.scrollY)
    const viewport = await page.viewport()
    if (!viewport) {
      throw new Error('Missing viewport.')
    }
    const activeGesture = await startGesture({
      // Start in the scroll zone to preserve native page scroll behavior while touching.
      xStart: (viewport.width * 7) / 8,
      yStart: viewport.height / 3,
    })

    await activeGesture.move('d', { segmentLength: 200 })
    await waitForBrowserSettled()
    const scrollTopWhileTouching = await page.evaluate(() => window.scrollY)
    expect(scrollTopWhileTouching).toBeLessThan(minScrollY - 1)
    const topWhileTouching = await getThoughtTop('1')
    const rawScrollDelta = Math.abs(scrollYBeforeOverscroll - scrollTopWhileTouching)
    const visualDelta = Math.abs(topWhileTouching - topBeforeOverscroll)
    expect(visualDelta).toBeGreaterThan(0.5)
    expect(visualDelta).toBeLessThan(rawScrollDelta)

    await page.evaluate(() => {
      const runtimeWindow = window as unknown as { __releaseSamples: Promise<{ scrollY: number; top: number }[]> }
      runtimeWindow.__releaseSamples = new Promise(resolve => {
        const anchor = document.querySelector('[data-editing=true]') as HTMLElement | null
        if (!anchor) {
          throw new Error('Missing editing thought for release samples.')
        }

        const samples: { scrollY: number; top: number }[] = []
        /** Captures the current scroll position and anchor top for release-frame assertions. */
        const capture = () => {
          samples.push({ scrollY: window.scrollY, top: anchor.getBoundingClientRect().top })
        }
        /** Samples the synchronous release handoff, then starts frame-by-frame spring sampling. */
        const onRelease = () => {
          capture()
          queueMicrotask(() => {
            capture()
            let frames = 0
            /** Samples geometry on animation frames until enough samples are collected. */
            const sampleFrame = () => {
              capture()
              frames += 1
              if (frames >= 5) {
                resolve(samples)
                return
              }
              requestAnimationFrame(sampleFrame)
            }
            requestAnimationFrame(sampleFrame)
          })
        }
        window.addEventListener('touchend', onRelease, { capture: true, once: true })
        window.addEventListener('touchcancel', onRelease, { capture: true, once: true })
      })
    })

    await activeGesture.end()
    await page.waitForFunction(min => Math.abs(window.scrollY - min) <= 1, {}, minScrollY)
    const releaseSamples = await page.evaluate(
      () => (window as unknown as { __releaseSamples: Promise<{ scrollY: number; top: number }[]> }).__releaseSamples,
    )
    const firstSample = releaseSamples[0]
    const lastSample = releaseSamples[releaseSamples.length - 1]
    expect(Math.abs(releaseSamples[1].top - firstSample.top)).toBeLessThanOrEqual(1)
    expect(Math.abs(lastSample.top - firstSample.top)).toBeGreaterThan(2)
    expect(Math.abs(lastSample.scrollY - minScrollY)).toBeLessThanOrEqual(1)

    const scrollTopClamped = await page.evaluate(() => window.scrollY)
    expect(scrollTopClamped).toBeGreaterThanOrEqual(minScrollY - 1)
    expect(scrollTopClamped).toBeLessThanOrEqual(minScrollY + 1)

    await page.waitForFunction(
      maxTop => {
        const thought = Array.from(document.querySelectorAll('[data-editable]')).find(
          element => element.innerHTML === '1',
        )
        return thought ? thought.getBoundingClientRect().top <= maxTop : false
      },
      {},
      viewportTopBoundary + viewportAllowance + 2,
    )
    const topThoughtAfterClamp = await getThoughtTop('1')
    expect(topThoughtAfterClamp).toBeLessThanOrEqual(viewportTopBoundary + viewportAllowance + 2)

    await scrollTo(100000)
    await waitForBrowserSettled()
    const footerRect = await page.$eval('[aria-label="footer"]', element => {
      const rect = element.getBoundingClientRect()
      return { bottom: rect.bottom, top: rect.top }
    })
    const viewportHeight = await page.evaluate(() => window.innerHeight)
    expect(footerRect.top).toBeLessThan(viewportHeight)
    expect(footerRect.bottom).toBeLessThanOrEqual(viewportHeight + 1)
  })
})

describe('iOS overscroll', () => {
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
    await resumed.move('u', { segmentLength: 300, stepSize: 40 })
    const topAtRelease = await getThoughtTop('1')
    expect(topAtRelease).toBeLessThan(topInDocument - minScrollY - 40)
    await resumed.end()
    await page.waitForFunction(
      top => {
        const thought = Array.from(document.querySelectorAll('[data-editable]')).find(
          element => element.innerHTML === '1',
        )
        return !!thought && thought.getBoundingClientRect().top < top - 10
      },
      {},
      topAtRelease,
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
    await gesture.move('d', { segmentLength: 120, stepSize: 40 })
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(minScrollY + 20)
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
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - minScrollY)).toBeLessThan(1)
  })
})
