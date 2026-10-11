import type MimeType from '../../../@types/MimeType'
import { HOME_TOKEN } from '../../../constants.js'
import removeHome from '../../../util/removeHome.js'

/**
 * Export the current state of thoughts as plain text.
 * This allows tests to verify thought structure without using snapshots.
 */
const exportThoughts = async (
  { mimeType = 'text/plain' }: { mimeType: MimeType } = { mimeType: 'text/plain' },
): Promise<string> => {
  const exported = await browser.execute(
    (_homeToken: string, _mimeType: MimeType) => window.em.exportContext([_homeToken], _mimeType),
    HOME_TOKEN,
    mimeType,
  )
  return removeHome(exported)
}

export default exportThoughts
