import { ScreenshotOptions } from 'puppeteer'
import { page } from '../session'

// Constants for the style element
const ANTIALIASING_DISABLER_ID = 'screenshot-antialiasing-disable'

/** Generates screenshot styles, optionally retaining filters for tests that cover blur and shadows. */
const getAntialiasingCSS = (preserveFilters: boolean) => `
   *, *::before, *::after {
        -webkit-font-smoothing: none !important;
        -moz-osx-font-smoothing: unset !important;
        font-smooth: never !important;
        text-rendering: geometricPrecision !important;
        image-rendering: pixelated !important;
        image-rendering: -moz-crisp-edges !important;
        image-rendering: crisp-edges !important;
        backface-visibility: hidden !important;
        -webkit-backface-visibility: hidden !important;


        
        /* Disable blur effects unless the test explicitly covers them. */
        ${preserveFilters ? '' : 'filter: none !important; -webkit-filter: none !important;'}
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

/** Takes a screenshot with antialiasing disabled. Filters are disabled unless explicitly preserved. */
const screenshot = async ({
  preserveFilters = false,
  ...options
}: ScreenshotOptions & {
  /** Retain production filters when blur and shadows are part of the visual contract. */
  preserveFilters?: boolean
} = {}): Promise<Buffer> => {
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
      css: getAntialiasingCSS(preserveFilters),
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
