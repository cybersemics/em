import { describe } from 'vitest'
import sleep from '../../../util/sleep'
import clickBullet from '../helpers/clickBullet'
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

// Maximum time to wait for the target element to appear and stabilize (ms).
const OVERALL_TIMEOUT = 8000

// Tolerance in pixels for acceptable y position drift.
// Subpixel rounding differences up to 1px are acceptable.
const Y_TOLERANCE = 1

/**
 * Uses MutationObserver + ResizeObserver to track a thought's y position from the very first moment it appears in the DOM. Returns a Promise of the maximum y deviation from the first sampled position.
 *
 * Unlike rAF-based sampling, MutationObserver fires synchronously after each DOM mutation — before the browser paints — so it catches position changes that occur between animation frames. ResizeObserver supplements this by detecting size-driven layout shifts.
 *
 * IMPORTANT: Call this BEFORE the action that causes the thought to appear (e.g. expand, new thought) so the observer is already active when the element is first inserted.
 *
 * @param value - Text content of the thought's editable to match.
 * @param settleTime - Milliseconds of no position changes after which the measurement resolves.
 */
const waitAndMeasureYStability = (value: string, { settleTime = 400 }: { settleTime?: number } = {}): Promise<number> =>
  page.evaluate(
    (value: string, settleTime: number, overallTimeoutMs: number) =>
      new Promise<number>((resolve, reject) => {
        let firstTop: number | null = null
        let maxDelta = 0
        let targetTreeNode: Element | null = null
        let settleTimer: ReturnType<typeof setTimeout> | null = null
        let resizeObs: ResizeObserver | null = null
        let overallTimer: ReturnType<typeof setTimeout> | null = null

        /** Disconnects all observers and clears timers. Safe to reference mutationObs here because cleanup is only ever called from asynchronous callbacks (setTimeout/observers) that fire after all const declarations complete. */
        const cleanup = () => {
          if (overallTimer) clearTimeout(overallTimer)
          if (settleTimer) clearTimeout(settleTimer)
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          mutationObs.disconnect()
          if (resizeObs) resizeObs.disconnect()
        }

        /** Records the current y position and updates the max deviation from the first recorded position. Resets the settle timer on every call. */
        const recordPosition = () => {
          if (!targetTreeNode) return
          const top = targetTreeNode.getBoundingClientRect().top
          if (firstTop === null) {
            firstTop = top
          } else {
            const delta = Math.abs(top - firstTop)
            if (delta > maxDelta) maxDelta = delta
          }
          // Reset settle timer — resolve once no further changes occur for settleTime ms
          if (settleTimer) clearTimeout(settleTimer)
          settleTimer = setTimeout(() => {
            cleanup()
            resolve(maxDelta)
          }, settleTime)
        }

        /** Finds the target tree-node by matching editable text content and starts observing it for size changes. */
        const tryFindElement = () => {
          const editable = Array.from(document.querySelectorAll('[data-editable]')).find(el => el.textContent === value)
          const treeNode = editable?.closest('[aria-label="tree-node"]') ?? null
          if (treeNode && treeNode !== targetTreeNode) {
            targetTreeNode = treeNode
            resizeObs = new ResizeObserver(() => recordPosition())
            resizeObs.observe(treeNode)
            recordPosition()
          }
        }

        // Create the MutationObserver to detect element insertion and track subsequent DOM changes.
        const mutationObs = new MutationObserver(() => {
          if (!targetTreeNode) {
            tryFindElement()
          } else {
            recordPosition()
          }
        })

        overallTimer = setTimeout(() => {
          cleanup()
          reject(new Error(`Timed out waiting for thought "${value}"`))
        }, overallTimeoutMs)

        // Observe the document body for all DOM mutations (childList for new elements,
        // attributes for style/class changes that affect position).
        mutationObs.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class'],
        })

        // Check immediately in case the element already exists
        tryFindElement()
      }),
    value,
    settleTime,
    OVERALL_TIMEOUT,
  )

describe('thought y position stability', { retry: 3 }, () => {
  describe('#2783 - New thought at end should not shift up', () => {
    it('new thought should not shift y position after first render', async () => {
      await paste(`
        - a
      `)

      await waitForEditable('a')

      // Start MutationObserver BEFORE pressing Enter so it catches the thought from the very
      // first DOM insertion and tracks all subsequent style/layout mutations.
      const measurePromise = waitAndMeasureYStability('')

      // Create a new thought after 'a'
      await press('Enter')

      const maxDelta = await measurePromise
      expect(maxDelta).toBeLessThanOrEqual(Y_TOLERANCE)
    })
  })

  describe('#3097 - New thought after parent with children should not shift down', () => {
    it('new sibling thought after a thought with children should not shift y position', async () => {
      await paste(`
        - a
          - b
      `)

      await waitForEditable('a')
      await clickThought('a')

      // Start MutationObserver BEFORE pressing Enter so it catches the thought from the very
      // first DOM insertion and tracks all subsequent style/layout mutations.
      const measurePromise = waitAndMeasureYStability('')

      // Create a new sibling after 'a' (which has child 'b')
      await press('Enter')

      const maxDelta = await measurePromise
      expect(maxDelta).toBeLessThanOrEqual(Y_TOLERANCE)
    })
  })

  describe('#3310 - Subthought should not shift when quickly re-expanding after collapse', () => {
    it('subthought should not shift y position when parent is quickly collapsed and expanded', async () => {
      await paste(`
        - a
        - b
          - c
      `)

      await waitForEditable('c')
      await clickThought('b')

      // Collapse b by pressing Escape (sets cursor to null which collapses subthoughts)
      await press('Escape')
      await sleep(200)

      // Start MutationObserver BEFORE re-expanding so it catches the thought from the very
      // first DOM insertion and tracks all subsequent style/layout mutations.
      const measurePromise = waitAndMeasureYStability('c')

      // Quickly re-expand by clicking b again (within the 1 second cache window)
      await clickThought('b')

      const maxDelta = await measurePromise
      expect(maxDelta).toBeLessThanOrEqual(Y_TOLERANCE)
    })
  })

  describe('#3647 - Non-last subthought should not shift up when expanding', () => {
    it('non-last subthought should not shift y position when parent is expanded', async () => {
      await paste(`
        - a
          - b
          - c
      `)

      await waitForEditable('b')
      await clickThought('a')

      // Collapse 'a' by clicking its bullet
      await clickBullet('a')
      await sleep(400)

      // Start MutationObserver BEFORE expanding so it catches the thought from the very
      // first DOM insertion and tracks all subsequent style/layout mutations.
      const measurePromise = waitAndMeasureYStability('b')

      // Expand 'a' by clicking its bullet again
      await clickBullet('a')

      const maxDelta = await measurePromise
      expect(maxDelta).toBeLessThanOrEqual(Y_TOLERANCE)
    })
  })

  describe('#3671 - Last subthought should not shift down on initial render', () => {
    it('last subthought should not shift y position when parent is expanded', async () => {
      await paste(`
        - X
          - A
          - B
          - C
          - D
          - E
        - Y
      `)

      await waitForEditable('E')

      // Set cursor to null
      await press('Escape')
      await sleep(400)

      // Start MutationObserver BEFORE expanding X so it catches the thought from the very
      // first DOM insertion and tracks all subsequent style/layout mutations.
      const measurePromise = waitAndMeasureYStability('E')

      // Set cursor on X to expand its children
      await clickThought('X')

      const maxDelta = await measurePromise
      expect(maxDelta).toBeLessThanOrEqual(Y_TOLERANCE)
    })
  })
})
