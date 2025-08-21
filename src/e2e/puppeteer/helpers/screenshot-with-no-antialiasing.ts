import { ScreenshotOptions } from 'puppeteer'
import { page } from '../setup'

// Constants for the style element
const ANTIALIASING_DISABLER_ID = 'screenshot-antialiasing-disable'
const ANTIALIASING_DISABLER_CSS = `
   *, *::before, *::after {
        -webkit-font-smoothing: none !important;
        -moz-osx-font-smoothing: unset !important;
        font-smooth: never !important;
        text-rendering: optimizeSpeed !important;
        image-rendering: pixelated !important;
        image-rendering: -moz-crisp-edges !important;
        image-rendering: crisp-edges !important;
        backface-visibility: hidden !important;
        perspective: 1000px !important;

        /* Force hardware acceleration and disable subpixel rendering */
        -webkit-backface-visibility: hidden !important;
        -webkit-perspective: 1000px !important;
        
        /* Disable any potential blur effects */
        filter: none !important;
        -webkit-filter: none !important;
        /* Ensure consistent text rendering */
        font-feature-settings: "liga" 0, "kern" 0 !important;
        font-variant-ligatures: none !important;
        
        /* Disable any potential animations or transitions */
        animation: none !important;
        transition: none !important;
        -webkit-animation: none !important;
        -webkit-transition: none !important;
      }
`

/** Takes a screenshot with antialiasing disabled.*/
const screenshot = async (options: ScreenshotOptions = {}): Promise<Buffer> => {
  // Ensure antialiasing is disabled
  await page.evaluate(
    ({ id, css }) => {
      // Remove existing style if present
      const existing = document.getElementById(id)
      if (existing) existing.remove()

      const style = document.createElement('style')
      style.id = id
      style.textContent = css
      document.head.appendChild(style)
    },
    {
      id: ANTIALIASING_DISABLER_ID,
      css: ANTIALIASING_DISABLER_CSS,
    },
  )

  // Wait for styles to be applied
  await page.waitForFunction(
    id => {
      const style = document.getElementById(id) as HTMLStyleElement
      return style && style.sheet && style.sheet.cssRules.length > 0
    },
    {},
    ANTIALIASING_DISABLER_ID,
  )

  const screenshotBuffer = await Buffer.from(await page.screenshot(options))

  // Clean up
  await page.evaluate(id => {
    const style = document.getElementById(id)
    style?.remove()
  }, ANTIALIASING_DISABLER_ID)

  return screenshotBuffer
}

export default screenshot
