import { page } from '../setup'

/**
 * Disables all CSS animations and transitions to ensure consistent screenshots in tests.
 * This prevents timing-related inconsistencies caused by animations that may be in different
 * states when screenshots are captured.
 */
async function disableAnimations() {
  await page.evaluate(() => {
    const style = document.createElement('style')
    style.id = 'disable-animations-test'
    style.textContent = `
      * {
        animation-duration: 0ms !important;
        animation-delay: 0ms !important;
        transition-duration: 0ms !important;
        transition-delay: 0ms !important;
      }
    `
    document.head.appendChild(style)
  })
}

export default disableAnimations
