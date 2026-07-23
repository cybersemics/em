import { page } from '../session'

/** Reload with production startup timing so interactions during the loading phase can be tested. */
const reloadWithProductionTiming = async () => {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
}

export default reloadWithProductionTiming
