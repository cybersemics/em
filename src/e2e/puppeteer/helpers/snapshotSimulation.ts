import { Page } from 'puppeteer'
import { WindowEm } from '../../../initialize'

const em = window.em as WindowEm

/** Sets testFlags for simulating drag and drop process . */
const simaulateSnapshot = async (page: Page): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 100))

  await page.evaluate(() => {
    em.testFlags.simulateDrag = true
    em.testFlags.simulateDrop = true
  })
}

export default simaulateSnapshot
