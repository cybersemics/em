import { ScreenshotOptions } from 'puppeteer'
import { page } from '../setup'
import waitForFrames from './waitForFrames'

/** Takes a screenshot with antialiasing disabled. */
const screenshot = async (options?: ScreenshotOptions) => {
  // Ensure antialiasing is disabled before taking screenshot
  await page.evaluate(() => {
    const style = document.createElement('style')
    style.id = 'screenshot-antialiasing-disable'
    style.textContent = `
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
    document.head.appendChild(style)
  })

  // Wait for the styles to be applied
  await page.waitForFunction(() => {
    const style = document.getElementById('screenshot-antialiasing-disable') as HTMLStyleElement
    return style && style.sheet && style.sheet.cssRules.length > 0
  })

  // Wait for multiple animation frames in CI to ensure complete rendering
  await waitForFrames(6)
  // Small delay to ensure any pending DOM updates are complete
  await new Promise(resolve => setTimeout(resolve, 100))

  const screenshotBuffer = Buffer.from(
    await page.screenshot({
      ...options,
      // Additional options to ensure crisp rendering
      type: 'png',
      omitBackground: false,
    }),
  )

  // Clean up the temporary style
  await page.evaluate(() => {
    const style = document.getElementById('screenshot-antialiasing-disable')
    if (style) {
      style.remove()
    }
  })

  return screenshotBuffer
}

export default screenshot
