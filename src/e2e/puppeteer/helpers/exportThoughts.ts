import MimeType from '../../../@types/MimeType'
import { HOME_TOKEN } from '../../../constants'
import type { WindowEm } from '../../../initialize'
import removeHome from '../../../util/removeHome'
import { page } from '../setup'

/**
 * Export the current state of thoughts as plain text.
 * This allows puppeteer tests to verify thought structure without using snapshots.
 */
const exportThoughts = async (
  { mimeType = 'text/plain' }: { mimeType: MimeType } = { mimeType: 'text/plain' },
): Promise<string> => {
  const exported = await page.evaluate(
    (HOME_TOKEN, mimeType) => (window.em as WindowEm).exportContext([HOME_TOKEN], mimeType),
    HOME_TOKEN,
    mimeType,
  )
  return removeHome(exported)
}

export default exportThoughts
