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

/** Gets the viewport rect of a thought. Throws if the thought is not rendered. */
const getThoughtRect = async (value: string): Promise<{ top: number; bottom: number }> => {
  const rect = await page.evaluate(value => {
    const thought = Array.from(document.querySelectorAll('[data-editable]')).find(
      element => element.innerHTML === value,
    )
    if (!thought) return null
    const { top, bottom } = thought.getBoundingClientRect()
    return { top, bottom }
  }, value)
  if (rect === null) throw new Error(`Thought "${value}" is not rendered.`)
  return rect
}

/** Gets the y position of a thought relative to the viewport. Throws if the thought is not rendered. */
const getThoughtTop = async (value: string): Promise<number> => (await getThoughtRect(value)).top

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })
usePersistentTreecrdtStorage()

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
  it('preserves thought positions relative to viewport when navigating deeper and back up', async () => {
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

    // navigate deeper to z's child, which hides more thoughts above the cursor
    await press('ArrowDown')
    await waitForCursor('1')
    await waitForBrowserSettled()

    // get the y position of thought z relative to the viewport after moving the cursor down to 1
    const topAfter = await getThoughtTop('z')

    expect(Math.abs(topAfter - topBefore)).toBeLessThan(1)

    const topBeforeUp = await getThoughtTop('z')
    await press('ArrowUp')
    await waitForCursor('z')
    await waitForBrowserSettled()
    const topAfterUp = await getThoughtTop('z')
    expect(Math.abs(topAfterUp - topBeforeUp)).toBeLessThan(1)
  })

  // https://github.com/cybersemics/em/issues/4735
  it('keeps the visible cluster onscreen when scrolling above hidden ancestor siblings', async () => {
    const siblings = Array.from({ length: 80 }, (_, index) => `- sibling ${index + 1}`).join('\n')
    await paste(`
${siblings}
  - child
    - grandchild
    `)

    await clickThought('grandchild')
    await waitForCursor('grandchild')
    await waitForBrowserSettled()

    await scrollTo(0, 0)
    await waitForBrowserSettled()

    const rect = await getThoughtRect('sibling 80')
    const { innerHeight, scrollY } = await page.evaluate(() => ({
      innerHeight: window.innerHeight,
      scrollY: window.scrollY,
    }))

    expect(scrollY).toBeGreaterThan(0)
    expect(rect.top).toBeLessThan(innerHeight)
    expect(rect.bottom).toBeGreaterThan(innerHeight * 0.99)
  })

  // https://github.com/cybersemics/em/issues/4735
  it('preserves document height when ancestor siblings become hidden', async () => {
    const siblings = Array.from({ length: 80 }, (_, index) => `- sibling ${index + 1}`).join('\n')
    await paste(`
${siblings}
  - child
    - grandchild
    `)

    await clickThought('sibling 80')
    await waitForCursor('sibling 80')
    await waitForBrowserSettled()
    const scrollHeightBefore = await page.evaluate(() => document.documentElement.scrollHeight)

    await clickThought('grandchild')
    await waitForCursor('grandchild')
    await waitForBrowserSettled()

    const { innerHeight, scrollHeightAfter } = await page.evaluate(() => ({
      innerHeight: window.innerHeight,
      scrollHeightAfter: document.documentElement.scrollHeight,
    }))

    expect(scrollHeightAfter).toBe(scrollHeightBefore)
    expect(scrollHeightAfter).toBeGreaterThan(innerHeight * 4)
  })

  // https://github.com/cybersemics/em/issues/4735
  it('keeps the last visible thought onscreen when scrolling below the visible cluster', async () => {
    const siblings = Array.from({ length: 80 }, (_, index) => `- sibling ${index + 1}`).join('\n')
    await paste(`
${siblings}
  - child
    - grandchild
    `)

    await clickThought('grandchild')
    await waitForCursor('grandchild')
    await waitForBrowserSettled()

    await scrollTo(0, 99999)
    await waitForBrowserSettled()

    const rect = await getThoughtRect('grandchild')
    const { innerHeight } = await page.evaluate(() => ({
      innerHeight: window.innerHeight,
    }))

    expect(rect.top).toBeLessThan(innerHeight)
    expect(rect.bottom).toBeGreaterThan(0)
  })

  // https://github.com/cybersemics/em/issues/4735
  it('still scrolls through a long list of visible root thoughts', async () => {
    await paste(Array.from({ length: 40 }, (_, index) => `- thought ${index + 1}`).join('\n'))

    await clickThought('thought 40')
    await waitForCursor('thought 40')
    await waitForBrowserSettled()

    const rect = await getThoughtRect('thought 40')
    const innerHeight = await page.evaluate(() => window.innerHeight)
    expect(rect.top).toBeLessThan(innerHeight)
    expect(rect.bottom).toBeGreaterThan(0)
  })
})

describe('scroll clamp elastic overscroll', () => {
  deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

  // https://github.com/cybersemics/em/issues/4735
  it('resists a touch beyond the upper clamp and springs back', async () => {
    const siblings = Array.from({ length: 80 }, (_, index) => `- sibling ${index + 1}`).join('\n')
    await paste(`
${siblings}
  - child
    - grandchild
    `)

    await clickThought('grandchild')
    await waitForCursor('grandchild')
    await waitForBrowserSettled()
    await scrollTo(0, 0)
    await waitForBrowserSettled()

    const topBefore = await getThoughtTop('grandchild')
    const viewport = page.viewport()
    if (!viewport) throw new Error('Expected an emulated mobile viewport.')

    const touch = await startGesture({
      xStart: viewport.width - 10,
      yStart: viewport.height / 2,
    })
    await touch.move('d')
    const topDuring = await getThoughtTop('grandchild')
    expect(topDuring).toBeGreaterThan(topBefore)

    await touch.end()
    await page.waitForFunction(
      ({ topBefore, value }) => {
        const thought = Array.from(document.querySelectorAll('[data-editable]')).find(
          element => element.innerHTML === value,
        )
        return thought ? Math.abs(thought.getBoundingClientRect().top - topBefore) < 1 : false
      },
      {},
      { topBefore, value: 'grandchild' },
    )
  })
})
