import type { PreloadedEmWindow } from '../../../@types'
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
