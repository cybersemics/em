import { isMac } from '../browser'

/**
 * Returns true if the platform's command modifier was held during an event: Command on Mac, Ctrl on other platforms.
 * This is the same modifier that a command's keyboard definition declares as `meta`.
 */
const isCommandKey = (e: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey'>): boolean => (isMac ? e.metaKey : e.ctrlKey)

export default isCommandKey
