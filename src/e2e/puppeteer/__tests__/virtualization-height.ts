import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import scrollTo from '../helpers/scrollTo'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

const DOCUMENT_HEIGHT_SETTLE_TIMEOUT = 5000

/** Waits until the document height is unchanged across consecutive animation frames, then returns it. */
const waitForDocumentHeightToSettle = () =>
  page.evaluate(
    (timeout: number) =>
      new Promise<number>((resolve, reject) => {
        const start = performance.now()
        let heightPrevious = document.documentElement.scrollHeight
        let stableFrames = 0

        /** Checks the document height again on the next animation frame. */
        const checkHeight = () => {
          const height = document.documentElement.scrollHeight

          if (performance.now() - start > timeout) {
            reject(new Error(`Document height did not settle within ${timeout}ms (last height: ${height}px).`))
            return
          }

          stableFrames = height === heightPrevious ? stableFrames + 1 : 0
          heightPrevious = height

          if (stableFrames === 3) {
            resolve(height)
          } else {
            requestAnimationFrame(checkHeight)
          }
        }

        requestAnimationFrame(checkHeight)
      }),
    DOCUMENT_HEIGHT_SETTLE_TIMEOUT,
  )

it('restores the document height after a wrapped thought is virtualized again', async () => {
  const wrappedThought =
    'This wrapped thought is intentionally long enough to occupy many rendered lines. Its measured height must be removed after it leaves the virtualization window so that it cannot leave phantom scroll space behind. This sentence adds more width to make the difference from the single-line estimate large and unambiguous in a real browser.'
  const shortThoughts = Array.from({ length: 30 }, (_, index) => `      - thought ${index + 1}`).join('\n')

  await paste(`
    - parent
${shortThoughts}
      - ${wrappedThought}
    - last
  `)
  await clickThought('parent')
  await waitForEditable('thought 1')
  await scrollTo(0, 0)
  await page.waitForFunction(
    (value: string) =>
      !Array.from(document.querySelectorAll('[data-editable]')).some(element => element.textContent === value),
    {},
    wrappedThought,
  )

  const initialHeight = await waitForDocumentHeightToSettle()

  // Scroll with real wheel input so the wrapped thought enters the virtualization window and is measured by the browser.
  await page.mouse.wheel({ deltaY: initialHeight })
  await waitForEditable(wrappedThought)
  const measuredHeight = await waitForDocumentHeightToSettle()
  expect(measuredHeight).toBeGreaterThan(initialHeight)

  // Scroll back with real wheel input so the wrapped thought is virtualized and its measured height is discarded.
  await page.mouse.wheel({ deltaY: -measuredHeight })
  await page.waitForFunction(
    (value: string) =>
      window.scrollY === 0 &&
      !Array.from(document.querySelectorAll('[data-editable]')).some(element => element.textContent === value),
    {},
    wrappedThought,
  )

  const restoredHeight = await waitForDocumentHeightToSettle()
  expect(restoredHeight).toBe(initialHeight)
})
