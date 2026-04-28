import { describe, expect } from 'vitest'
import clickBullet from '../helpers/clickBullet'
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

const Y_TOLERANCE = 0.5

type YShiftResult = {
  /** The value of the thought whose y position is being measured. */
  thoughtValue: string
  /** First inline `top` React ever assigned to the target tree-node. */
  before: number | null
  /** Final inline `top` on the target tree-node after settling. */
  after: number | null
}

/**
 * Captures the first and final inline `top` assigned to the tree-node whose editable text is `thoughtValue`.
 *
 * Must be called BEFORE the action that renders the thought so the observer is live when the tree-node is inserted.
 */
const measureYShift = (thoughtValue: string, { settleMs = 500 }: { settleMs?: number } = {}): Promise<YShiftResult> =>
  page.evaluate(
    (thoughtValue: string, settleMs: number, overallTimeoutMs: number) =>
      new Promise<YShiftResult>((resolve, reject) => {
        /** The target tree-node whose y position is being measured. */
        let target: HTMLElement | null = null
        /** The first inline `top` React ever assigned to the target tree-node. */
        let before: number | null = null
        /** The final inline `top` on the target tree-node after settling. */
        let after: number | null = null
        /** The timer to resolve the promise after `settleMs` milliseconds. */
        let resolveDebounceTimer: ReturnType<typeof setTimeout> | null = null
        /** The mutation observer to observe the target tree-node. */
        let observer: MutationObserver | null = null

        /** Parse the `top` CSS property from a style string. */
        const parseTop = (styleStr: string | null): number | null => {
          const m = /top:\s*([-\d.]+)px/.exec(styleStr ?? '')
          return m ? parseFloat(m[1]) : null
        }

        /** Schedule to resolve and disconnect the observer after `settleMs` milliseconds. */
        const resolveDebounced = () => {
          if (resolveDebounceTimer) clearTimeout(resolveDebounceTimer)
          resolveDebounceTimer = setTimeout(() => {
            observer?.disconnect()
            resolve({ thoughtValue: thoughtValue, before, after })
          }, settleMs)
        }

        observer = new MutationObserver(mutations => {
          for (const m of mutations) {
            // Determine the target from the first insertion containing the thought, using its text node and tree node; the initial position is read from the DOM but may be corrected using the first mutation’s oldValue.
            if (!target && m.type === 'childList') {
              for (const n of Array.from(m.addedNodes)) {
                if (!(n instanceof Element)) continue
                const treeNode = Array.from(n.querySelectorAll('[data-editable]'))
                  .find(el => (el.textContent ?? '').trim() === thoughtValue)
                  ?.closest('[aria-label="tree-node"]') as HTMLElement | null
                if (treeNode) {
                  target = treeNode
                  before = after = parseTop(target.getAttribute('style'))
                  resolveDebounced()
                  break
                }
              }
            } else if (target && m.type === 'attributes' && m.target === target) {
              const oldTop = parseTop(m.oldValue)
              const newTop = parseTop(target.getAttribute('style'))
              if (oldTop === newTop) continue
              // On first style change, use oldValue as the true initial `top`; later changes skip this, and if values match again, the update has no effect.
              if (after === before) before = oldTop
              after = newTop
              resolveDebounced()
            }
          }
        })

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style'],
          attributeOldValue: true,
        })

        setTimeout(() => {
          if (!target) {
            observer?.disconnect()
            if (resolveDebounceTimer) clearTimeout(resolveDebounceTimer)
            reject(new Error(`Timed out waiting for thought "${thoughtValue}" within ${overallTimeoutMs}ms.`))
          }
        }, overallTimeoutMs)
      }),
    thoughtValue,
    settleMs,
    8000,
  )

/** Expect the y position of the thought to be stable within the tolerance. */
const expectStableY = ({ thoughtValue, before, after }: YShiftResult) => {
  const delta = (after ?? 0) - (before ?? 0)
  expect(
    Math.abs(delta),
    `Thought "${thoughtValue}" y shifted ${Math.abs(delta).toFixed(2)}px ${delta < 0 ? 'up' : 'down'} (before=${before}, after=${after}).`,
  ).toBeLessThanOrEqual(Y_TOLERANCE)
}

describe('thought y position stability', { retry: 3 }, () => {
  it('new thought should not shift y position after first render', async () => {
    await paste(`
        - a
      `)
    await waitForEditable('a')

    const measurePromise = measureYShift('')
    await press('Enter')
    expectStableY(await measurePromise)
  })

  it('new sibling thought after a thought with children should not shift y position', async () => {
    await paste(`
        - a
          - b
      `)
    await waitForEditable('a')
    await clickThought('a')

    const measurePromise = measureYShift('')
    await press('Enter')
    expectStableY(await measurePromise)
  })

  it('subthought should not shift y position when parent is quickly collapsed and expanded', async () => {
    await paste(`
        - a
        - b
          - c
      `)
    await waitForEditable('c')
    await clickThought('b')
    await press('Escape')

    const measurePromise = measureYShift('c')
    await clickThought('b')
    expectStableY(await measurePromise)
  })

  it.skip('non-last subthought should not shift y position when parent is expanded', async () => {
    await paste(`
        - a
          - b
          - c
      `)
    await waitForEditable('b')
    await clickThought('a')
    await clickBullet('a')

    const measurePromise = measureYShift('b')
    await clickBullet('a')
    expectStableY(await measurePromise)
  })

  it.skip('last subthought should not shift y position when parent is expanded', async () => {
    await paste(`
        - X
          - A
          - B
          - C
          - D
          - E
        - Y
      `)
    await press('Escape')

    const measurePromise = measureYShift('E')
    await clickThought('X')
    expectStableY(await measurePromise)
  })
})
