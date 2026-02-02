import { HOME_TOKEN } from '../../../constants'
import { WindowEm } from '../../../initialize'
import removeHome from '../../../util/removeHome'
import { page } from '../setup'

const em = window.em as WindowEm

/**
 * Export the current state of thoughts as plain text.
 * This allows puppeteer tests to verify thought structure without using snapshots.
 */
const exportThoughts = async (): Promise<string> => {
  const exported = await page.evaluate(HOME_TOKEN => em.exportContext([HOME_TOKEN], 'text/plain'), HOME_TOKEN)
  return removeHome(exported)
}

export default exportThoughts
