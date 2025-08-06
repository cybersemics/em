import { ScreenshotOptions } from 'puppeteer'
import { page } from '../setup'

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
      }
    `
    document.head.appendChild(style)
  })

  // Wait for the styles to be applied
  await page.waitForFunction(() => {
    const style = document.getElementById('screenshot-antialiasing-disable') as HTMLStyleElement
    return style && style.sheet && style.sheet.cssRules.length > 0
  })

  // Additional waiting for CI environments to ensure stable rendering
  if (process.env.CI === 'true') {
    // Wait for multiple animation frames in CI to ensure complete rendering
    await page.evaluate(() => {
      return new Promise(resolve => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        )
      })
    })

    // Small delay to ensure any pending DOM updates are complete
    await new Promise(resolve => setTimeout(resolve, 100))
  }

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
