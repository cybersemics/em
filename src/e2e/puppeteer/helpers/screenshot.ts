import { ScreenshotOptions } from 'puppeteer'
import { page } from '../setup'

/** Takes a screenshot. */
const screenshot = async (options?: ScreenshotOptions) => Buffer.from(await page.screenshot(options))

export default screenshot
