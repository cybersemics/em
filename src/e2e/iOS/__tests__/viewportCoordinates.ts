/**
 * Evidence for the page-to-screen conversion in safariChromeTop.ts.
 *
 * That conversion is a constant, which holds only while Safari is left to manage the scroll position itself. One test
 * here shows a touch aimed through the constant landing on its target; the other shows scrollTo(0, 0) with the keyboard
 * up moving the landing by visualViewport.offsetTop. Without the second, nothing in the repo demonstrates why an iOS
 * test must not scroll the page under its own touch.
 */
import newThought from '../helpers/newThought'
import recordNextTouch from '../helpers/recordNextTouch'
import SAFARI_CHROME_TOP from '../helpers/safariChromeTop'
import waitForEditable from '../helpers/waitForEditable'

/** Read the document scroll and the visual viewport offset together, so that both describe the same moment. */
const readViewport = async (): Promise<{ scrollY: number; offsetTop: number }> =>
  JSON.parse(
    await browser.execute(() =>
      JSON.stringify({
        scrollY: Math.round(window.scrollY),
        offsetTop: Math.round(window.visualViewport?.offsetTop ?? 0),
      }),
    ),
  )

/** Touch a point given in screen coordinates, the space performActions delivers touches in. */
const touchScreenPoint = async (x: number, y: number) => {
  await browser.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: Math.round(x), y: Math.round(y), origin: 'viewport' },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 60 },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])
}

describe('Viewport coordinates', () => {
  it('a touch aimed through the chrome offset lands where it was aimed', async () => {
    await newThought('Hello')
    const editable = await waitForEditable('Hello')

    const rect = await browser.getElementRect(editable.elementId)
    const targetY = Math.round(rect.y + rect.height / 2)

    const readTouch = await recordNextTouch()
    await touchScreenPoint(rect.x + rect.width / 2, targetY + SAFARI_CHROME_TOP)

    const landed = await readTouch()
    expect(landed).not.toBe(null)
    expect(Math.abs(landed!.y - targetY)).toBeLessThanOrEqual(2)
  })

  it('scrollTo(0, 0) with the keyboard up moves the landing by visualViewport.offsetTop', async () => {
    await newThought('Hello')
    const editable = await waitForEditable('Hello')

    // Safari scrolls the document when the keyboard opens; without that there is nothing to desynchronise.
    const before = await readViewport()
    expect(before.scrollY).toBeGreaterThan(0)
    expect(before.offsetTop).toBeGreaterThan(0)

    await browser.execute(() => window.scrollTo(0, 0))

    // the desynchronisation: the document is back at the top while the visual viewport is still pushed down
    const after = await readViewport()
    expect(after.scrollY).toBe(0)
    expect(after.offsetTop).toBeGreaterThan(0)

    const rect = await browser.getElementRect(editable.elementId)
    const targetY = Math.round(rect.y + rect.height / 2)

    const readTouch = await recordNextTouch()
    await touchScreenPoint(rect.x + rect.width / 2, targetY + SAFARI_CHROME_TOP)

    // the same aim now lands below its target, by exactly the offset the document scroll no longer accounts for
    const landed = await readTouch()
    expect(landed).not.toBe(null)
    expect(Math.abs(landed!.y - (targetY + after.offsetTop))).toBeLessThanOrEqual(2)
  })
})
