import { MAX_FONT_SIZE, MIN_FONT_SIZE } from '../../../constants'
import tap from './tap.js'
import waitForElement from './waitForElement.js'

/** AppComponent mirrors state.fontSize onto the document element, which is the only copy of it readable from the DOM. */
const currentFontSize = (): Promise<number> =>
  browser.execute(() => parseFloat(document.documentElement.style.fontSize))

/**
 * Set the font size by tapping the footer's A+/A- controls, which step it by one.
 *
 * The alternative is to dispatch `fontSize` through `window.em`, which reaches past the UI into the store and so can
 * set a value the app itself would refuse.
 */
const setFontSize = async (fontSize: number): Promise<void> => {
  if (fontSize < MIN_FONT_SIZE || fontSize > MAX_FONT_SIZE) {
    throw new Error(
      `Font size ${fontSize} is outside the range the footer can reach (${MIN_FONT_SIZE}–${MAX_FONT_SIZE}).`,
    )
  }

  // The footer sits below the thoughts, so it is off-screen until scrolled to. Its position moves on every tap, as
  // changing the font size reflows everything above it.
  let current = await currentFontSize()
  while (current !== fontSize) {
    const before = current
    const selector = `[data-testid=${before > fontSize ? 'decrease-font' : 'increase-font'}]`
    const control = await waitForElement(selector)
    await browser.execute((selector: string) => {
      document.querySelector(selector)!.scrollIntoView({ behavior: 'instant', block: 'nearest' })
    }, selector)

    // y:60 compensates for the offset between web and screen coordinates; a touch pointer because fastClick binds
    // onTouchStart rather than onMouseDown when isTouch.
    await tap(control, { y: 60, pointerType: 'touch' })

    // A tap that lands on nothing would otherwise spin the loop forever.
    await browser.waitUntil(async () => (await currentFontSize()) !== before, {
      timeout: 5000,
      timeoutMsg: `Tapping ${selector} did not change the font size from ${before}.`,
    })
    current = await currentFontSize()
  }
}

export default setFontSize
