import path from 'path'
import { WindowEm } from '../../../initialize'
import sleep from '../../../util/sleep'
import configureSnapshots from '../configureSnapshots'
import clickThought from '../helpers/clickThought'
import dragAndDropThought from '../helpers/dragAndDropThought'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import screenshot from '../helpers/screenshot'
import simulateDragAndDrop from '../helpers/simulateDragAndDrop'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

// TODO: Why do the uncle tests fail with the default threshold of 0.18?
// 'd' fails with slight rendering differences for some reason.
// Temporarily increase the failure threshold.
// Hardcoding the opacity transition to 0 in Subthought.tsx does not help, so durations are not the problem.
// puppeteer-screen-recorder does not reveal any active animations.
// Adding sleep(1000) before the snapshot does not help.
const UNCLE_DIFF_THRESHOLD = 0.4

// Override EXPAND_HOVER_DELAY
// TODO: Fails intermittently with "Drag destination element not found" when set to 10.
const MOCK_EXPAND_HOVER_DELAY = 100

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/**
 * Waits until the element with the given text content is not visible in the UI, i.e. unmounted, or hidden by display: none, visibility: hidden, or opacity: 0 on itself or any ancestor.
 *
 * Polling is required for hover-expansion collapse assertions. The collapse is dispatched only after the expandHoverDown debounce (MOCK_EXPAND_HOVER_DELAY) fires, and is only observable after the subsequent React render unmounts the subtree. A fixed sleep equal to the debounce delay races the timer callback and the render on a loaded CI runner.
 *
 * @param text The exact text content to search for.
 * @param selector The CSS selector to search within (defaults to '[data-editable]', which selects thoughts).
 * @throws If the element is still visible after the timeout.
 */
const waitForElementNotVisible = async (text: string, selector = '[data-editable]'): Promise<void> => {
  // match the waitForEditable timeout, which accounts for parallel test load
  const timeout = 6000
  await page
    .waitForFunction(
      (text, selector) => {
        const elements = Array.from(document.querySelectorAll(selector))
        const element = elements.find(el => el.innerHTML === text)

        // If element doesn't exist, it's not visible
        if (!element) return true

        // Check if the element or any of its ancestors has display: none, visibility: hidden, or opacity: 0
        let currentNode: Element | null = element
        while (currentNode) {
          const style = window.getComputedStyle(currentNode)
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return true
          }
          // Move up to parent node
          currentNode = currentNode.parentElement
        }

        return false
      },
      { timeout },
      text,
      selector,
    )
    .catch(() => {
      throw new Error(`Element "${text}" is still visible after ${timeout}ms. Expected it to be hidden or unmounted.`)
    })
}
/* From jest-image-snapshot README:
    
  Jest supports automatic retries on test failures. This can be useful for browser screenshot tests which tend to have more frequent false positives. Note that when using jest.retryTimes you'll have to use a unique customSnapshotIdentifier as that's the only way to reliably identify snapshots.

*/

describe('drag', () => {
  beforeEach(hideHUD)

  it('Alert', async () => {
    await paste(`
      - a
      - b
      - c
      - d
    `)

    await dragAndDropThought('a', null, { hold: true, position: 'none', showAlert: true })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('DragAndDropThought', async () => {
    await paste(`
      - a
      - b
      - c
      - d
    `)

    await dragAndDropThought('a', 'd', { hold: true, position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('DropChild', async () => {
    await paste(`
      - a
      - b
      - c
      - d
    `)

    await dragAndDropThought('a', 'b', { hold: true, position: 'child' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('DropEnd', async () => {
    await paste(`
      - x
      - a
        - b
        - c
    `)

    await clickThought('a')

    await dragAndDropThought('x', 'c', { hold: true, position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('DropUncle', async () => {
    await paste(`
      - a
        - b
          - c
            - x
          - d
        - e
    `)

    await clickThought('b')
    await clickThought('c')
    await dragAndDropThought('c', 'e', { hold: true, position: 'before', dropUncle: true })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot({
      customDiffConfig: {
        threshold: UNCLE_DIFF_THRESHOLD,
      },
    })
  })

  it('drop hover after table', async () => {
    await paste(`
      - x
      - a
        - =view
          - Table
        - =pin
          - true
        - b
          - c
        - d
          - e
    `)

    await clickThought('x')
    await dragAndDropThought('x', 'd', { hold: true, position: 'after', dropUncle: true })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('drop hover after column two thought', async () => {
    await paste(`
      - x
      - a
        - =view
          - Table
        - =pin
          - true
        - b
          - c
        - d
          - e
    `)

    await clickThought('x')
    await dragAndDropThought('x', 'c', { hold: true, position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('drop hover after table column one', async () => {
    await paste(`
      - x
      - a
        - =view
          - Table
        - =pin
          - true
        - b
          - c
        - d
          - e
    `)

    await clickThought('x')
    await dragAndDropThought('x', 'd', { hold: true, position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('drop hover after first thought of column one', async () => {
    await paste(`
      - x
      - a
        - =view
          - Table
        - =pin
          - true
        - b
          - c
        - d
          - e
    `)

    await simulateDragAndDrop({ drop: true })

    await clickThought('x')
    await dragAndDropThought('x', 'd', { hold: true, position: 'before' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('drop hover of first child of col2', async () => {
    await paste(`
    - x
    - a
      - =view
        - Table
      - =pin
      - b
        - c
          - =pin
          - d
    `)

    await clickThought('x')
    await dragAndDropThought('x', 'd', { hold: true, position: 'before' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('drop target last child in cliff', async () => {
    await paste(`
      - a
        - b
          - c
            - d
              - e
              - f
      - x
    `)

    await simulateDragAndDrop({ drop: true })

    await clickThought('a')
    await clickThought('b')
    await dragAndDropThought('e', 'f', { hold: true, position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('drop target last visible child', async () => {
    await paste(`
      - a
      - b
      - c
    `)

    await simulateDragAndDrop({ drop: true })

    await dragAndDropThought('b', 'c', { hold: true, position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('should show alert', async () => {
    await paste(`
      - a
      - b
    `)

    // First, drag thought 'a' after thought 'b' (resulting in b followed by a)
    await dragAndDropThought('a', 'b', {
      position: 'after',
      showAlert: true,
    })

    await dragAndDropThought('a', null, {
      hold: true,
      position: 'none',
      showAlert: true,
    })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('should allow dropping before first thought in table row', async () => {
    await paste(`
      - x
      - a
        - =view
          - Table
        - =pin
          - true
        - b
          - c
        - d
          - e
    `)

    await dragAndDropThought('x', 'e', { hold: true, position: 'before' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })
})

describe('drop', () => {
  beforeEach(hideHUD)

  // TODO: Fails intermittently due to hold: false
  // See previous attempts to fix: https://github.com/cybersemics/em/pull/2701
  it.skip('DragAndDropThought', async () => {
    await simulateDragAndDrop({ drag: true, drop: true })

    await paste(`
      - a
      - b
      - c
      - d
    `)

    await dragAndDropThought('a', 'd', { position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  describe('drop targets', () => {
    it('DragAndDropThought and DropChild', async () => {
      await simulateDragAndDrop({ drop: true })
      await paste(`
        - a
        - b
        - c
        - d
      `)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    it('DropEnd', async () => {
      await simulateDragAndDrop({ drop: true })
      await paste(`
        - a
          - b
            - c
      `)

      await dragAndDropThought('c', 'c', { hold: true, position: 'after' })

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    it('DropUncle', async () => {
      await simulateDragAndDrop({ drop: true })
      await paste(`
        - a
          - b
            - c
              - x
            - d
          - e
      `)

      await clickThought('b')
      await clickThought('c')

      const image = await screenshot()
      expect(image).toMatchImageSnapshot({
        customDiffConfig: {
          threshold: UNCLE_DIFF_THRESHOLD,
        },
      })
    })
  })
})

describe('hover expansion', () => {
  beforeEach(async () => {
    await hideHUD()

    // inject MOCK_EXPAND_HOVER_DELAY
    const em = window.em as WindowEm
    await page.evaluate(value => {
      em.testFlags.expandHoverDelay = value
    }, MOCK_EXPAND_HOVER_DELAY)
  })

  // Clean up after each test by releasing the mouse button
  afterEach(async () => {
    // Release mouse button if it's still down
    await page.mouse.up()

    // TODO: "collapses nested thoughts when dragging away" fails intermittently with 10ms
    await sleep(100)
  })

  it('expands a thought on hover down during drag', async () => {
    await paste(`
        - A
          - A1
          - A2
        - B
        - C
        `)

    // Start dragging thought C
    await dragAndDropThought('C', 'A', { hold: true, position: 'child' })

    // Wait for expansion to occur
    await sleep(MOCK_EXPAND_HOVER_DELAY)

    // Verify that A1 and A2 are visible (A has expanded)
    const a1Editable = await waitForEditable('A1')
    const a2Editable = await waitForEditable('A2')

    expect(a1Editable).toBeTruthy()
    expect(a2Editable).toBeTruthy()
  })

  it('collapses a thought when dragging away', async () => {
    await paste(`
          - A
            - A1
            - A2
          - B
          - C
          `)
    // First expand thought A by dragging over it
    await dragAndDropThought('C', 'A', { hold: true, position: 'child' })

    // Wait for the expansion to commit before starting the next drag.
    // Not only does this confirm the precondition (otherwise the collapse assertion passes vacuously if A never expanded),
    // but A1/A2 mounting shifts B down, so B's bounding box must be read after the layout shift.
    await waitForEditable('A1')

    // Now drag to thought B instead
    await dragAndDropThought('C', 'B', { hold: true, position: 'after', skipMouseDown: true })

    // Verify that A1 and A2 are no longer visible (A has collapsed)
    await waitForElementNotVisible('A1')
    await waitForElementNotVisible('A2')
  })

  it('collapses nested thoughts when dragging away', async () => {
    await paste(`
    - A
      - A1
        - A1-1
        - A1-2
      - A2
    - B
    - C
    `)

    // First expand thought A by dragging over it
    await dragAndDropThought('C', 'A', { hold: true, position: 'child' })

    // Wait for the expansion to commit before starting the next drag.
    // The next drag targets A1, which does not exist until A expands, and the mount shifts the layout.
    await waitForEditable('A1')

    // Now move to A1 using the dragAndDropThought function with skipMouseDown
    await dragAndDropThought('C', 'A1', { hold: true, position: 'child', skipMouseDown: true })

    // Verify that A1-1 and A1-2 are visible (A1 has expanded)
    // waitForEditable polls, so no fixed sleep for the expandHoverDown debounce is needed.
    const a11Editable = await waitForEditable('A1-1')
    const a12Editable = await waitForEditable('A1-2')

    expect(a11Editable).toBeTruthy()
    expect(a12Editable).toBeTruthy()

    // Now drag to A2
    await dragAndDropThought('C', 'A2', { hold: true, position: 'child', skipMouseDown: true })

    // Verify that A1-1 and A1-2 are no longer visible (A1 has collapsed)
    await waitForElementNotVisible('A1-1')
    await waitForElementNotVisible('A1-2')

    // Now drag completely away to B
    await dragAndDropThought('C', 'B', { hold: true, position: 'after', skipMouseDown: true })

    // Verify that all A's children (A1 and A2) are no longer visible (A has collapsed)
    await waitForElementNotVisible('A1')
    await waitForElementNotVisible('A2')
  })
})
