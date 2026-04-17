import { describe } from 'vitest'
import sleep from '../../../util/sleep'
import clickBullet from '../helpers/clickBullet'
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/**
 * Starts polling for a thought's editable to appear in the DOM, and immediately begins measuring its y position stability from the very first frame it exists. Returns a Promise of the maximum y deviation from the first sampled position.
 *
 * IMPORTANT: Call this function BEFORE the action that causes the thought to appear (e.g. expand, new thought) so that the rAF polling loop is already running in the browser when the element is first inserted. This ensures the first sample captures the thought's initial y position before any subsequent layout recalculations.
 */
const waitAndMeasureYStability = (value: string, { numFrames = 10 }: { numFrames?: number } = {}): Promise<number> =>
  page.evaluate(
    (value: string, numFrames: number) =>
      new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timed out waiting for thought "${value}"`)), 6000)

        /** Samples the y position across animation frames once the element is found. */
        const startSampling = (treeNode: Element) => {
          const firstTop = treeNode.getBoundingClientRect().top
          let maxDelta = 0
          let frameCount = 0

          /** Records the y position delta on each animation frame. */
          const sample = () => {
            const currentTop = treeNode.getBoundingClientRect().top
            const delta = Math.abs(currentTop - firstTop)
            if (delta > maxDelta) maxDelta = delta
            frameCount++
            if (frameCount < numFrames) {
              requestAnimationFrame(sample)
            } else {
              resolve(maxDelta)
            }
          }

          requestAnimationFrame(sample)
        }

        /** Polls every animation frame for the tree-node matching the given editable text content. */
        const poll = () => {
          const editable = Array.from(document.querySelectorAll('[data-editable]')).find(el => el.textContent === value)
          const treeNode = editable?.closest('[aria-label="tree-node"]')
          if (treeNode) {
            clearTimeout(timeout)
            startSampling(treeNode)
            return
          }
          requestAnimationFrame(poll)
        }

        poll()
      }),
    value,
    numFrames,
  )

// Tolerance in pixels for acceptable y position drift.
// Subpixel rounding differences up to 1px are acceptable.
const Y_TOLERANCE = 1

describe('thought y position stability', { retry: 3 }, () => {
  describe('#2783 - New thought at end should not shift up', () => {
    it('new thought should not shift y position after first render', async () => {
      await paste(`
        - a
      `)

      await waitForEditable('a')

      // Start polling for the new empty thought BEFORE pressing Enter so the rAF loop is already
      // running in the browser when the element is first inserted into the DOM.
      const measurePromise = waitAndMeasureYStability('', { numFrames: 15 })

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

      // Start polling for the new empty thought BEFORE pressing Enter so the rAF loop is already
      // running in the browser when the element is first inserted into the DOM.
      const measurePromise = waitAndMeasureYStability('', { numFrames: 15 })

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

      // Start polling for 'c' BEFORE re-expanding so the rAF loop is already running in the browser
      // when the element is first inserted into the DOM.
      const measurePromise = waitAndMeasureYStability('c', { numFrames: 15 })

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

      // Start polling for 'b' BEFORE expanding so the rAF loop is already running in the browser
      // when the element is first inserted into the DOM.
      const measurePromise = waitAndMeasureYStability('b', { numFrames: 15 })

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

      // Start polling for 'E' BEFORE expanding X so the rAF loop is already running in the browser
      // when the element is first inserted into the DOM.
      const measurePromise = waitAndMeasureYStability('E', { numFrames: 15 })

      // Set cursor on X to expand its children
      await clickThought('X')

      const maxDelta = await measurePromise
      expect(maxDelta).toBeLessThanOrEqual(Y_TOLERANCE)
    })
  })
})
