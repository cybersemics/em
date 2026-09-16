import { page } from '../session'

/** Restores production animation timing for a test that observes motion. The isolated test page is closed after each test, so the override cannot reach another test. */
const reloadWithProductionTiming = async () => {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[aria-label=empty-thoughtspace]')
  await page.waitForFunction(() => !document.body.innerText.includes('Status: Initializing'))
}

export default reloadWithProductionTiming
