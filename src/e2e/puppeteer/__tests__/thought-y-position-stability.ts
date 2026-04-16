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
 * Measures the y position stability of the currently editing thought (data-editing=true) across multiple animation frames. Returns the maximum y deviation from the first sampled position.
 */
const measureEditingThoughtYStability = ({ numFrames = 10 }: { numFrames?: number } = {}): Promise<number> =>
  page.evaluate(
    (numFrames: number) =>
      new Promise<number>((resolve, reject) => {
        const editingEl = document.querySelector('[data-editing=true]')
        const treeNode = editingEl?.closest('[aria-label="tree-node"]')
        if (!treeNode) {
          reject(new Error('No currently editing thought found'))
          return
        }

        const firstTop = treeNode.getBoundingClientRect().top
        let maxDelta = 0
        let frameCount = 0

        /** Samples the y position on each animation frame. */
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
      }),
    numFrames,
  )

/**
 * Waits for a thought's editable to appear, then immediately begins measuring its y position stability across animation frames. Returns the maximum y deviation from the first sampled position. Useful for catching y-drift that occurs as a thought fades in or the layout recalculates after the first render.
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

        /** Polls for the tree-node by matching editable text content. */
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

      // Create a new thought after 'a'
      await press('Enter')

      // Wait a moment for the new thought to be rendered and layout to settle
      await sleep(100)

      // Measure y stability of the newly created thought (identified via data-editing=true)
      const maxDelta = await measureEditingThoughtYStability({ numFrames: 15 })
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

      // Create a new sibling after 'a' (which has child 'b')
      await press('Enter')

      await sleep(100)

      // Measure y stability of the newly created thought (identified via data-editing=true)
      const maxDelta = await measureEditingThoughtYStability({ numFrames: 15 })
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

      // Quickly re-expand by clicking b again (within the 1 second cache window)
      await clickThought('b')

      // Measure y stability of 'c' as it re-appears
      const maxDelta = await waitAndMeasureYStability('c', { numFrames: 15 })
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

      // Expand 'a' by clicking its bullet again
      await clickBullet('a')

      // Measure y stability of 'b' (non-last subthought) as it re-appears
      const maxDelta = await waitAndMeasureYStability('b', { numFrames: 15 })
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

      // Set cursor on X to expand its children
      await clickThought('X')

      // Measure y stability of 'E' (last subthought) as it re-appears
      const maxDelta = await waitAndMeasureYStability('E', { numFrames: 15 })
      expect(maxDelta).toBeLessThanOrEqual(Y_TOLERANCE)
    })
  })
})
