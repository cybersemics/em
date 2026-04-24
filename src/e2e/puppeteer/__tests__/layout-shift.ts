import { describe } from 'vitest'
import clickBullet from '../helpers/clickBullet'
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

const OVERALL_TIMEOUT = 8000
const SETTLE_MS = 500
// Subpixel rounding differences up to 1px are acceptable.
const Y_TOLERANCE = 1

type YShiftResult = {
  thoughtText: string
  /** First inline `top` React ever assigned to the target tree-node (provisional, commit A). */
  before: number | null
  /** Final inline `top` on the target tree-node after settling. */
  after: number | null
  /** Signed drift (`after - before`). */
  delta: number
}

/**
 * Captures the first and final inline `top` assigned to the tree-node whose editable text is `thoughtText`.
 *
 * A `MutationObserver` is used instead of rAF or `getBoundingClientRect` because React can commit a provisional `top` and a corrected `top` in the same synchronous tick. With CSS transitions disabled (as in Puppeteer), both commits land before the next paint, so anything that samples layout (rAF, rect) only ever sees the final value. `attributeOldValue` on a style mutation retains the provisional top even after React has overwritten it.
 *
 * Must be called BEFORE the action that renders the thought so the observer is live when the tree-node is inserted.
 */
const measureYShift = (
  thoughtText: string,
  { settleMs = SETTLE_MS }: { settleMs?: number } = {},
): Promise<YShiftResult> =>
  page.evaluate(
    (thoughtText: string, settleMs: number, overallTimeoutMs: number) =>
      new Promise<YShiftResult>((resolve, reject) => {
        let target: HTMLElement | null = null
        let before: number | null = null
        let after: number | null = null
        let sawStyleMutation = false
        let settleTimer: ReturnType<typeof setTimeout> | null = null
        let observer: MutationObserver | null = null

        /** Parse the `top` CSS property from a style string. */
        const parseTop = (styleStr: string | null): number | null => {
          const m = /top:\s*([-\d.]+)px/.exec(styleStr ?? '')
          return m ? parseFloat(m[1]) : null
        }

        /** Schedule to resolve and disconnect the observer after `settleMs` milliseconds. */
        const scheduleSettle = () => {
          if (settleTimer) clearTimeout(settleTimer)
          settleTimer = setTimeout(() => {
            observer?.disconnect()
            resolve({ thoughtText, before, after, delta: (after ?? 0) - (before ?? 0) })
          }, settleMs)
        }

        observer = new MutationObserver(mutations => {
          for (const m of mutations) {
            // Determine the target from the first insertion containing the thought, using its text node and parent positioner; the initial position is read from the DOM but may be corrected using the first mutation’s oldValue.
            if (!target && m.type === 'childList') {
              for (const n of Array.from(m.addedNodes)) {
                if (!(n instanceof Element)) continue
                const host = Array.from(n.querySelectorAll('[data-editable]'))
                  .find(el => (el.textContent ?? '').trim() === thoughtText)
                  ?.closest('[aria-label="tree-node"]') as HTMLElement | null
                if (host) {
                  target = host
                  before = after = parseTop(target.getAttribute('style'))
                  scheduleSettle()
                  break
                }
              }
            } else if (target && m.type === 'attributes' && m.target === target) {
              const oldTop = parseTop(m.oldValue)
              const newTop = parseTop(target.getAttribute('style'))
              if (oldTop === newTop) continue
              if (!sawStyleMutation) {
                before = oldTop
                sawStyleMutation = true
              }
              after = newTop
              scheduleSettle()
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
            if (settleTimer) clearTimeout(settleTimer)
            reject(new Error(`Timed out waiting for thought "${thoughtText}" within ${overallTimeoutMs}ms.`))
          }
        }, overallTimeoutMs)
      }),
    thoughtText,
    settleMs,
    OVERALL_TIMEOUT,
  )

/** Expect the y position of the thought to be stable within the tolerance. */
const expectStableY = ({ thoughtText, before, after, delta }: YShiftResult) => {
  if (Math.abs(delta) > Y_TOLERANCE) {
    throw new Error(
      `Thought "${thoughtText}" y shifted ${Math.abs(delta).toFixed(2)}px ${delta < 0 ? 'up' : 'down'} ` +
        `(before=${before}, after=${after}).`,
    )
  }
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

  it('non-last subthought should not shift y position when parent is expanded', async () => {
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
    await press('Escape')

    const measurePromise = measureYShift('E')
    await clickThought('X')
    expectStableY(await measurePromise)
  })
})
