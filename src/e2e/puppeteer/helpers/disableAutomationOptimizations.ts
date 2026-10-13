import { page } from '../session'

/**
 * Disable navigator.webdriver-based shortcuts before testing production animation behavior.
 * The test must not depend on automation-only clipboard, scrolling, or editing behavior.
 * Each test has its own page, so the navigator override is reset by page isolation.
 */
const disableAutomationOptimizations = async (): Promise<void> => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true })
  })
}

export default disableAutomationOptimizations
