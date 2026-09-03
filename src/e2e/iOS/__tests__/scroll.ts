/**
 * Tests iOS Safari autoscroll.
 * Uses WDIO with Appium so the software keyboard and WebKit scrolling behavior are real.
 */
import series from '../../../util/series.js'
import clickThought from '../helpers/clickThought.js'
import isKeyboardShown from '../helpers/isKeyboardShown.js'
import paste from '../helpers/paste.js'
import tap from '../helpers/tap.js'
import tapReturnKey from '../helpers/tapReturnKey.js'
import waitForEditable from '../helpers/waitForEditable.js'

interface CursorViewportGeometry {
  /** Bottom edge of the cursor editable. */
  bottom: number
  /** Bottom edge of the visible viewport above fixed navigation. */
  bottomEdge: number
  /** Top edge of the cursor editable. */
  top: number
  /** Bottom edge of the toolbar. */
  topEdge: number
}

/** Reads the cursor and visible viewport geometry from Mobile Safari. */
const getCursorViewportGeometry = async (): Promise<CursorViewportGeometry> => {
  const value = await browser.execute(() => {
    const cursor = document.querySelector('[data-editing=true] [data-editable]')?.getBoundingClientRect()
    if (!cursor) throw new Error('Cursor editable is not rendered.')

    const toolbar = document.querySelector('[data-testid="toolbar"]')?.getBoundingClientRect()
    const navbar = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect()
    const viewportTop = window.visualViewport?.offsetTop ?? 0
    const viewportBottom = viewportTop + (window.visualViewport?.height ?? window.innerHeight)

    return JSON.stringify({
      bottom: cursor.bottom,
      bottomEdge: Math.min(viewportBottom, navbar?.top ?? viewportBottom),
      top: cursor.top,
      topEdge: toolbar?.bottom ?? 0,
    })
  })

  return JSON.parse(value) as CursorViewportGeometry
}

/** Waits until Mobile Safari's viewport and scroll animations are both quiet. */
const waitForViewportSettled = () =>
  browser.execute(
    settleTime =>
      new Promise<void>(resolve => {
        let timeout: number
        const controller = new AbortController()

        /** Stops observing viewport events and resolves the wait. */
        function finish() {
          controller.abort()
          resolve()
        }

        /** Restarts the quiet-period timer after each viewport event. */
        function onScroll() {
          window.clearTimeout(timeout)
          timeout = window.setTimeout(finish, settleTime)
        }

        window.addEventListener('scroll', onScroll, { passive: true, signal: controller.signal })
        window.visualViewport?.addEventListener('resize', onScroll, { passive: true, signal: controller.signal })
        onScroll()
      }),
    500,
  )

/** Asserts that the cursor is fully visible between the toolbar and software keyboard. */
const expectCursorVisible = async (): Promise<CursorViewportGeometry> => {
  const geometry = await getCursorViewportGeometry()
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.topEdge)
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.bottomEdge)
  return geometry
}

/** Asserts that the cursor is not covered by the software keyboard. */
const expectCursorAboveKeyboard = async (): Promise<CursorViewportGeometry> => {
  const geometry = await getCursorViewportGeometry()
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.bottomEdge)
  return geometry
}

/** Selects a thought, opens the software keyboard, and waits for scrolling to settle. */
const openKeyboardAt = async (value: string) => {
  await waitForEditable(value)
  await clickThought(value)
  await browser.waitUntil(
    async () =>
      browser.execute(
        value => document.querySelector('[data-editing=true] [data-editable]')?.innerHTML === value,
        value,
      ),
    { timeoutMsg: `cursor did not move to ${value}` },
  )
  await waitForViewportSettled()
  if (!(await isKeyboardShown())) await tap(await waitForEditable(value), { pointerType: 'touch', y: 60 })
  await browser.waitUntil(isKeyboardShown, { timeoutMsg: 'software keyboard did not open' })
  await waitForViewportSettled()
}

describe('Autoscroll', () => {
  // https://github.com/cybersemics/em/issues/3765
  it('keeps a tapped thought above the software keyboard when it opens', async () => {
    await paste(Array.from({ length: 20 }, (_, i) => `- Thought ${i + 1}`).join('\n'))
    const editable = await waitForEditable('Thought 20')
    await browser.execute((editable: HTMLElement) => editable.scrollIntoView({ block: 'center' }), editable)
    await waitForViewportSettled()
    await openKeyboardAt('Thought 20')

    await expectCursorAboveKeyboard()
  })

  it('keeps each new thought visible while Return is pressed repeatedly above the software keyboard', async () => {
    await paste(Array.from({ length: 8 }, (_, i) => `- Thought ${i + 1}`).join('\n'))
    await waitForEditable('Thought 8')
    await openKeyboardAt('Thought 4')
    await expectCursorAboveKeyboard()
    const initialThoughtCount = await browser.execute(() => document.querySelectorAll('[data-editable]').length)

    await series(
      Array.from({ length: 12 }, (_, index) => async () => {
        await tapReturnKey()
        await waitForViewportSettled()
        expect(await browser.execute(() => document.querySelectorAll('[data-editable]').length)).toBe(
          initialThoughtCount + index + 1,
        )
        await expectCursorVisible()
      }),
    )
  })
})
