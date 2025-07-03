import { WindowEm } from '../../../initialize'
import { page } from '../setup'

const em = window.em as WindowEm

/**
 * Export the current state of thoughts as plain text.
 * This allows puppeteer tests to verify thought structure without using snapshots.
 */
const exportThoughts = async (): Promise<string> => {
  return await page.evaluate(() => {
    const exported = em.exportContext(['__ROOT__'], 'text/plain')
    return exported
  })
}

export default exportThoughts
