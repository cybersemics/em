import { describe, expect } from 'vitest'
import clickBullet from '../helpers/clickBullet'
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

const Y_TOLERANCE = 0.5
const OBSERVER_READY_TIMEOUT_MS = 8000

type YShiftResult = {
  /** The value of the thought whose y position is being measured. */
  thoughtValue: string
  /** First inline `top` React ever assigned to the target tree-node. */
  before: number | null
  /** Latest inline `top` on the target tree-node when the observer resolves. */
  after: number | null
}

/**
 * Captures the first and final inline `top` assigned to the tree-node whose editable text is `thoughtValue`.
 *
 * Must be called BEFORE the action that renders the thought so the observer is live when the tree-node is inserted.
 * Returns `{ measurePromise }` when ready; wait for it after doing the action.
 */
const measureYShift = async (thoughtValue: string): Promise<{ measurePromise: Promise<YShiftResult> }> => {
  const measurePromise = page.evaluate(
    (thoughtValue: string, overallTimeoutMs: number) =>
      new Promise<YShiftResult>((resolve, reject) => {
        /** The target tree-node whose y position is being measured. */
        let target: HTMLElement | null = null
        /** The first inline `top` React ever assigned to the target tree-node. */
        let before: number | null = null
        /** The latest inline `top` on the target tree-node when the observer resolves. */
        let after: number | null = null

        /** Parse the `top` CSS property from a style string. */
        const parseTop = (styleStr: string | null): number | null => {
          const m = /top:\s*([-\d.]+)px/.exec(styleStr ?? '')
          return m ? parseFloat(m[1]) : null
        }

        /** The mutation observer to observe the target tree-node. */
        const observer = new MutationObserver((mutations, observerInstance) => {
          for (const m of mutations) {
            // Determine the target from the first insertion containing the thought, using its text node and tree node; the initial position is read from the DOM but may be corrected using the first mutation’s oldValue.
            if (!target && m.type === 'childList') {
              for (const n of Array.from(m.addedNodes)) {
                if (!(n instanceof Element)) continue
                // querySelectorAll is descendants-only; `n` may be the editable or an ancestor wrapper (e.g. transition span).
                const editables: Element[] = [
                  ...(n.matches('[data-editable]') ? [n] : []),
                  ...Array.from(n.querySelectorAll('[data-editable]')),
                ]
                const treeNode = editables
                  .find(el => (el.textContent ?? '').trim() === thoughtValue)
                  ?.closest('[aria-label="tree-node"]') as HTMLElement | null
                if (treeNode) {
                  target = treeNode
                  before = after = parseTop(target.getAttribute('style'))
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
              observerInstance.disconnect()
              resolve({ thoughtValue, before, after })
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
          observer.disconnect()
          if (!target) {
            reject(new Error(`Timed out waiting for thought "${thoughtValue}" within ${overallTimeoutMs}ms.`))
          } else {
            resolve({ thoughtValue, before, after })
          }
        }, overallTimeoutMs)
      }),
    thoughtValue,
    OBSERVER_READY_TIMEOUT_MS,
  )

  // The measurement evaluate's Promise executor runs synchronously (including observe()),
  // but page.evaluate is async across CDP. Yield one in-page microtask so that setup
  // completes before the test dispatches the user action.
  await page.evaluate(() => new Promise<void>(resolve => queueMicrotask(resolve)))

  return { measurePromise }
}

/** Expect the y position of the thought to be stable within the tolerance. */
const expectStableY = ({ thoughtValue, before, after }: YShiftResult) => {
  expect(before, `Thought "${thoughtValue}" has no initial top`).not.toBeNull()
  expect(after, `Thought "${thoughtValue}" has no final top.`).not.toBeNull()
  const delta = after! - before!
  expect(
    Math.abs(delta),
    `Thought "${thoughtValue}" y shifted ${Math.abs(delta).toFixed(2)}px ${delta < 0 ? 'up' : 'down'} (before=${before}, after=${after}).`,
  ).toBeLessThanOrEqual(Y_TOLERANCE)
}

describe('thought y position stability', () => {
  it('new thought should not shift y position after first render', async () => {
    await paste(`
        - a
      `)
    await waitForEditable('a')

    const { measurePromise } = await measureYShift('')
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

    const { measurePromise } = await measureYShift('')
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

    const { measurePromise } = await measureYShift('c')
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

    const { measurePromise } = await measureYShift('b')
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

    const { measurePromise } = await measureYShift('E')
    await clickThought('X')
    expectStableY(await measurePromise)
  })
})
