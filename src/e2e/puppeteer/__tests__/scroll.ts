import { KnownDevices } from 'puppeteer'
import type { PreloadedEmWindow } from '../../../@types'
import clickThought from '../helpers/clickThought'
import deviceEmulation from '../helpers/deviceEmulation'
import { startGesture } from '../helpers/gesture'
import getEditingText from '../helpers/getEditingText'
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

const MOCK_REPLICATION_DELAY = 100

/** Gets the y position of a thought relative to the viewport. Throws if the thought is not rendered. */
const getThoughtTop = async (value: string): Promise<number> => {
  const top = await page.evaluate(value => {
    const thought = Array.from(document.querySelectorAll('[data-editable]')).find(
      element => element.innerHTML === value,
    )
    return thought ? thought.getBoundingClientRect().top : null
  }, value)
  if (top === null) throw new Error(`Thought "${value}" is not rendered.`)
  return top
}

/** Returns the visible-thought scroll clamp bounds derived from current DOM geometry. */
const getVisibleThoughtBounds = async (): Promise<{
  maxScrollY: number
  minScrollY: number
  viewportAllowance: number
  viewportBottomBoundary: number
  viewportTopBoundary: number
}> =>
  page.evaluate(() => {
    const visibleRects = Array.from(document.querySelectorAll<HTMLElement>('[data-editable]'))
      .filter(element => {
        let currentElement: HTMLElement | null = element
        while (currentElement) {
          const style = window.getComputedStyle(currentElement)
          if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) <= 0.01) {
            return false
          }
          currentElement = currentElement.parentElement
        }
        return true
      })
      .map(element => element.getBoundingClientRect())

    if (!visibleRects.length) {
      throw new Error('No visible thoughts found.')
    }

    const visibleTopDocument = Math.min(...visibleRects.map(rect => rect.top + window.scrollY))
    const visibleBottomDocument = Math.max(...visibleRects.map(rect => rect.bottom + window.scrollY))
    const viewportTopBoundary = document.getElementById('toolbar')?.getBoundingClientRect().bottom || 0
    const navHeight = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect().height || 0
    const footerRect = document.querySelector('[aria-label="footer"]')?.getBoundingClientRect()
    const viewportBottomBoundary = window.innerHeight - navHeight
    const viewportUsableHeight = Math.max(1, viewportBottomBoundary - viewportTopBoundary)
    const viewportAllowance = viewportUsableHeight * 0.8
    const minScrollY = Math.max(0, visibleTopDocument - (viewportTopBoundary + viewportAllowance))
    const visibleContentBottom = Math.max(visibleBottomDocument, footerRect ? footerRect.bottom + window.scrollY : 0)
    const maxScrollY = Math.max(minScrollY, visibleContentBottom - (viewportBottomBoundary - viewportAllowance))

    return { minScrollY, maxScrollY, viewportTopBoundary, viewportBottomBoundary, viewportAllowance }
  })

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
    await scrollTo(0, 200)

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

    await scrollTo(0, 0)
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
        /** Starts frame-by-frame sampling immediately after touch release. */
        const onRelease = () => {
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
        }
        window.addEventListener('touchend', onRelease, { once: true })
        window.addEventListener('touchcancel', onRelease, { once: true })
      })
    })

    await activeGesture.end()
    await page.waitForFunction(min => Math.abs(window.scrollY - min) <= 1, {}, minScrollY)
    const releaseSamples = await page.evaluate(
      () => (window as unknown as { __releaseSamples: Promise<{ scrollY: number; top: number }[]> }).__releaseSamples,
    )
    const maxPerFrameTopDelta = releaseSamples.reduce((max, sample, index) => {
      if (index === 0) return max
      return Math.max(max, Math.abs(sample.top - releaseSamples[index - 1].top))
    }, 0)
    expect(maxPerFrameTopDelta).toBeLessThan(30)
    const firstSample = releaseSamples[0]
    const lastSample = releaseSamples[releaseSamples.length - 1]
    expect(Math.abs(lastSample.top - firstSample.top)).toBeGreaterThan(2)
    expect(Math.abs(lastSample.scrollY - minScrollY)).toBeLessThanOrEqual(1)

    const scrollTopClamped = await page.evaluate(() => window.scrollY)
    expect(scrollTopClamped).toBeGreaterThanOrEqual(minScrollY - 1)
    expect(scrollTopClamped).toBeLessThanOrEqual(minScrollY + 1)

    const topThoughtAfterClamp = await getThoughtTop('1')
    expect(topThoughtAfterClamp).toBeLessThanOrEqual(viewportTopBoundary + viewportAllowance + 2)

    await scrollTo(0, 100000)
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
