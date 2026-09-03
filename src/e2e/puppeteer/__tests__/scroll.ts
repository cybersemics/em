import type { PreloadedEmWindow } from '../../../@types'
import series from '../../../util/series'
import clickThought from '../helpers/clickThought'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import press from '../helpers/press'
import refresh from '../helpers/refresh'
import scrollTo from '../helpers/scrollTo'
import waitForBrowserSettled from '../helpers/waitForBrowserSettled'
import waitForCursor from '../helpers/waitForCursor'
import waitForEditable from '../helpers/waitForEditable'
import waitForThoughtExistInDb from '../helpers/waitForThoughtExistInDb'
import waitUntil from '../helpers/waitUntil'
import { page } from '../session'
import { usePersistentTreecrdtStorage } from '../setup'

const MOCK_REPLICATION_DELAY = 100

interface CursorViewportGeometry {
  /** Bottom edge of the cursor editable. */
  bottom: number
  /** Bottom edge of the visible viewport above the navbar. */
  bottomEdge: number
  /** Current document scroll position. */
  scrollY: number
  /** Top edge of the positioned cursor overlay. */
  positionTop: number
  /** Top edge of the cursor editable. */
  top: number
  /** Bottom edge of the toolbar. */
  topEdge: number
}

interface ThoughtViewportGeometry {
  /** Bottom edge of the thought editable. */
  bottom: number
  /** Height of the thought editable. */
  height: number
  /** Top edge of the thought editable. */
  top: number
  /** Top edge of the positioned tree node. */
  positionTop: number | null
}

/** Reads the cursor and fixed-chrome geometry that is visible to the user. */
const getCursorViewportGeometry = async (): Promise<CursorViewportGeometry> =>
  page.evaluate(() => {
    const cursor = document.querySelector('[data-editing=true] [data-editable]')?.getBoundingClientRect()
    if (!cursor) throw new Error('Cursor editable is not rendered.')

    const toolbar = document.querySelector('[data-testid="toolbar"]')?.getBoundingClientRect()
    const navbar = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect()
    const positionTop = document.querySelector('[aria-label="cursor-overlay-tree-node"]')?.getBoundingClientRect().top
    if (positionTop == null) throw new Error('Cursor positioner is not rendered.')

    return {
      bottom: cursor.bottom,
      bottomEdge: window.innerHeight - (navbar?.height ?? 0),
      positionTop,
      scrollY: window.scrollY,
      top: cursor.top,
      topEdge: toolbar?.bottom ?? 0,
    }
  })

/** Asserts that the cursor is fully visible between the toolbar and navbar. */
const expectCursorVisible = async (): Promise<CursorViewportGeometry> => {
  const geometry = await getCursorViewportGeometry()
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.topEdge)
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.bottomEdge)
  return geometry
}

/** Waits until no scroll event has fired for a short interval. */
const waitForScrollSettled = () =>
  page.evaluate(
    settleTime =>
      new Promise<void>(resolve => {
        let timeout: number
        const controller = new AbortController()

        /** Stops observing scroll events and resolves the wait. */
        function finish() {
          controller.abort()
          resolve()
        }

        /** Restarts the quiet-period timer after each scroll event. */
        function onScroll() {
          window.clearTimeout(timeout)
          timeout = window.setTimeout(finish, settleTime)
        }

        window.addEventListener('scroll', onScroll, { passive: true, signal: controller.signal })
        onScroll()
      }),
    150,
  )

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

/** Reads the rendered viewport geometry of a thought. Throws if the thought is not rendered. */
const getThoughtViewportGeometry = async (value: string): Promise<ThoughtViewportGeometry> => {
  const geometry = await page.evaluate(value => {
    const thought = Array.from(document.querySelectorAll('[data-editable]')).find(
      element => element.innerHTML === value,
    )
    if (!thought) return null
    const rect = thought.getBoundingClientRect()
    const treeRect = thought.closest('[aria-label="tree-node"]')?.getBoundingClientRect()
    return {
      bottom: rect.bottom,
      height: rect.height,
      positionTop: treeRect?.top ?? null,
      top: rect.top,
    }
  }, value)
  if (!geometry) throw new Error(`Thought "${value}" is not rendered.`)
  return geometry
}

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })
usePersistentTreecrdtStorage()

describe('scrollCursorIntoView', () => {
  it('does not scroll when keyboard navigation keeps the cursor inside the visible viewport', async () => {
    await paste(Array.from({ length: 12 }, (_, i) => `- Thought ${i + 1}`).join('\n'))
    await clickThought('Thought 5')
    await waitForBrowserSettled()
    const { scrollY: scrollYBefore } = await getCursorViewportGeometry()

    await press('ArrowDown')
    await waitForCursor('Thought 6')
    await waitForBrowserSettled()

    const { scrollY: scrollYAfter } = await expectCursorVisible()
    expect(scrollYAfter).toBe(scrollYBefore)
  })

  it('keeps the cursor visible while navigating repeatedly across both viewport edges', async () => {
    await paste(Array.from({ length: 24 }, (_, i) => `- Thought ${i + 1}`).join('\n'))
    await waitForEditable('Thought 24')
    await clickThought('Thought 1')
    await waitForBrowserSettled()
    await waitForScrollSettled()
    const { scrollY: initialScrollY } = await getCursorViewportGeometry()

    const downward = await series(
      Array.from({ length: 19 }, (_, i) => async () => {
        await press('ArrowDown')
        await waitForCursor(`Thought ${i + 2}`)
        await waitForBrowserSettled()
        await waitForScrollSettled()
        return expectCursorVisible()
      }),
    )

    const upward = await series(
      Array.from({ length: 19 }, (_, i) => async () => {
        await press('ArrowUp')
        await waitForCursor(`Thought ${19 - i}`)
        await waitForBrowserSettled()
        await waitForScrollSettled()
        return expectCursorVisible()
      }),
    )

    const peakScrollY = Math.max(...downward.map(geometry => geometry.scrollY))
    expect(peakScrollY).toBeGreaterThan(initialScrollY)
    expect(upward.at(-1)!.scrollY).toBeLessThan(peakScrollY)
  })

  it('preserves the exact bottom landing delta for a multiline thought', async () => {
    const multiline = Array.from({ length: 30 }, () => 'multiline').join(' ')
    const shortThoughts = Array.from({ length: 18 }, (_, i) => `- Thought ${i + 1}`)
    await paste([...shortThoughts, `- ${multiline}`, '- After multiline'].join('\n'))
    await waitForEditable('After multiline')
    await clickThought('Thought 1')

    await series(
      Array.from({ length: 17 }, (_, i) => async () => {
        await press('ArrowDown')
        await waitForCursor(`Thought ${i + 2}`)
        await waitForBrowserSettled()
        await waitForScrollSettled()
      }),
    )

    const before = await getCursorViewportGeometry()
    const multilineBefore = await getThoughtViewportGeometry(multiline)
    const afterMultilineBefore = await getThoughtViewportGeometry('After multiline')
    if (multilineBefore.positionTop == null || afterMultilineBefore.positionTop == null) {
      throw new Error('Multiline thought positioners are not rendered.')
    }
    const multilineLayoutHeight = afterMultilineBefore.positionTop - multilineBefore.positionTop
    const expectedScrollDelta = multilineBefore.positionTop + multilineLayoutHeight * 1.5 - before.bottomEdge
    expect(multilineBefore.height).toBeGreaterThan(before.bottom - before.top)
    expect(expectedScrollDelta).toBeGreaterThan(0)

    await press('ArrowDown')
    await waitForCursor(multiline)
    await waitForBrowserSettled()
    await waitForScrollSettled()

    const after = await expectCursorVisible()
    const actualScrollDelta = after.scrollY - before.scrollY
    expect(actualScrollDelta).toBeCloseTo(expectedScrollDelta, 0)
    expect(after.bottomEdge - (after.positionTop + multilineLayoutHeight)).toBeCloseTo(multilineLayoutHeight / 2, 0)
  })

  it('keeps each new thought visible while Enter is pressed repeatedly', async () => {
    await paste(Array.from({ length: 20 }, (_, i) => `- Thought ${i + 1}`).join('\n'))
    await clickThought('Thought 20')
    await press('End')

    const geometries = await series(
      Array.from({ length: 8 }, () => async () => {
        await press('Enter')
        await waitForBrowserSettled()
        await waitForScrollSettled()
        return expectCursorVisible()
      }),
    )

    expect(geometries.every((geometry, i) => i === 0 || geometry.scrollY > geometries[i - 1].scrollY)).toBe(true)
  })

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

    await waitForThoughtExistInDb('t')

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

describe('autocrop', () => {
  it('preserve thought positions relative to viewport when navigating deeper', async () => {
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

    // scroll down so that z is rendered and visible
    await scrollTo(0, 200)

    await clickThought('z')
    await waitForCursor('z')
    await waitForBrowserSettled()

    // get the y position of thought z relative to the viewport before moving the cursor down to 1
    const topBefore = await getThoughtTop('z')

    // navigate deeper to z's child, which crops the space above the cursor
    await press('ArrowDown')
    await waitForCursor('1')
    await waitForBrowserSettled()

    // get the y position of thought z relative to the viewport after moving the cursor down to 1
    const topAfter = await getThoughtTop('z')

    // TODO: We should expect 0 scroll. Why does it scroll by 0.25px?
    expect(Math.abs(topAfter - topBefore)).toBeLessThan(1)
  })
})
