import { WindowEm } from '../../../initialize'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import refresh from '../helpers/refresh'
import waitForEditable from '../helpers/waitForEditable'
import waitForThoughtExistInDb from '../helpers/waitForThoughtExistInDb'
import waitUntil from '../helpers/waitUntil'
import { page } from '../session'

const em = window.em as WindowEm
const MOCK_REPLICATION_DELAY = 100

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

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

    await refresh()

    // Wait for page to be ready after refresh
    await page.waitForFunction(() => document.readyState === 'complete')

    // Verify the initial scroll position is 0
    const initialScrollY = await page.evaluate(() => window.scrollY)
    expect(initialScrollY).toBe(0)

    // Set test delay for data replication after refresh
    // This simulates the regression case where thoughts are loaded slowly from the database
    await page.evaluate(value => {
      em.testFlags.replicationDelay = value
    }, MOCK_REPLICATION_DELAY)

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

    const yDiff = await page.evaluate(async () => {
      /** Calls a function every 10 ms until it returns truthy. Times out after 5 seconds. */
      function waitUntil<T>(fn: () => T): Promise<T> {
        const start = Date.now()
        return new Promise((resolve, reject) => {
          const interval = setInterval(() => {
            if (Date.now() - start > 5000) {
              reject('Timeout exceeded')
            }
            const result = fn()
            if (result) {
              clearInterval(interval)
              resolve(result)
            }
          }, 10)
        })
      }

      /** Waits until the cursor is the specified value. */
      async function waitUntilCursor(value: string): Promise<void> {
        await waitUntil(
          () => (document.querySelector('[data-editing=true]') as HTMLElement | undefined)?.innerText === value,
        )
      }

      /** Waits until an editable with the specified value appears and return it. */
      async function waitUntilEditable(value: string): Promise<HTMLElement> {
        return waitUntil(
          () =>
            Array.from(document.querySelectorAll('[data-editable]')).find(
              element => element.innerHTML === value,
            ) as HTMLElement,
        )
      }

      // scroll down so z is visible
      window.scrollBy({ top: 200 })

      // wait for virtualized thoughts to be rendered
      const thoughtZ = await waitUntilEditable('z')

      // TODO: How to click z instead of arrowing down?
      // thoughtZ.click()
      let cursorText: string | undefined
      while (cursorText !== 'z') {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'arrowdown' }))
        const cursorEl = document.querySelector('[data-editing=true]') as HTMLElement | undefined
        cursorText = cursorEl?.innerText

        // sleep 50ms to allow virtualized thoughts to be rendered
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // TODO: Why is the cursor on 1 instead of z?
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'arrowup' }))
      await waitUntilCursor('z')

      // get the y position of thought z relative to the viewport before moving thn cursor down to 1
      const cursorTopBefore = thoughtZ?.getBoundingClientRect().top

      // TODO: How to click 1 instead of arrowing down?
      // thought1.click()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'arrowdown' }))
      await waitUntilCursor('1')

      // get the y position of thought z relative to the viewport after moving the cursor down to 1
      const cursorTopAfter = thoughtZ?.getBoundingClientRect().top

      return cursorTopBefore && cursorTopAfter ? cursorTopAfter - cursorTopBefore : null
    })

    // TODO: We should expect 0 scroll. WHy does it scroll by 0.25px?
    expect(yDiff).toBeLessThan(1)
  })
})

describe('scrollMulticursorIntoView', () => {
  it('does not autoscroll when applying formatting to a Select All multiselection', async () => {
    // A short viewport guarantees the thoughts overflow so there is room to (incorrectly) scroll. See #3995 Issue H.
    await page.setViewport({ width: 800, height: 500 })

    const importText = `
      - 1
      - 2
      - 3
      - 4
      - 5
      - 6
      - 7
      - 8
      - 9
      - 10
      - 11
      - 12
      - 13
      - 14
      - 15
      - 16
      - 17
      - 18
      - 19
      - 20
    `
    await paste(importText)
    await clickThought('20')
    await waitForEditable('20')

    // Scroll to the bottom so the topmost selected thought is far above the viewport, maximizing any (incorrect) scroll.
    await page.evaluate(() => {
      const _em = window.em as WindowEm
      _em.testFlags.throttledScrollCursorIntoView?.cancel()
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })
    })
    await new Promise(resolve => setTimeout(resolve, 100))

    const scrollYBefore = await page.evaluate(() => Math.round(window.scrollY))
    // Sanity check: the page must actually be scrolled, otherwise there would be nothing to assert.
    expect(scrollYBefore).toBeGreaterThan(0)

    // Select All, then apply a formatting command. Neither should scroll the page. See #3995 Issue H.
    await command('selectAll')
    await command('bold')

    // Wait for any (incorrect) scroll animation to settle.
    await new Promise(resolve => setTimeout(resolve, 1000))

    const scrollYAfter = await page.evaluate(() => Math.round(window.scrollY))
    expect(scrollYAfter).toBe(scrollYBefore)
  })
})
